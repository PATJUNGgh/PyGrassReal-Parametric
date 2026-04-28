import { useCallback, useEffect, useId, useRef, useState } from 'react';
import logoIcon512Avif from '../../assets/logo-icon-512.avif';
import logoIcon768Avif from '../../assets/logo-icon-768.avif';
import logoIcon512Webp from '../../assets/logo-icon-512.webp';
import logoIcon768Webp from '../../assets/logo-icon-768.webp';
import logoIcon512 from '../../assets/logo-icon-512.png';
import logoIcon768 from '../../assets/logo-icon-768.png';
import { localizeText, useLanguage } from '../../i18n/language';
import { TOPBAR_MOBILE_BREAKPOINT } from '../config/constants';
import { isTopbarItemActive, type TopbarNavItem } from '../config/navigation';
import { prefetchPageByPath } from '../config/routes';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { usePageNavigation } from '../navigation/PageNavigationContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { PGButton, type PGButtonVariant } from './PGButton';
import { UserProfileMenu } from './UserProfileMenu';
import '../styles/user-profile-menu.css';

interface TopbarProps {
  items?: TopbarNavItem[];
  isAuthenticated?: boolean;
}

const getVariantFromTone = (tone: TopbarNavItem['tone']): PGButtonVariant => {
  if (tone === 'cta') {
    return 'topnav-cta';
  }

  if (tone === 'plan') {
    return 'topnav-plan';
  }

  return 'topnav';
};

