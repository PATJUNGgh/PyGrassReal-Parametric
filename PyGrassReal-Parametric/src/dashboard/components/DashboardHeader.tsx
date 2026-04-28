import React from 'react';
import { localizeText, useLanguage } from '../../i18n/language';
import { DASHBOARD_UI } from '../data/dashboardData';
import './DashboardHeader.css';

interface DashboardHeaderProps {
  children?: React.ReactNode;
  rightMeta?: React.ReactNode;
}

export const DashboardHeader = React.memo(({
  children,
  rightMeta
}: DashboardHeaderProps) => {
  const { language } = useLanguage();

  return (
    <header className="dashboard-content-header">
      <div className="header-actions-left">
        {children}
      </div>

      <div className="header-right-meta">
        {rightMeta || (
          <div className="system-indicator">
            <span className="pulse-dot"></span>
            <span className="status-text">
              {localizeText(language, DASHBOARD_UI.aiPowered)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
