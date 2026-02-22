import React from 'react';
import type { ToastItem } from '../hooks/useToasts';

interface ToastStackProps {
  toasts: ToastItem[];
}

export const ToastStack: React.FC<ToastStackProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="dashboard-toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`dashboard-toast ${toast.tone === 'error' ? 'is-error' : ''}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};
