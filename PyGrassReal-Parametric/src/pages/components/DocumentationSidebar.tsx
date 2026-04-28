import { useEffect, useState } from 'react';
import { localizeText, useLanguage } from '../../i18n/language';
import {
  DocumentationSectionNav,
  type DocumentationSection,
  type DocumentationSidebarItem,
} from './DocumentationSectionNav';

interface DocumentationSidebarProps {
  activeSection: DocumentationSection;
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  searchPlaceholder?: string;
  secondaryTitle?: string;
  secondaryItems?: DocumentationSidebarItem[];
}

const MOBILE_SIDEBAR_MEDIA_QUERY = '(max-width: 980px)';
const getInitialMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia(MOBILE_SIDEBAR_MEDIA_QUERY).matches;

export function DocumentationSidebar({
  activeSection,
  searchValue,
  onSearchValueChange,
  searchPlaceholder,
  secondaryTitle,
  secondaryItems = [],
}: DocumentationSidebarProps) {
  const { language } = useLanguage();
  const [isMobileViewport, setIsMobileViewport] = useState(getInitialMobileViewport);
  const [isMobileOverlayOpen, setIsMobileOverlayOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_SIDEBAR_MEDIA_QUERY);
    const syncViewportState = (matches: boolean) => {
      setIsMobileViewport(matches);
      if (!matches) {
        setIsMobileOverlayOpen(false);
      }
    };

    syncViewportState(mediaQuery.matches);
    const handleViewportChange = (event: MediaQueryListEvent) => syncViewportState(event.matches);
    mediaQuery.addEventListener('change', handleViewportChange);

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport || !isMobileOverlayOpen || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOverlayOpen, isMobileViewport]);

  useEffect(() => {
    if (!isMobileOverlayOpen || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileOverlayOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOverlayOpen]);

  const isSidebarBodyHidden = isMobileViewport && !isMobileOverlayOpen;

  return (
    <aside className="pg-doc-shell-sidebar">
      {isMobileViewport ? (
        <button
          type="button"
          className="pg-doc-sidebar-mobile-toggle"
          onClick={() => setIsMobileOverlayOpen((previous) => !previous)}
          aria-expanded={isMobileOverlayOpen}
          aria-controls="pg-doc-sidebar-body"
        >
          <span>
            {localizeText(language, {
              th: 'เอกสาร',
              en: 'Documentation',
            })}
          </span>
          <span className="pg-doc-sidebar-mobile-toggle-chevron" aria-hidden="true">
            {isMobileOverlayOpen ? 'v' : '>'}
          </span>
        </button>
      ) : null}

      {isMobileViewport && isMobileOverlayOpen ? (
        <button
          type="button"
          className="pg-doc-sidebar-mobile-backdrop"
          onClick={() => setIsMobileOverlayOpen(false)}
          aria-label={localizeText(language, {
            th: 'ปิดเอกสาร',
            en: 'Close documentation',
          })}
        />
      ) : null}

      <div
        id="pg-doc-sidebar-body"
        className={`pg-doc-sidebar-body ${isSidebarBodyHidden ? 'is-hidden' : ''} ${
          isMobileViewport && isMobileOverlayOpen ? 'is-mobile-overlay' : ''
        }`}
      >
      <div className="pg-doc-sidebar-head">
        <h2>
          {localizeText(language, {
            th: 'เอกสาร',
            en: 'Documentation',
          })}
        </h2>
      </div>

      {typeof onSearchValueChange === 'function' ? (
        <div className="pg-doc-sidebar-search">
          <label htmlFor="doc-sidebar-search">
            {localizeText(language, {
              th: 'ค้นหาเอกสาร',
              en: 'Search documentation',
            })}
          </label>
          <input
            id="doc-sidebar-search"
            type="search"
            value={searchValue ?? ''}
            onChange={(event) => onSearchValueChange(event.target.value)}
            placeholder={
              searchPlaceholder ??
              localizeText(language, {
                th: 'พิมพ์เพื่อค้นหา',
                en: 'Type to search',
              })
            }
          />
        </div>
      ) : null}

      <DocumentationSectionNav
        activeSection={activeSection}
        variant="sidebar"
        sidebarSecondaryTitle={
          secondaryTitle ??
          localizeText(language, {
            th: 'เมนูเอกสารย่อย',
            en: 'Documentation subsections',
          })
        }
        sidebarSecondaryItems={secondaryItems}
      />
      </div>

      {false && secondaryItems.length > 0 ? (
        <nav
          className="pg-doc-sidebar-secondary"
          aria-label={
            secondaryTitle ??
            localizeText(language, {
              th: 'เมนูเอกสารย่อย',
              en: 'Documentation subsections',
            })
          }
        >
          {secondaryTitle ? <h3>{secondaryTitle}</h3> : null}
          {secondaryItems.map((item) => (
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
        </nav>
      ) : null}
    </aside>
  );
}

