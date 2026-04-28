import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDebounce } from './useDebounce';
import { useToasts } from './useToasts';

describe('Dashboard Utility Hooks', () => {
  describe('useDebounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should return debounced value after delay', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      // Update value
      rerender({ value: 'updated', delay: 500 });
      expect(result.current).toBe('initial'); // Still initial

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('useToasts', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should add and auto-remove toasts', () => {
      const { result } = renderHook(() => useToasts());

      act(() => {
        result.current.pushToast('Success Message', 'success');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Success Message');

      // Wait for toast to expire (TOAST_TIMEOUT_MS = 2800)
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle error messages correctly', () => {
      const { result } = renderHook(() => useToasts());
      const error = new Error('Custom Error');
      
      expect(result.current.getErrorMessage(error)).toBe('Custom Error');
      expect(result.current.getErrorMessage('String Error')).toBe('Unknown error');
    });
  });
});
