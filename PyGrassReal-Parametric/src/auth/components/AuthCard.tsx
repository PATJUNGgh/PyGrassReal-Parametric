import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <section className="auth-card">
      <header className="auth-card-header">
        <h1 className="auth-card-title">{title}</h1>
        <p className="auth-card-subtitle">{subtitle}</p>
      </header>

      <div className="auth-card-body">{children}</div>
    </section>
  );
}
