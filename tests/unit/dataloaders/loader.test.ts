/**
 * DataLoader tests
 */

import { describe, it, expect } from 'vitest';
import { createDataLoader } from '../../../src/dataloaders/loader.js';

describe('createDataLoader', () => {
  describe('load', () => {
    it('should batch multiple loads in a single tick', async () => {
      let batchCallCount = 0;
      const loader = createDataLoader<number, string>(async (keys) => {
        batchCallCount++;
        return keys.map((k) => `value-${k}`);
      });

      // Load multiple keys in same tick
      const promises = [loader.load(1), loader.load(2), loader.load(3)];

      const results = await Promise.all(promises);

      expect(results).toEqual(['value-1', 'value-2', 'value-3']);
      expect(batchCallCount).toBe(1); // Only called once despite 3 loads
    });

    it('should return cached values on subsequent loads', async () => {
      let batchCallCount = 0;
      const loader = createDataLoader<string, number>(async (keys) => {
        batchCallCount++;
        return keys.map((k) => k.length);
      });

      const result1 = await loader.load('test');
      const result2 = await loader.load('test');
      const result3 = await loader.load('test');

      expect(result1).toBe(4);
      expect(result2).toBe(4);
      expect(result3).toBe(4);
      expect(batchCallCount).toBe(1); // Cached after first load
    });

    it('should handle Error results in batch response', async () => {
      const loader = createDataLoader<number, string>(async (keys) => {
        return keys.map((k) => (k === 2 ? new Error('Not found') : `value-${k}`));
      });

      const results = await Promise.allSettled([
        loader.load(1),
        loader.load(2),
        loader.load(3),
      ]);

      expect(results[0]).toEqual({ status: 'fulfilled', value: 'value-1' });
      expect(results[1]?.status).toBe('rejected');
      if (results[1]?.status === 'rejected') {
        expect(results[1].reason.message).toBe('Not found');
      }
      expect(results[2]).toEqual({ status: 'fulfilled', value: 'value-3' });
    });

    it('should reject all batched items if batchFn throws', async () => {
      const loader = createDataLoader<number, string>(async () => {
        throw new Error('Batch function failed');
      });

      const results = await Promise.allSettled([
        loader.load(1),
        loader.load(2),
        loader.load(3),
      ]);

      expect(results.every((r) => r.status === 'rejected')).toBe(true);
      results.forEach((result) => {
        if (result.status === 'rejected') {
          expect(result.reason.message).toBe('Batch function failed');
        }
      });
    });

    it('should handle non-Error throw in batchFn', async () => {
      const loader = createDataLoader<number, string>(async () => {
         
        throw 'String error'; // Non-Error throw
      });

      const results = await Promise.allSettled([loader.load(1)]);

      expect(results[0]?.status).toBe('rejected');
      if (results[0]?.status === 'rejected') {
        expect(results[0].reason.message).toBe('String error');
      }
    });

    it('should handle complex object keys', async () => {
      const loader = createDataLoader<{ id: string; type: string }, string>(async (keys) => {
        return keys.map((k) => `${k.type}-${k.id}`);
      });

      const result1 = await loader.load({ id: '123', type: 'user' });
      const result2 = await loader.load({ id: '123', type: 'user' }); // Same key, should be cached
      const result3 = await loader.load({ id: '456', type: 'post' }); // Different key

      expect(result1).toBe('user-123');
      expect(result2).toBe('user-123');
      expect(result3).toBe('post-456');
    });
  });

  describe('loadMany', () => {
    it('should load multiple keys and return results', async () => {
      const loader = createDataLoader<number, string>(async (keys) => {
        return keys.map((k) => `value-${k}`);
      });

      const results = await loader.loadMany([1, 2, 3, 4]);

      expect(results).toEqual(['value-1', 'value-2', 'value-3', 'value-4']);
    });

    it('should return errors as values in loadMany', async () => {
      const loader = createDataLoader<number, string>(async (keys) => {
        return keys.map((k) => (k === 2 ? new Error('Not found') : `value-${k}`));
      });

      const results = await loader.loadMany([1, 2, 3]);

      expect(results[0]).toBe('value-1');
      expect(results[1]).toBeInstanceOf(Error);
      if (results[1] instanceof Error) {
        expect(results[1].message).toBe('Not found');
      }
      expect(results[2]).toBe('value-3');
    });

    it('should handle non-Error catch in loadMany', async () => {
      // This will trigger the catch block in loadMany with non-Error throw
      const errorLoader = createDataLoader<number, string>(async () => {
        throw 123; // Non-Error throw
      });

      const results = await errorLoader.loadMany([1, 2]);

      results.forEach((result) => {
        expect(result).toBeInstanceOf(Error);
        if (result instanceof Error) {
          expect(result.message).toBe('123');
        }
      });
    });

    it('should work with empty array', async () => {
      const loader = createDataLoader<number, string>(async (keys) => {
        return keys.map((k) => `value-${k}`);
      });

      const results = await loader.loadMany([]);

      expect(results).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear cached value for a key', async () => {
      let batchCallCount = 0;
      const loader = createDataLoader<string, number>(async (keys) => {
        batchCallCount++;
        return keys.map((k) => k.length);
      });

      const result1 = await loader.load('test');
      expect(batchCallCount).toBe(1);

      loader.clear('test');

      const result2 = await loader.load('test');
      expect(batchCallCount).toBe(2); // Called again after clear

      expect(result1).toBe(4);
      expect(result2).toBe(4);
    });

    it('should only clear specified key', async () => {
      let batchCallCount = 0;
      const loader = createDataLoader<string, number>(async (keys) => {
        batchCallCount++;
        return keys.map((k) => k.length);
      });

      await Promise.all([loader.load('foo'), loader.load('bar')]);
      expect(batchCallCount).toBe(1);

      loader.clear('foo');

      const result1 = await loader.load('foo'); // Should trigger new batch
      const result2 = await loader.load('bar'); // Should use cache

      expect(batchCallCount).toBe(2);
      expect(result1).toBe(3);
      expect(result2).toBe(3);
    });
  });

  describe('clearAll', () => {
    it('should clear all cached values', async () => {
      let batchCallCount = 0;
      const loader = createDataLoader<string, number>(async (keys) => {
        batchCallCount++;
        return keys.map((k) => k.length);
      });

      await Promise.all([loader.load('foo'), loader.load('bar'), loader.load('baz')]);
      expect(batchCallCount).toBe(1);

      loader.clearAll();

      await Promise.all([loader.load('foo'), loader.load('bar')]);
      expect(batchCallCount).toBe(2); // All keys fetched again
    });
  });

  describe('scheduling', () => {
    it('should not schedule multiple microtasks unnecessarily', async () => {
      let batchCallCount = 0;
      const loader = createDataLoader<number, string>(async (keys) => {
        batchCallCount++;
        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 1));
        return keys.map((k) => `value-${k}`);
      });

      // Load items in same microtask
      loader.load(1);
      loader.load(2);
      loader.load(3);

      // Load more items before batch fires
      loader.load(4);
      loader.load(5);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(batchCallCount).toBe(1); // All should be in same batch
    });
  });
});
