import { useMemo, useState } from 'react';
import { useAuthSession } from '../auth/hooks/useAuthSession';
import { localizeText, useLanguage } from '../i18n/language';
import { DocumentationSidebar } from './components/DocumentationSidebarOverlay';
import { MainLayout } from './components/MainLayout';
import { SubHero } from './components/SubHero';
import { getTopbarNavigation } from './config/navigation';
import { DEVELOPER_INTEGRATION_EXTENSION } from './data/developerIntegrationExtension';
import {
  IntegrationExtensionTab,
  type IntegrationExtensionSectionIds,
} from './developer/IntegrationExtensionTab';
import './developer/developer-page.css';
import './pages.css';

interface IntegrationExtensionPageProps {
  onNavigate: (path: string) => void;
}

const SECTION_IDS: IntegrationExtensionSectionIds = {
  overviewOfAiTools: 'integration-extension-overview-tools',
  opencodeConfig: 'integration-extension-opencode-config',
  openclawConfig: 'integration-extension-openclaw-config',
  clineConfig: 'integration-extension-cline-config',
  kilocodeConfig: 'integration-extension-kilocode-config',
  roocodeConfig: 'integration-extension-roocode-config',
};

export default function IntegrationExtensionPage({ onNavigate }: IntegrationExtensionPageProps) {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuthSession();
  const topbarItems = getTopbarNavigation('docs', language, isAuthenticated);
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [activeTabId, setActiveTabId] = useState<keyof IntegrationExtensionSectionIds>('overviewOfAiTools');
  const data = DEVELOPER_INTEGRATION_EXTENSION;

  const sectionLabels = useMemo(
    () => ({
      overviewOfAiTools: localizeText(language, data.overviewOfAiToolsTitle),
      opencodeConfig: localizeText(language, { th: 'การตั้งค่า OpenCode', en: 'OpenCode Configuration' }),
      openclawConfig: localizeText(language, { th: 'การตั้งค่า OpenClaw', en: 'OpenClaw Configuration' }),
      clineConfig: localizeText(language, { th: 'การตั้งค่า Cline', en: 'Cline Configuration' }),
      kilocodeConfig: localizeText(language, { th: 'การตั้งค่า Kilo Code', en: 'Kilo Code Configuration' }),
      roocodeConfig: localizeText(language, { th: 'การตั้งค่า Roo Code', en: 'Roo Code Configuration' }),
    }),
    [language]
  );

  const sidebarItems = useMemo(() => {
    const normalizedQuery = sidebarQuery.trim().toLowerCase();
    return (Object.keys(sectionLabels) as Array<keyof typeof sectionLabels>)
      .filter((sectionKey) => {
        if (normalizedQuery.length === 0) {
          return true;
        }

        return sectionLabels[sectionKey].toLowerCase().includes(normalizedQuery);
      })
      .map((sectionKey) => ({
        id: sectionKey,
        label: sectionLabels[sectionKey],
        isActive: activeTabId === sectionKey,
        onSelect: () => {
          setActiveTabId(sectionKey);
          // Only scroll to top if needed, since we are switching tabs
          document.querySelector('.pg-doc-shell-content')?.scrollTo(0, 0);
        },
      }));
  }, [sectionLabels, sidebarQuery, activeTabId]);

  return (
    <MainLayout
      onNavigate={onNavigate}
      className="pg-subpage"
      topbarItems={topbarItems}
      isAuthenticated={isAuthenticated}
      pageTitle={localizeText(language, {
        th: 'Integration Extension',
        en: 'Integration Extension',
      })}
      pageDescription={localizeText(language, data.description)}
    >
      <main className="pg-main pg-main-doc-shell pg-developer-main">
        <DocumentationSidebar
          activeSection="integrationExtension"
          searchValue={sidebarQuery}
          onSearchValueChange={setSidebarQuery}
          searchPlaceholder={localizeText(language, {
            th: 'Try: Kilo, streaming, model',
            en: 'Try: Kilo, streaming, model',
          })}
          secondaryTitle={localizeText(language, {
            th: 'Integration sections',
            en: 'Integration sections',
          })}
          secondaryItems={sidebarItems}
        />

        <div className="pg-doc-shell-content">


          <section
            className="pg-developer-content pg-fade-up pg-delay-1"
            aria-label={localizeText(language, data.title)}
          >
            <IntegrationExtensionTab activeTabId={activeTabId} onTabChange={setActiveTabId} />
          </section>
        </div>
      </main>
    </MainLayout>
  );
}
