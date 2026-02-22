import type { ReactNode } from 'react';
import '../auth.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <header className="auth-brand" aria-label="PyGrassReal">
        <span className="auth-brand-mark">PR</span>
        <div className="auth-brand-copy">
          <strong>PyGrassReal</strong>
          <span>Parametric Studio</span>
        </div>
      </header>

      <main className="auth-content">{children}</main>
    </div>
  );
}
