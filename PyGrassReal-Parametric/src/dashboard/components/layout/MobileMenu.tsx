import React from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { DASHBOARD_ROUTES, SETTINGS_ROUTE } from '../../constants/routes';
import { localizeText, useLanguage } from '../../../i18n/language';
import { TOPBAR_UI } from '../../data/dashboardData';
import logoIcon from '../../../assets/logo-icon-768.png';

interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  activeRoute: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

export const MobileMenu = React.memo(({
  isOpen,
  onToggle,
  activeRoute,
  onNavigate,
  onSignOut,
  menuRef,
}: MobileMenuProps) => {
  const { language } = useLanguage();
  const isRouteActive = (path: string) => activeRoute === path;

  return (
    <div className="mobile-menu-container" ref={menuRef}>
      <div className="mobile-menu-dock">
        <button
          className="mobile-menu-trigger"
          onClick={onToggle}
          aria-label="Toggle menu"
          type="button"
        >
          {isOpen ? (
            <X className="mobile-trigger-icon" size={32} strokeWidth={2.5} />
          ) : (
            <Menu className="mobile-trigger-icon" size={32} strokeWidth={2.5} />
          )}
        </button>

        <button
          type="button"
          className="mobile-menu-logo-button"
          onClick={() => onNavigate('/')}
          aria-label={localizeText(language, { th: 'ไปหน้าแรก', en: 'Go to home' })}
          title={localizeText(language, { th: 'หน้าแรก', en: 'Home' })}
        >
          <img src={logoIcon} alt="PyGrassReal-Ai" className="mobile-menu-logo" />
        </button>
      </div>

      {isOpen && (
        <div className="mobile-dropdown-menu">
          {DASHBOARD_ROUTES.map((route) => (
            <button
              key={route.path}
              className={`mobile-menu-item ${isRouteActive(route.path) ? 'is-active' : ''}`}
              onClick={() => onNavigate(route.path)}
              type="button"
            >
              <route.icon size={18} />
              <span>{localizeText(language, route.label)}</span>
            </button>
          ))}

          <div className="mobile-menu-divider" />

          <button
            className={`mobile-menu-item ${isRouteActive(SETTINGS_ROUTE.path) ? 'is-active' : ''}`}
            onClick={() => onNavigate(SETTINGS_ROUTE.path)}
            type="button"
          >
            <SETTINGS_ROUTE.icon size={18} />
            <span>{localizeText(language, SETTINGS_ROUTE.label)}</span>
          </button>

          <button
            className="mobile-menu-item is-danger"
            onClick={onSignOut}
            type="button"
          >
            <LogOut size={18} />
            <span>{localizeText(language, TOPBAR_UI.signOut)}</span>
          </button>
        </div>
      )}
    </div>
  );
});

MobileMenu.displayName = 'MobileMenu';
