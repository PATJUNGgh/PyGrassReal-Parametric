import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import React from 'react';
import { DASHBOARD_ROUTES, SETTINGS_ROUTE } from '../../constants/routes';

import logoIcon from '../../../assets/logo-icon.png';

export type DashboardRoute = '/dashboard' | '/dashboard/chat' | '/dashboard/settings';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeRoute: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  activeRoute,
  onNavigate,
  onSignOut,
}) => {
  const isRouteActive = (path: string) => activeRoute === path;

  return (
    <aside className={`dashboard-sidebar ${!isOpen ? 'is-closed' : ''}`}>
      <div className="dashboard-sidebar-logo-wrapper">
        <img src={logoIcon} alt="PyGrassReal Logo" className="dashboard-sidebar-logo" />
      </div>
      <nav className="dashboard-nav">
        <button
          type="button"
          className="dashboard-sidebar-btn dashboard-sidebar-toggle"
          onClick={onToggle}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? (
            <>
              <PanelLeftClose size={18} />
              <span className="sidebar-label">Collapse</span>
            </>
          ) : (
            <span className="sidebar-toggle-collapsed-content" aria-hidden="true">
              <span className="sidebar-toggle-visual-layer">
                <img src={logoIcon} alt="" className="sidebar-toggle-logo" />
                <span className="sidebar-toggle-expand-icon">
                  <PanelLeftOpen size={20} />
                </span>
              </span>
            </span>
          )}
        </button>

        {DASHBOARD_ROUTES.map((route) => (
          <button
            key={route.path}
            type="button"
            className={`dashboard-sidebar-btn ${isRouteActive(route.path) ? 'is-active' : ''}`}
            onClick={() => onNavigate(route.path)}
            title={route.label}
          >
            <route.icon size={18} />
            <span className="sidebar-label">{route.label}</span>
          </button>
        ))}
      </nav>

      <div className="dashboard-sidebar-footer">
        <button
          type="button"
          className={`dashboard-sidebar-btn ${isRouteActive(SETTINGS_ROUTE.path) ? 'is-active' : ''}`}
          onClick={() => onNavigate(SETTINGS_ROUTE.path)}
          title={SETTINGS_ROUTE.label}
        >
          <SETTINGS_ROUTE.icon size={18} />
          <span className="sidebar-label">{SETTINGS_ROUTE.label}</span>
        </button>

        <button
          type="button"
          className="dashboard-sidebar-btn is-danger"
          onClick={onSignOut}
          title="Sign out"
        >
          <LogOut size={18} />
          <span className="sidebar-label">Sign out</span>
        </button>
      </div>
    </aside>
  );
};

