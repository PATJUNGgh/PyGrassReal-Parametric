import { forwardRef, memo, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type PGButtonVariant =
  | 'primary'
  | 'secondary'
  | 'topnav'
  | 'topnav-cta'
  | 'topnav-plan'
  | 'topnav-mobile';

interface PGButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PGButtonVariant;
  isActive?: boolean;
  children: ReactNode;
}

const VARIANT_CLASS: Record<PGButtonVariant, string> = {
  primary: 'pg-button is-primary',
  secondary: 'pg-button is-secondary',
  topnav: 'pg-topnav-button',
  'topnav-cta': 'pg-topnav-button pg-topnav-cta',
  'topnav-plan': 'pg-topnav-button pg-topnav-plan',
  'topnav-mobile': 'pg-topnav-button pg-mobile-nav-button',
};

const PGButtonComponent = forwardRef<HTMLButtonElement, PGButtonProps>(function PGButton(
  {
    type = 'button',
    variant = 'topnav',
    isActive = false,
    className = '',
    children,
    ...buttonProps
  },
  ref
) {
  const composedClassName = [VARIANT_CLASS[variant], isActive ? 'is-active' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button {...buttonProps} ref={ref} type={type} className={composedClassName}>
      {children}
    </button>
  );
});

export const PGButton = memo(PGButtonComponent);
