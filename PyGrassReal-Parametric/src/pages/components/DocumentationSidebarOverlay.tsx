import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
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
  const [isMobileScrolled, setIsMobileScrolled] = useState(false);
  const [mobileDockHost, setMobileDockHost] = useState<HTMLElement | null>(null);

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

  useEffect(() => {
    if (!isMobileViewport || typeof window === 'undefined') {
      setIsMobileScrolled(false);
      return;
    }

    const syncScrollState = () => {
      setIsMobileScrolled(window.scrollY > 8);
    };

    syncScrollState();
    window.addEventListener('scroll', syncScrollState, { passive: true });

    return () => {
      window.removeEventListener('scroll', syncScrollState);
    };
  }, [isMobileViewport]);

  useEffect(() => {
    if (typeof document === 'undefined' || !isMobileViewport) {
      setMobileDockHost(null);
      return;
    }

    setMobileDockHost(document.querySelector('.pg-topbar-head'));
  }, [isMobileViewport]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (isMobileViewport) {
      document.body.classList.add('pg-has-doc-mobile-toggle');
    } else {
      document.body.classList.remove('pg-has-doc-mobile-toggle');
    }

    return () => {
      document.body.classList.remove('pg-has-doc-mobile-toggle');
    };
  }, [isMobileViewport]);

  const sidebarTitle = localizeText(language, {
    th: 'เอกสาร',
    en: 'Documentation',
  });

  const secondaryItemsWithClose = useMemo(() => {
    if (!isMobileViewport) {
      return secondaryItems;
    }

    return secondaryItems.map((item) => ({
      ...item,
      onSelect: () => {
        item.onSelect();
        setIsMobileOverlayOpen(false);
      },
    }));
  }, [isMobileViewport, secondaryItems]);

  const renderSidebarBody = (isMobileOverlay: boolean) => (
    <div id="pg-doc-sidebar-body" className={`pg-doc-sidebar-body ${isMobileOverlay ? 'is-mobile-overlay' : ''}`}>
      <div className="pg-doc-sidebar-head">
        <h2>{sidebarTitle}</h2>
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
        sidebarSecondaryItems={secondaryItemsWithClose}
      />
    </div>
  );

  const renderMobileDock = () => (
    <div className={`pg-doc-sidebar-mobile-dock ${isMobileScrolled ? 'is-scrolled' : ''}`}>
      <button
        type="button"
        className={`pg-doc-sidebar-mobile-toggle ${isMobileOverlayOpen ? 'is-open' : ''}`}
        onClick={() => setIsMobileOverlayOpen((previous) => !previous)}
        aria-expanded={isMobileOverlayOpen}
        aria-controls="pg-doc-sidebar-mobile-overlay"
        aria-label={sidebarTitle}
      >
        <span className="pg-doc-sidebar-mobile-icon pg-doc-sidebar-mobile-icon-menu" aria-hidden="true">
          <Menu size={16} />
        </span>
        <span className="pg-doc-sidebar-mobile-icon pg-doc-sidebar-mobile-icon-close" aria-hidden="true">
          <X size={16} />
        </span>
      </button>
    </div>
  );

  return (
    <aside className="pg-doc-shell-sidebar">
      {isMobileViewport ? (
        <>
          {mobileDockHost ? createPortal(renderMobileDock(), mobileDockHost) : null}
          <div className="pg-doc-sidebar-mobile-spacer" aria-hidden="true" />
        </>
      ) : (
        renderSidebarBody(false)
      )}

      {isMobileViewport && isMobileOverlayOpen && typeof document !== 'undefined'
        ? createPortal(
            <>
              <button
                type="button"
                className="pg-doc-sidebar-mobile-backdrop"
                onClick={() => setIsMobileOverlayOpen(false)}
                aria-label={localizeText(language, {
                  th: 'ปิดเอกสาร',
                  en: 'Close documentation',
                })}
              />
              {renderSidebarBody(true)}
            </>,
            document.body
          )
        : null}
    </aside>
  );
}
