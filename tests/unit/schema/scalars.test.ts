/**
 * Custom scalar tests
 */

import { describe, it, expect } from 'vitest';
import { Kind } from 'graphql';
import { DateTimeScalar, JSONScalar } from '../../../src/schema/scalars/index.js';

describe('DateTimeScalar', () => {
  describe('serialize', () => {
    it('should serialize Date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(DateTimeScalar.serialize(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should serialize string to ISO string', () => {
      const dateStr = '2024-01-15T10:30:00.000Z';
      expect(DateTimeScalar.serialize(dateStr)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should throw error for invalid serialize value', () => {
      expect(() => DateTimeScalar.serialize(123)).toThrow('DateTime must be a Date instance or ISO string');
      expect(() => DateTimeScalar.serialize(null)).toThrow('DateTime must be a Date instance or ISO string');
      expect(() => DateTimeScalar.serialize({})).toThrow('DateTime must be a Date instance or ISO string');
    });
  });

  describe('parseValue', () => {
    it('should parse valid ISO string to Date', () => {
      const dateStr = '2024-01-15T10:30:00.000Z';
      const result = DateTimeScalar.parseValue(dateStr);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should parse number timestamp to Date', () => {
      const timestamp = 1705317000000; // 2024-01-15T10:30:00.000Z
      const result = DateTimeScalar.parseValue(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp);
    });

    it('should throw error for invalid date string', () => {
      expect(() => DateTimeScalar.parseValue('invalid-date')).toThrow('Invalid DateTime value');
    });

    it('should throw error for non-string/non-number', () => {
      expect(() => DateTimeScalar.parseValue(null)).toThrow('DateTime must be a string or number');
      expect(() => DateTimeScalar.parseValue({})).toThrow('DateTime must be a string or number');
    });
  });

  describe('parseLiteral', () => {
    it('should parse STRING literal to Date', () => {
      const ast = {
        kind: Kind.STRING,
        value: '2024-01-15T10:30:00.000Z',
      };
      const result = DateTimeScalar.parseLiteral(ast as any);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should parse INT literal to Date', () => {
      const ast = {
        kind: Kind.INT,
        value: '1705317000000',
      };
      const result = DateTimeScalar.parseLiteral(ast as any);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(1705317000000);
    });

    it('should throw for invalid STRING literal', () => {
      const ast = {
        kind: Kind.STRING,
        value: 'invalid-date',
      };
      expect(() => DateTimeScalar.parseLiteral(ast as any)).toThrow('Invalid DateTime literal');
    });

    it('should throw for non-STRING/non-INT literal', () => {
      const ast = {
        kind: Kind.BOOLEAN,
        value: true,
      };
      expect(() => DateTimeScalar.parseLiteral(ast as any)).toThrow('DateTime literal must be a string or integer');
    });
  });
});

describe('JSONScalar', () => {
  describe('serialize', () => {
    it('should serialize primitive values', () => {
      expect(JSONScalar.serialize('string')).toBe('string');
      expect(JSONScalar.serialize(123)).toBe(123);
      expect(JSONScalar.serialize(true)).toBe(true);
      expect(JSONScalar.serialize(null)).toBeNull();
    });

    it('should serialize objects', () => {
      const obj = { a: 1, b: 'test' };
      expect(JSONScalar.serialize(obj)).toEqual(obj);
    });

    it('should serialize arrays', () => {
      const arr = [1, 'two', true];
      expect(JSONScalar.serialize(arr)).toEqual(arr);
    });
  });

  describe('parseValue', () => {
    it('should parse any value as-is', () => {
      expect(JSONScalar.parseValue('string')).toBe('string');
      expect(JSONScalar.parseValue(123)).toBe(123);
      expect(JSONScalar.parseValue(true)).toBe(true);
      expect(JSONScalar.parseValue(null)).toBeNull();
      
      const obj = { a: 1 };
      expect(JSONScalar.parseValue(obj)).toEqual(obj);
      
      const arr = [1, 2];
      expect(JSONScalar.parseValue(arr)).toEqual(arr);
    });
  });

  describe('parseLiteral', () => {
    it('should parse STRING literal', () => {
      const ast = { kind: Kind.STRING, value: 'test' };
      expect(JSONScalar.parseLiteral(ast as any)).toBe('test');
    });

    it('should parse BOOLEAN literal', () => {
      const ast = { kind: Kind.BOOLEAN, value: true };
      expect(JSONScalar.parseLiteral(ast as any)).toBe(true);
    });

    it('should parse INT literal', () => {
      const ast = { kind: Kind.INT, value: '42' };
      expect(JSONScalar.parseLiteral(ast as any)).toBe(42);
    });

    it('should parse FLOAT literal', () => {
      const ast = { kind: Kind.FLOAT, value: '3.14' };
      expect(JSONScalar.parseLiteral(ast as any)).toBe(3.14);
    });

    it('should parse NULL literal', () => {
      const ast = { kind: Kind.NULL };
      expect(JSONScalar.parseLiteral(ast as any)).toBeNull();
    });

    it('should parse OBJECT literal', () => {
      const ast = {
        kind: Kind.OBJECT,
        fields: [
          {
            name: { value: 'a' },
            value: { kind: Kind.INT, value: '1' },
          },
          {
            name: { value: 'b' },
            value: { kind: Kind.STRING, value: 'test' },
          },
        ],
      };
      const result = JSONScalar.parseLiteral(ast as any);
      expect(result).toEqual({ a: 1, b: 'test' });
    });

    it('should parse LIST literal', () => {
      const ast = {
        kind: Kind.LIST,
        values: [
          { kind: Kind.INT, value: '1' },
          { kind: Kind.STRING, value: 'two' },
          { kind: Kind.BOOLEAN, value: true },
        ],
      };
      const result = JSONScalar.parseLiteral(ast as any);
      expect(result).toEqual([1, 'two', true]);
    });

    it('should parse nested OBJECT literal', () => {
      const ast = {
        kind: Kind.OBJECT,
        fields: [
          {
            name: { value: 'nested' },
            value: {
              kind: Kind.OBJECT,
              fields: [
                {
                  name: { value: 'value' },
                  value: { kind: Kind.INT, value: '123' },
                },
              ],
            },
          },
        ],
      };
      const result = JSONScalar.parseLiteral(ast as any);
      expect(result).toEqual({ nested: { value: 123 } });
    });

    it('should parse nested LIST literal', () => {
      const ast = {
        kind: Kind.LIST,
        values: [
          {
            kind: Kind.LIST,
            values: [
              { kind: Kind.INT, value: '1' },
              { kind: Kind.INT, value: '2' },
            ],
          },
          {
            kind: Kind.LIST,
            values: [
              { kind: Kind.INT, value: '3' },
              { kind: Kind.INT, value: '4' },
            ],
          },
        ],
      };
      const result = JSONScalar.parseLiteral(ast as any);
      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    it('should return null for unknown AST kind', () => {
      const ast = {
        kind: 'UNKNOWN_KIND',
      };
      expect(JSONScalar.parseLiteral(ast as any)).toBeNull();
    });
  });
});
