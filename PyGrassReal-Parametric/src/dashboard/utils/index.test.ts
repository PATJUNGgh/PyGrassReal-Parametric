import { describe, it, expect, vi } from 'vitest';
import { formatTimestamp, isRecord, throwQueryError } from './index';

describe('Dashboard Utils', () => {
  describe('formatTimestamp', () => {
    it('returns N/A for null or invalid dates', () => {
      expect(formatTimestamp(null)).toBe('N/A');
      expect(formatTimestamp('invalid-date')).toBe('N/A');
    });

    it('formats valid ISO strings correctly', () => {
      const date = '2026-02-23T10:00:00.000Z';
      // Output depends on local env, but check if it's not N/A and has expected parts
      const result = formatTimestamp(date);
      expect(result).not.toBe('N/A');
      expect(result).toContain('2026');
    });
  });

  describe('isRecord', () => {
    it('identifies objects correctly', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ a: 1 })).toBe(true);
      expect(isRecord([])).toBe(false);
      expect(isRecord(null)).toBe(false);
      expect(isRecord(123)).toBe(false);
    });
  });

  describe('throwQueryError', () => {
    it('logs structured JSON error and throws', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = { message: 'DB Error', code: 'P001' };
      
      expect(() => throwQueryError('Failed test', error, { user_id: 'u1' }))
        .toThrow('Failed test: DB Error (Code: P001)');

      expect(consoleSpy).toHaveBeenCalled();
      const lastCall = consoleSpy.mock.calls[0][1];
      const parsedLog = JSON.parse(lastCall);
      
      expect(parsedLog.user_id).toBe('u1');
      expect(parsedLog.message).toBe('Failed test');
      expect(parsedLog.error_context.code).toBe('P001');
    });
  });
});
