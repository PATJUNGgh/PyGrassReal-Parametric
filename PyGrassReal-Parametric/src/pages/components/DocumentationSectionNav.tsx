import { localizeText, useLanguage } from '../../i18n/language';
import { usePageNavigation } from '../navigation/PageNavigationContext';
import { PGButton } from './PGButton';

export type DocumentationSection = 'about' | 'nodes' | 'api' | 'integrationExtension' | 'legal';

export interface DocumentationSidebarItem {
  id: string;
  label: string;
  isActive?: boolean;
  onSelect: () => void;
}

interface DocumentationSectionNavProps {
  activeSection: DocumentationSection;
  variant?: 'inline' | 'sidebar';
  sidebarSecondaryTitle?: string;
  sidebarSecondaryItems?: DocumentationSidebarItem[];
}

const SECTION_CONFIG: Record<
  DocumentationSection,
  {
    path: '/about' | '/docs' | '/developer' | '/integration-extension' | '/legal/terms';
    label: { th: string; en: string };
    description: { th: string; en: string };
  }
> = {
  about: {
    path: '/about',
    label: { th: 'เกี่ยวกับ', en: 'About' },
    description: { th: 'วิสัยทัศน์และ roadmap ของผลิตภัณฑ์', en: 'Vision and product roadmap' },
  },
  nodes: {
    path: '/docs',
    label: { th: 'เอกสาร Node', en: 'Node Docs' },
    description: { th: 'ค้นหา node และหมวดการใช้งาน', en: 'Browse node references and categories' },
  },
  api: {
    path: '/developer',
    label: { th: 'เอกสาร API', en: 'API Docs' },
    description: { th: 'คู่มือ integration และ API reference', en: 'Integration guide and API reference' },
  },
  integrationExtension: {
    path: '/integration-extension',
    label: { th: 'ส่วนขยายการเชื่อมต่อ', en: 'Integration Extension' },
    description: { th: 'Kilo, VS Code, and extension setup', en: 'Kilo, VS Code, and extension setup' },
  },
  legal: {
    path: '/legal/terms',
    label: { th: 'กฎหมาย', en: 'Legal' },
    description: { th: 'Terms, privacy, and platform policies', en: 'Terms, privacy, and platform policies' },
  },
};

const SECTION_ENTRIES = Object.entries(SECTION_CONFIG) as [
  DocumentationSection,
  (typeof SECTION_CONFIG)[DocumentationSection],
][];

export function DocumentationSectionNav({
  activeSection,
  variant = 'inline',
  sidebarSecondaryTitle,
  sidebarSecondaryItems = [],
}: DocumentationSectionNavProps) {
  const { language } = useLanguage();
  const { navigate } = usePageNavigation();
  const navClassName =
    variant === 'sidebar' ? 'pg-doc-section-nav pg-doc-section-nav-sidebar' : 'pg-doc-section-nav';

  const navigationAriaLabel = localizeText(language, {
    th: 'Documentation sections',
    en: 'Documentation sections',
  });

  if (variant === 'sidebar') {
    return (
      <nav className={navClassName} aria-label={navigationAriaLabel}>
        {SECTION_ENTRIES.map(([sectionId, section]) => {
          const isActive = activeSection === sectionId;

          return (
            <div key={sectionId} className={`pg-doc-section-group ${isActive ? 'is-active' : ''}`}>
              <button
                type="button"
                className={`pg-doc-section-group-trigger ${isActive ? 'is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                aria-expanded={isActive}
                onClick={() =>
                  navigate(section.path, {
                    source: `documentation.section.${sectionId}`,
                  })
                }
              >
                <span>{localizeText(language, section.label)}</span>
                <span className="pg-doc-section-group-chevron" aria-hidden="true">
                  {isActive ? 'v' : '>'}
                </span>
              </button>

              {isActive && sidebarSecondaryItems.length > 0 ? (
                <div
                  className="pg-doc-section-group-submenu"
                  role="group"
                  aria-label={sidebarSecondaryTitle ?? navigationAriaLabel}
                >
                  {sidebarSecondaryTitle ? <p>{sidebarSecondaryTitle}</p> : null}
                  {sidebarSecondaryItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`pg-doc-sidebar-link ${item.isActive ? 'is-active' : ''}`}
                      onClick={item.onSelect}
                      aria-current={item.isActive ? 'page' : undefined}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className={navClassName}
      aria-label={localizeText(language, {
        th: 'หมวดเอกสาร',
        en: 'Documentation sections',
      })}
    >
      {SECTION_ENTRIES.map(([sectionId, section]) => {
        const isActive = activeSection === sectionId;

        return (
          <PGButton
            key={sectionId}
            type="button"
            variant="topnav"
            className="pg-doc-section-nav-button"
            isActive={isActive}
            aria-current={isActive ? 'page' : undefined}
            onClick={() =>
              navigate(section.path, {
                source: `documentation.section.${sectionId}`,
              })
            }
          >
            <span>{localizeText(language, section.label)}</span>
            <small>{localizeText(language, section.description)}</small>
          </PGButton>
        );
      })}
    </nav>
  );
}

