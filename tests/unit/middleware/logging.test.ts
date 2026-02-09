/**
 * Logging middleware tests
 */

import { describe, it, expect, vi } from 'vitest';
import { logOperation, startTimer, type LogEntry } from '../../../src/middleware/logging.js';

describe('Logging Middleware', () => {
  describe('logOperation', () => {
    it('should log operation with all fields', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const entry: LogEntry = {
        timestamp: '2024-01-15T10:30:00.000Z',
        operation: 'query UserById',
        duration: 125,
        ip: '192.168.1.1',
        userId: 'user-123',
      };

      logOperation(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GraphQL] 2024-01-15T10:30:00.000Z | query UserById | 125ms user=user-123 ip=192.168.1.1'
      );

      consoleSpy.mockRestore();
    });

    it('should log operation without optional fields', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const entry: LogEntry = {
        timestamp: '2024-01-15T10:30:00.000Z',
        operation: 'mutation CreatePost',
        duration: 250,
      };

      logOperation(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GraphQL] 2024-01-15T10:30:00.000Z | mutation CreatePost | 250ms'
      );

      consoleSpy.mockRestore();
    });

    it('should log anonymous operation (null operation)', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const entry: LogEntry = {
        timestamp: '2024-01-15T10:30:00.000Z',
        operation: null,
        duration: 50,
      };

      logOperation(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GraphQL] 2024-01-15T10:30:00.000Z | anonymous | 50ms'
      );

      consoleSpy.mockRestore();
    });

    it('should log with userId but no IP', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const entry: LogEntry = {
        timestamp: '2024-01-15T10:30:00.000Z',
        operation: 'query Me',
        duration: 75,
        userId: 'user-456',
      };

      logOperation(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GraphQL] 2024-01-15T10:30:00.000Z | query Me | 75ms user=user-456'
      );

      consoleSpy.mockRestore();
    });

    it('should log with IP but no userId', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const entry: LogEntry = {
        timestamp: '2024-01-15T10:30:00.000Z',
        operation: 'query Posts',
        duration: 100,
        ip: '10.0.0.1',
      };

      logOperation(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GraphQL] 2024-01-15T10:30:00.000Z | query Posts | 100ms ip=10.0.0.1'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('startTimer', () => {
    it('should return a function that measures elapsed time', async () => {
      const endTimer = startTimer();

      // Wait a short period
      await new Promise((resolve) => setTimeout(resolve, 10));

      const duration = endTimer();

      // Duration should be at least 10ms (with some tolerance)
      expect(duration).toBeGreaterThanOrEqual(9);
      expect(duration).toBeLessThan(100); // Reasonable upper bound
    });

    it('should return different durations for different timers', async () => {
      const timer1 = startTimer();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const duration1 = timer1();

      const timer2 = startTimer();
      await new Promise((resolve) => setTimeout(resolve, 20));
      const duration2 = timer2();

      expect(duration2).toBeGreaterThan(duration1);
    });

    it('should return rounded integer duration', async () => {
      const endTimer = startTimer();
      await new Promise((resolve) => setTimeout(resolve, 5));
      const duration = endTimer();

      expect(Number.isInteger(duration)).toBe(true);
    });
  });
});
