import React, { useState } from 'react';
import { 
  LogOut, 
  MoreHorizontal, 
  PanelLeftOpen, 
  PanelLeftClose, 
} from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { DASHBOARD_ROUTES, SETTINGS_ROUTE } from '../../constants/routes';
import './Topbar.css';

interface TopbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  activeRoute: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleSidebar,
  isSidebarOpen,
  activeRoute,
  onNavigate,
  onSignOut,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setIsMenuOpen(false));

  const isRouteActive = (path: string) => activeRoute === path;

  return (
    <header className="dashboard-topbar">
      <div className="topbar-left">
        <button 
          className="topbar-btn sidebar-toggle" 
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
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
              <span className="nav-label">{route.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="topbar-right">
        {/* Desktop Actions Group (>= 1024px) */}
        <div className="desktop-actions">
          <button 
            className={`topbar-btn ${isRouteActive(SETTINGS_ROUTE.path) ? 'is-active' : ''}`}
            onClick={() => onNavigate(SETTINGS_ROUTE.path)}
            title={SETTINGS_ROUTE.label}
          >
            <SETTINGS_ROUTE.icon size={20} />
            <span className="btn-label">{SETTINGS_ROUTE.label}</span>
          </button>
          
          <button 
            className="topbar-btn is-danger" 
            onClick={onSignOut}
            title="Sign out"
          >
            <LogOut size={20} />
            <span className="btn-label">Sign out</span>
          </button>
        </div>

        {/* Mobile Actions Group (< 1024px) */}
        <div className="mobile-actions" ref={menuRef}>
          <button 
            className={`mobile-trigger ${isMenuOpen ? 'is-open' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="More actions"
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
                <span>{SETTINGS_ROUTE.label}</span>
              </button>
              
              <button 
                className="dropdown-item is-danger" 
                onClick={() => {
                  onSignOut();
                  setIsMenuOpen(false);
                }}
              >
                <LogOut size={18} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
