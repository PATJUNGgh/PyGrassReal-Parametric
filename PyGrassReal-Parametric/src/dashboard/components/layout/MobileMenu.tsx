import React from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { DASHBOARD_ROUTES, SETTINGS_ROUTE } from '../../constants/routes';

interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  activeRoute: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onToggle,
  activeRoute,
  onNavigate,
  onSignOut,
  menuRef,
}) => {
  const isRouteActive = (path: string) => activeRoute === path;

  return (
    <div className="mobile-menu-container" ref={menuRef}>
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
              <span>{route.label}</span>
            </button>
          ))}

          <div className="mobile-menu-divider" />

          <button
            className={`mobile-menu-item ${isRouteActive(SETTINGS_ROUTE.path) ? 'is-active' : ''}`}
            onClick={() => onNavigate(SETTINGS_ROUTE.path)}
            type="button"
          >
            <SETTINGS_ROUTE.icon size={18} />
            <span>{SETTINGS_ROUTE.label}</span>
          </button>

          <button
            className="mobile-menu-item is-danger"
            onClick={onSignOut}
            type="button"
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
};
