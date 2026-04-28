import React from 'react';
import { localizeText, useLanguage } from '../../i18n/language';
import { EMPTY_STATE_UI, MODAL_UI } from '../data/dashboardData';

interface DashboardEmptyStateProps {
  onCreateClick: () => void;
}

export const DashboardEmptyState = React.memo(({ onCreateClick }: DashboardEmptyStateProps) => {
  const { language } = useLanguage();

  return (
    <section className="dashboard-empty-state">
      <div className="dashboard-empty-copy">
        <h2>{localizeText(language, EMPTY_STATE_UI.noWorkflows)}</h2>
        <p>{localizeText(language, EMPTY_STATE_UI.description)}</p>
      </div>
      <button 
        type="button" 
        className="dashboard-primary-button" 
        onClick={onCreateClick}
      >
        {localizeText(language, MODAL_UI.createTitle)}
      </button>
    </section>
  );
});

DashboardEmptyState.displayName = 'DashboardEmptyState';
