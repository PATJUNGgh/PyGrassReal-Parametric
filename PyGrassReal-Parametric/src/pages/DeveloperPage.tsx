import { useMemo, useState } from 'react';
import { useAuthSession } from '../auth/hooks/useAuthSession';
import { localizeText, useLanguage } from '../i18n/language';
import { DocumentationSidebar } from './components/DocumentationSidebarOverlay';
import { MainLayout } from './components/MainLayout';
import { SubHero } from './components/SubHero';
import { getTopbarNavigation } from './config/navigation';
import { type DeveloperTabId, DEVELOPER_PAGE_DATA } from './data/developerDataV2';
import { ApiReferenceTab } from './developer/ApiReferenceTab';
import { FaqTab } from './developer/FaqTab';
import { GettingStartedTab } from './developer/GettingStartedTab';
import { PlatformRecipesTab } from './developer/PlatformRecipesTab';
import { PricingTab } from './developer/PricingTab';
import { RateLimitsTab } from './developer/RateLimitsTab';
import { TermsPolicyTab } from './developer/TermsPolicyTab';
import './developer/developer-page.css';
import './pages.css';

interface DeveloperPageProps {
  onNavigate: (path: string) => void;
}

const TAB_SEQUENCE: DeveloperTabId[] = [
  'gettingStarted',
  'apiReference',
  'platformRecipes',
  'rateLimits',
  'pricing',
  'faq',
  'termsPolicy',
];

export default function DeveloperPage({ onNavigate }: DeveloperPageProps) {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuthSession();
  const topbarItems = getTopbarNavigation('docs', language, isAuthenticated);
  const [activeTab, setActiveTab] = useState<DeveloperTabId>('gettingStarted');
  const [sidebarQuery, setSidebarQuery] = useState('');

  const tabLabels = useMemo<Record<DeveloperTabId, string>>(
    () => ({
      gettingStarted: localizeText(language, DEVELOPER_PAGE_DATA.tabs.gettingStarted),
      apiReference: localizeText(language, DEVELOPER_PAGE_DATA.tabs.apiReference),
      platformRecipes: localizeText(language, DEVELOPER_PAGE_DATA.tabs.platformRecipes),
      rateLimits: localizeText(language, DEVELOPER_PAGE_DATA.tabs.rateLimits),
      pricing: localizeText(language, DEVELOPER_PAGE_DATA.tabs.pricing),
      faq: localizeText(language, DEVELOPER_PAGE_DATA.tabs.faq),
      termsPolicy: localizeText(language, DEVELOPER_PAGE_DATA.tabs.termsPolicy),
    }),
    [language]
  );

  const sidebarItems = useMemo(() => {
    const normalizedQuery = sidebarQuery.trim().toLowerCase();
    return TAB_SEQUENCE
      .filter((tabId) => {
        if (normalizedQuery.length === 0) {
          return true;
        }
        return tabLabels[tabId].toLowerCase().includes(normalizedQuery);
      })
      .map((tabId) => ({
        id: tabId,
        label: tabLabels[tabId],
        isActive: activeTab === tabId,
        onSelect: () => setActiveTab(tabId),
      }));
  }, [activeTab, sidebarQuery, tabLabels]);

  return (
    <MainLayout
      onNavigate={onNavigate}
      className="pg-subpage"
      topbarItems={topbarItems}
      isAuthenticated={isAuthenticated}
      pageTitle={localizeText(language, DEVELOPER_PAGE_DATA.pageTitle)}
      pageDescription={localizeText(language, DEVELOPER_PAGE_DATA.pageDescription)}
    >
      <main className="pg-main pg-main-doc-shell pg-developer-main">
        <DocumentationSidebar
          activeSection="api"
          searchValue={sidebarQuery}
          onSearchValueChange={setSidebarQuery}
          searchPlaceholder={localizeText(language, {
            th: 'Try: auth, pricing, faq',
            en: 'Try: auth, pricing, faq',
          })}
          secondaryTitle={localizeText(language, {
            th: 'หัวข้อ API',
            en: 'API sections',
          })}
          secondaryItems={sidebarItems}
        />

        <div className="pg-doc-shell-content">
          <SubHero
            className="pg-developer-hero"
            chip={localizeText(language, DEVELOPER_PAGE_DATA.hero.chip)}
            title={localizeText(language, DEVELOPER_PAGE_DATA.hero.title)}
            description={localizeText(language, DEVELOPER_PAGE_DATA.hero.description)}
          />

          <section className="pg-developer-content pg-fade-up pg-delay-1" aria-label={tabLabels[activeTab]}>
            {activeTab === 'gettingStarted' && <GettingStartedTab />}
            {activeTab === 'apiReference' && <ApiReferenceTab />}
            {activeTab === 'platformRecipes' && <PlatformRecipesTab />}
            {activeTab === 'rateLimits' && <RateLimitsTab />}
            {activeTab === 'pricing' && <PricingTab />}
            {activeTab === 'faq' && <FaqTab />}
            {activeTab === 'termsPolicy' && <TermsPolicyTab onNavigate={onNavigate} />}
          </section>
        </div>
      </main>
    </MainLayout>
  );
}
