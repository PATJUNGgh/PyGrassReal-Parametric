import React, { useState } from 'react';
import { 
  LogOut, 
  MoreHorizontal, 
  PanelLeftOpen, 
  PanelLeftClose, 
} from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { DASHBOARD_ROUTES, SETTINGS_ROUTE } from '../../constants/routes';
import { localizeText, useLanguage } from '../../../i18n/language';
import { TOPBAR_UI } from '../../data/dashboardData';
import './Topbar.css';

interface TopbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  activeRoute: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

export const Topbar = React.memo(({
  onToggleSidebar,
  isSidebarOpen,
  activeRoute,
  onNavigate,
  onSignOut,
}: TopbarProps) => {
  const { language } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setIsMenuOpen(false));

  const isRouteActive = (path: string) => activeRoute === path;

  const renderDesktopActions = () => (
    <div className="desktop-actions">
      <button 
        className={`topbar-btn ${isRouteActive(SETTINGS_ROUTE.path) ? 'is-active' : ''}`}
        onClick={() => onNavigate(SETTINGS_ROUTE.path)}
        title={localizeText(language, SETTINGS_ROUTE.label)}
      >
        <SETTINGS_ROUTE.icon size={20} />
        <span className="btn-label">{localizeText(language, SETTINGS_ROUTE.label)}</span>
      </button>
      
      <button 
        className="topbar-btn is-danger" 
        onClick={onSignOut}
        title={localizeText(language, TOPBAR_UI.signOut)}
      >
        <LogOut size={20} />
        <span className="btn-label">{localizeText(language, TOPBAR_UI.signOut)}</span>
      </button>
    </div>
  );

  const renderMobileActions = () => (
    <div className="mobile-actions" ref={menuRef}>
      <button 
        className={`mobile-trigger ${isMenuOpen ? 'is-open' : ''}`}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        title={localizeText(language, TOPBAR_UI.moreActions)}
      >
        <MoreHorizontal size={24} />
      </button>

      {isMenuOpen && (
        <div className="topbar-dropdown">
          <button 
            className={`dropdown-item ${isRouteActive(SETTINGS_ROUTE.path) ? 'is-active' : ''}`}
            onClick={() => {
              onNavigate(SETTINGS_ROUTE.path);
              setIsMenuOpen(false);
            }}
          >
            <SETTINGS_ROUTE.icon size={18} />
            <span>{localizeText(language, SETTINGS_ROUTE.label)}</span>
          </button>
          
          <button 
            className="dropdown-item is-danger" 
            onClick={() => {
              onSignOut();
              setIsMenuOpen(false);
            }}
          >
            <LogOut size={18} />
            <span>{localizeText(language, TOPBAR_UI.signOut)}</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <header className="dashboard-topbar">
      <div className="topbar-left">
        <button 
          className="topbar-btn sidebar-toggle" 
          onClick={onToggleSidebar}
          title={isSidebarOpen ? localizeText(language, TOPBAR_UI.closeSidebar) : localizeText(language, TOPBAR_UI.openSidebar)}
        >
          {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>

        <div className="topbar-nav">
          {DASHBOARD_ROUTES.map((route) => (
            <button 
              key={route.path}
              className={`topbar-nav-item ${isRouteActive(route.path) ? 'is-active' : ''}`}
              onClick={() => onNavigate(route.path)}
            >
              <route.icon size={18} />
              <span className="nav-label">{localizeText(language, route.label)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="topbar-right">
        {renderDesktopActions()}
        {renderMobileActions()}
      </div>
    </header>
  );
});

Topbar.displayName = 'Topbar';