export function Topbar({ items = [], isAuthenticated = false }: TopbarProps) {
  const { language } = useLanguage();
  const { navigate, currentPath } = usePageNavigation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const mobileMenuId = useId();
  const topbarRef = useRef<HTMLElement | null>(null);
  const mobileMenuToggleRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuDialogRef = useRef<HTMLDivElement | null>(null);
  const firstMobileMenuItemRef = useRef<HTMLButtonElement | null>(null);

  const closeMobileMenu = useCallback((restoreFocus: boolean) => {
    setIsMobileMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => {
        mobileMenuToggleRef.current?.focus();
      });
    }
  }, []);

  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const handlePrefetch = (path: string, trigger: 'hover' | 'focus', source: string) => {
    prefetchPageByPath(path, {
      trigger,
      source,
    });
  };
  const topbarNavLabel = localizeText(language, {
    th: 'เมนูหลัก',
    en: 'Main navigation',
  });
  const mobileNavLabel = localizeText(language, {
    th: 'เมนูนำทางมือถือ',
    en: 'Mobile navigation',
  });
  const mobileToggleLabel = localizeText(language, {
    th: isMobileMenuOpen ? 'ปิดเมนูนำทาง' : 'เปิดเมนูนำทาง',
    en: isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu',
  });

  useFocusTrap({
    isActive: isMobileMenuOpen,
    containerRef: mobileMenuDialogRef,
    initialFocusRef: firstMobileMenuItemRef,
    onEscape: () => closeMobileMenu(true),
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > TOPBAR_MOBILE_BREAKPOINT) {
        closeMobileMenu(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [closeMobileMenu]);

  useEffect(() => {
    const topbarElement = topbarRef.current;
    const scrollHost = topbarElement?.closest('.pg-page');
    const resolveScrollOffset = () => {
      if (scrollHost instanceof HTMLElement) {
        return scrollHost.scrollTop;
      }

      return window.scrollY || document.documentElement.scrollTop || 0;
    };
    const syncScrolledState = () => {
      setIsScrolled(resolveScrollOffset() > 8);
    };

    syncScrolledState();

    if (scrollHost instanceof HTMLElement) {
      scrollHost.addEventListener('scroll', syncScrolledState, { passive: true });
      return () => {
        scrollHost.removeEventListener('scroll', syncScrolledState);
      };
    }

    window.addEventListener('scroll', syncScrolledState, { passive: true });
    return () => {
      window.removeEventListener('scroll', syncScrolledState);
    };
  }, []);

  return (
    <header
      ref={topbarRef}
      className={`pg-topbar ${isMobileMenuOpen ? 'is-mobile-open' : ''} ${isScrolled ? 'is-scrolled' : ''}`}
    >
      <div className="pg-topbar-head">
        <button
          type="button"
          className="pg-brand"
          onClick={() => {
            closeMobileMenu(false);
            navigate('/', { source: 'topbar.brand' });
          }}
        >
          <picture>
            <source
              type="image/avif"
              srcSet={`${logoIcon512Avif} 512w, ${logoIcon768Avif} 768w`}
              sizes="(max-width: 560px) 76px, 90px"
            />
            <source
              type="image/webp"
              srcSet={`${logoIcon512Webp} 512w, ${logoIcon768Webp} 768w`}
              sizes="(max-width: 560px) 76px, 90px"
            />
            <img
              src={logoIcon768}
              srcSet={`${logoIcon512} 512w, ${logoIcon768} 768w`}
              sizes="(max-width: 560px) 76px, 90px"
              alt="PyGrassReal-Ai Logo"
              className="pg-brand-logo"
              width={90}
              height={46}
              decoding="async"
            />
          </picture>
          <span className="pg-brand-text">PyGrassReal-Ai</span>
        </button>

        <div className="pg-topbar-right">
          <div className="pg-topbar-utilities">
            <LanguageSwitcher />
            {isAuthenticated && <UserProfileMenu />}
            {items.length > 0 ? (
              <button
                ref={mobileMenuToggleRef}
                type="button"
                className={`pg-mobile-menu-toggle ${isMobileMenuOpen ? 'is-open' : ''}`}
                onClick={() => {
                  if (isMobileMenuOpen) {
                    closeMobileMenu(true);
                    return;
                  }
                  openMobileMenu();
                }}
                aria-expanded={isMobileMenuOpen}
                aria-controls={mobileMenuId}
                aria-haspopup="dialog"
                aria-label={mobileToggleLabel}
              >
                <span className="pg-mobile-menu-icon" aria-hidden="true">
                  <span className="pg-mobile-menu-icon-line" />
                  <span className="pg-mobile-menu-icon-line" />
                  <span className="pg-mobile-menu-icon-line" />
                </span>
              </button>
            ) : null}
          </div>

          {items.length > 0 ? (
            <nav className="pg-topnav pg-topnav-desktop" aria-label={topbarNavLabel}>
              {items.map((item) => {
                const isActive = isTopbarItemActive(currentPath, item);
                return (
                  <PGButton
                    key={item.path}
                    type="button"
                    variant={getVariantFromTone(item.tone)}
                    isActive={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => navigate(item.path, { source: 'topbar.desktop.nav' })}
                    onMouseEnter={() => handlePrefetch(item.path, 'hover', 'topbar.desktop')}
                    onFocus={() => handlePrefetch(item.path, 'focus', 'topbar.desktop')}
                  >
                    {item.label}
                  </PGButton>
                );
              })}
            </nav>
          ) : null}
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div
          className="pg-mobile-menu-backdrop"
          onClick={() => closeMobileMenu(true)}
          aria-hidden="true"
        />
      ) : null}

      {items.length > 0 ? (
        <div
          ref={mobileMenuDialogRef}
          id={mobileMenuId}
          className={`pg-topnav-mobile ${isMobileMenuOpen ? 'is-open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-hidden={!isMobileMenuOpen}
          aria-label={mobileNavLabel}
        >
          <nav className="pg-topnav-mobile-list" aria-label={mobileNavLabel}>
            {items.map((item, index) => {
              const isActive = isTopbarItemActive(currentPath, item);
              return (
                <PGButton
                  key={`mobile-${item.path}`}
                  ref={index === 0 ? firstMobileMenuItemRef : undefined}
                  type="button"
                  variant="topnav-mobile"
                  isActive={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    navigate(item.path, { source: 'topbar.mobile.nav' });
                    closeMobileMenu(true);
                  }}
                  onMouseEnter={() => handlePrefetch(item.path, 'hover', 'topbar.mobile')}
                  onFocus={() => handlePrefetch(item.path, 'focus', 'topbar.mobile')}
                >
                  {item.label}
                </PGButton>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
