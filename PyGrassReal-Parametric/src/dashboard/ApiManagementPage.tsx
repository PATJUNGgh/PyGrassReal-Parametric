import { useCallback, useMemo } from 'react';
import { localizeText, useLanguage } from '../i18n/language';
import { API_MANAGEMENT_UI } from './data/dashboardData';
import { ApiKeysTab } from './api-management/ApiKeysTab';
import { BillingTab } from './api-management/BillingTab';
import { RateLimitsTab } from './api-management/RateLimitsTab';
import { SubscriptionTab } from './api-management/SubscriptionTab';
import './api-management/api-management.css';

type ApiManagementTabId = 'apiKeys' | 'rateLimits' | 'billing' | 'subscription';

const TAB_SEQUENCE: ApiManagementTabId[] = ['apiKeys', 'rateLimits', 'billing', 'subscription'];

const resolveTabFromSearch = (search: string): ApiManagementTabId | null => {
  const queryValue = new URLSearchParams(search).get('tab');
  if (queryValue === 'apiKeys' || queryValue === 'rateLimits' || queryValue === 'billing' || queryValue === 'subscription') {
    return queryValue;
  }
  return null;
};

const resolveInitialTab = (): ApiManagementTabId => {
  const tabFromQuery = resolveTabFromSearch(window.location.search);
  return tabFromQuery ?? 'apiKeys';
};

interface ApiManagementPageProps {
  onNavigate: (path: string) => void;
}

export function ApiManagementPage({ onNavigate }: ApiManagementPageProps) {
  const { language } = useLanguage();
  const activeTab = resolveInitialTab();

  const tabLabels = useMemo<Record<ApiManagementTabId, string>>(() => ({
    apiKeys: localizeText(language, API_MANAGEMENT_UI.tabs.apiKeys),
    rateLimits: localizeText(language, API_MANAGEMENT_UI.tabs.rateLimits),
    billing: localizeText(language, API_MANAGEMENT_UI.tabs.billing),
    subscription: localizeText(language, API_MANAGEMENT_UI.tabs.subscription),
  }), [language]);

  const handleTabChange = useCallback((tabId: ApiManagementTabId) => {
    if (tabId === 'apiKeys') {
      onNavigate('/dashboard/api');
      return;
    }
    onNavigate(`/dashboard/api?tab=${tabId}`);
  }, [onNavigate]);

  return (
    <div className="api-management-page">
      <div className="api-management-layout">
        <nav className="api-management-side-tabs" aria-label={localizeText(language, API_MANAGEMENT_UI.title)}>
          {TAB_SEQUENCE.map((tabId) => (
            <button
              key={tabId}
              type="button"
              className={`api-side-tab ${activeTab === tabId ? 'is-active' : ''}`}
              onClick={() => handleTabChange(tabId)}
            >
              {tabLabels[tabId]}
            </button>
          ))}
        </nav>

        <section className="api-management-content">
          {activeTab === 'apiKeys' && <ApiKeysTab />}
          {activeTab === 'rateLimits' && <RateLimitsTab />}
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'subscription' && <SubscriptionTab />}
        </section>
      </div>
    </div>
  );
}
