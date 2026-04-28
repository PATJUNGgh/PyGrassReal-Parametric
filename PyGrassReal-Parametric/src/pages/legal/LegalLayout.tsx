import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuthSession } from '../../auth/hooks/useAuthSession';
import { formatLastUpdated, localizeText, useLanguage } from '../../i18n/language';
import { ACCEPTABLE_USE_EN, ACCEPTABLE_USE_TH } from '../data/legal/acceptableUseContent';
import { AI_POLICY_EN, AI_POLICY_TH } from '../data/legal/aiPolicyContent';
import { CONTACT_EN, CONTACT_TH } from '../data/legal/contactContent';
import { PRIVACY_EN, PRIVACY_TH } from '../data/legal/privacyContent';
import { TERMS_EN, TERMS_TH } from '../data/legal/termsContent';
import { DocumentationSidebar } from '../components/DocumentationSidebarOverlay';
import { MainLayout } from '../components/MainLayout';
import { SubHero } from '../components/SubHero';
import '../pages.css';
import './legal.css';
import { LEGAL_DOCUMENT_LINKS, localizeLegalDocumentLink, type LegalRoutePath } from './legalNavigation';

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalLayoutProps {
  onNavigate: (path: string) => void;
  currentPath: LegalRoutePath;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export function LegalLayout({
  onNavigate,
  currentPath,
  title,
  description,
  lastUpdated,
  sections,
}: LegalLayoutProps) {
  const { language } = useLanguage();

  const localizedLinks = useMemo(
    () => LEGAL_DOCUMENT_LINKS.map((documentLink) => localizeLegalDocumentLink(language, documentLink)),
    [language]
  );
  const localizedSectionsByPath = useMemo<Record<LegalRoutePath, LegalSection[]>>(
    () => ({
      '/legal/terms': language === 'th' ? TERMS_TH : TERMS_EN,
      '/legal/privacy': language === 'th' ? PRIVACY_TH : PRIVACY_EN,
      '/legal/acceptable-use': language === 'th' ? ACCEPTABLE_USE_TH : ACCEPTABLE_USE_EN,
      '/legal/ai-policy': language === 'th' ? AI_POLICY_TH : AI_POLICY_EN,
      '/legal/contact': language === 'th' ? CONTACT_TH : CONTACT_EN,
    }),
    [language]
  );
  const [activePath, setActivePath] = useState<LegalRoutePath>(currentPath);
  const [sidebarQuery, setSidebarQuery] = useState('');

  useEffect(() => {
    setActivePath(currentPath);
  }, [currentPath]);

  const activeLink = localizedLinks.find((documentLink) => documentLink.path === activePath) ?? {
    path: currentPath,
    label: title,
    shortLabel: title,
    summary: description,
  };
  const activeTitle = activePath === currentPath ? title : activeLink.label;
  const activeDescription = activePath === currentPath ? description : activeLink.summary;
  const activeSections = localizedSectionsByPath[activePath] ?? sections;
  const filteredLinks = useMemo(() => {
    const normalizedQuery = sidebarQuery.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return localizedLinks;
    }

    return localizedLinks.filter((documentLink) =>
      `${documentLink.shortLabel} ${documentLink.label} ${documentLink.summary}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [localizedLinks, sidebarQuery]);
  const sidebarItems = useMemo(
    () =>
      filteredLinks.map((documentLink) => ({
        id: documentLink.path,
        label: documentLink.shortLabel,
        isActive: documentLink.path === activePath,
        onSelect: () => setActivePath(documentLink.path),
      })),
    [activePath, filteredLinks]
  );

  const { isAuthenticated } = useAuthSession();

  return (
    <MainLayout
      onNavigate={onNavigate}
      className="pg-subpage pg-legal-page"
      topbarItems={[]}
      isAuthenticated={isAuthenticated}
      pageTitle={activeTitle}
      pageDescription={activeDescription}
      currentPath={currentPath}
    >
      <main className="pg-main pg-main-doc-shell pg-main-legal">
        <DocumentationSidebar
          activeSection="legal"
          searchValue={sidebarQuery}
          onSearchValueChange={setSidebarQuery}
          searchPlaceholder={localizeText(language, {
            th: 'ลองพิมพ์: terms, privacy, ai',
            en: 'Try: terms, privacy, ai',
          })}
          secondaryTitle={localizeText(language, {
            th: 'เอกสารกฎหมาย',
            en: 'Legal Documents',
          })}
          secondaryItems={sidebarItems}
        />

        <div className="pg-doc-shell-content">
          <SubHero
            className="pg-legal-hero"
            chip={localizeText(language, {
              th: 'เอกสารกฎหมาย',
              en: 'Legal',
            })}
            title={activeTitle}
            description={activeDescription}
          >
            <p className="pg-legal-last-updated">{formatLastUpdated(language, lastUpdated)}</p>
            <p className="pg-legal-disclaimer">
              {localizeText(language, {
                th: 'เอกสารชุดนี้แสดงนโยบายแพลตฟอร์มและความโปร่งใสด้านการดำเนินงานของ PyGrassReal-Ai',
                en: 'These materials provide platform policy and operational transparency for PyGrassReal-Ai.',
              })}
            </p>
            <p className="pg-legal-disclaimer">
              {localizeText(language, {
                th: 'หมายเหตุ: ข้อกฎหมายฉบับละเอียดใช้ข้อความภาษาอังกฤษเป็นฉบับอ้างอิงหลัก',
                en: 'Note: Detailed legal clauses are currently maintained in English as the governing reference.',
              })}
            </p>
          </SubHero>

          <section className="pg-legal-content pg-fade-up pg-delay-1">
            <article className="pg-legal-article">
              <nav className="pg-legal-toc" aria-label={`${activeTitle} table of contents`}>
                <h2>
                  {localizeText(language, {
                    th: 'สารบัญหน้านี้',
                    en: 'On This Page',
                  })}
                </h2>
                <ul>
                  {activeSections.map((section) => (
                    <li key={section.id}>
                      <a href={`#${section.id}`}>{section.title}</a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="pg-legal-sections">
                {activeSections.map((section) => (
                  <section key={section.id} id={section.id} className="pg-legal-section">
                    <h2>{section.title}</h2>
                    <div className="pg-legal-section-content">{section.content}</div>
                  </section>
                ))}
              </div>
            </article>
          </section>
        </div>
      </main>
    </MainLayout>
  );
}
