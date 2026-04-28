import type { ReactNode } from 'react';
import logoIcon from '../../assets/logo-icon-768.png';
import { localizeText, useLanguage } from '../../i18n/language';
import '../auth.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { language } = useLanguage();

  return (
    <div className="auth-layout">
      <header className="auth-brand" aria-label="PyGrassReal-Ai">
        <img src={logoIcon} alt="Logo" className="auth-brand-mark" />
        <div className="auth-brand-copy">
          <strong>PyGrassReal-Ai</strong>
          <span>
            {localizeText(language, {
              th: 'สตูดิโอออกแบบพาราเมตริก',
              en: 'Parametric Design Studio',
            })}
          </span>
        </div>
      </header>

      <main className="auth-content">{children}</main>
    </div>
  );
}
