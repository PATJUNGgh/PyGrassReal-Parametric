import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface AuthPrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: ReactNode;
}

export function AuthPrimaryButton({
  loading = false,
  children,
  disabled,
  className,
  ...buttonProps
}: AuthPrimaryButtonProps) {
  return (
    <button
      className={['auth-primary-button', className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      {...buttonProps}
    >
      {loading ? <span className="auth-spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
