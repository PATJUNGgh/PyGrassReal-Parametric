import React from 'react';
import { localizeText, useLanguage } from '../../i18n/language';
import { DASHBOARD_UI } from '../data/dashboardData';
import type { SubscriptionEntitlement } from '../../pricing/types/pricing.types';
import type { LanguageCode } from '../../i18n/language';

interface PlanMetaProps {
  entitlement: SubscriptionEntitlement | null;
  onUpgradePlan: () => void;
  showUpgradeButton?: boolean;
}

const formatPlanStatus = (entitlement: SubscriptionEntitlement | null, lang: LanguageCode): string => {
  if (!entitlement) return localizeText(lang, DASHBOARD_UI.freePlan);
  
  const planId = entitlement.plan_id;
  const capitalizedPlan = planId.charAt(0).toUpperCase() + planId.slice(1);
  const activeLabel = localizeText(lang, DASHBOARD_UI.activeSuffix);
  
  return `${capitalizedPlan} ${activeLabel}`;
};

export const PlanMeta = React.memo(({ entitlement, onUpgradePlan, showUpgradeButton = true }: PlanMetaProps) => {
  const { language } = useLanguage();
  return (
    <div className="dashboard-plan-meta">
      {entitlement && (
        <span className="dashboard-plan-pill is-active">
          {formatPlanStatus(entitlement, language)}
        </span>
      )}
      {showUpgradeButton && (
        <button type="button" className="dashboard-upgrade-button" onClick={onUpgradePlan}>
          {localizeText(language, DASHBOARD_UI.upgradePlan)}
        </button>
      )}
    </div>
  );
});

PlanMeta.displayName = 'PlanMeta';

interface StatusInfoProps {
  loading: boolean;
  count: number;
}

export const StatusInfo = React.memo(({ loading, count }: StatusInfoProps) => {
  const { language } = useLanguage();
  return (
    <div className="dashboard-list-head">
      <p>
        {loading
          ? localizeText(language, DASHBOARD_UI.refreshing)
          : localizeText(language, DASHBOARD_UI.showingItems(count))}
      </p>
    </div>
  );
});

StatusInfo.displayName = 'StatusInfo';
