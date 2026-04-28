import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { getErrorDetails } from '../utils';

export type ToastTone = 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

const TOAST_TIMEOUT_MS = 2800;

/**
 * Custom hook to manage transient UI notifications (toasts).
 * 
 * Features:
 * - Automatic self-removal after timeout.
 * - Queue management: limits active toasts to 5 to prevent screen clutter.
 * - Cleanup of timers on component unmount.
 * - Error message parsing utility.
 * 
 * @returns Object with the current toast list and helper functions.
 */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const pushToast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = crypto.randomUUID?.() || `toast-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    
    setToasts((prev) => {
      const next = [...prev, { id, message, tone }];
      if (next.length > 5) {
        // Remove oldest if more than 5
        const oldest = next[0];
        const timerId = timersRef.current.get(oldest.id);
        if (timerId) window.clearTimeout(timerId);
        timersRef.current.delete(oldest.id);
        return next.slice(1);
      }
      return next;
    });

    const timeoutId = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      timersRef.current.delete(id);
    }, TOAST_TIMEOUT_MS);

    timersRef.current.set(id, timeoutId);
  }, []);

  const getErrorMessage = useCallback((error: unknown): string => {
    const { details, code } = getErrorDetails(error);
    return `${details}${code}`;
  }, []);

  return useMemo(() => ({ 
    toasts, 
    pushToast, 
    getErrorMessage 
  }), [toasts, pushToast, getErrorMessage]);
}
