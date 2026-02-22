import React from 'react';
import './DashboardHeader.css';

interface DashboardHeaderProps {
  children?: React.ReactNode;
  rightMeta?: React.ReactNode;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  children,
  rightMeta
}) => {
  return (
    <header className="dashboard-content-header">
      <div className="header-actions-left">
        {children}
      </div>

      <div className="header-right-meta">
        {rightMeta || (
          <div className="system-indicator">
            <span className="pulse-dot"></span>
            <span className="status-text">AI Powered Engine</span>
          </div>
        )}
      </div>
    </header>
  );
};
