import { useState, useCallback } from 'react';

export type ToastTone = 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

const TOAST_TIMEOUT_MS = 2800;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_TIMEOUT_MS);
  }, []);

  const getErrorMessage = useCallback((error: unknown): string => {
    return error instanceof Error ? error.message : 'Unexpected error';
  }, []);

  return { toasts, pushToast, getErrorMessage };
}
