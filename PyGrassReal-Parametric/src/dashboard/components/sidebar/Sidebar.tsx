import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import React, { useCallback } from 'react';
import { DASHBOARD_ROUTES } from '../../constants/routes';
import { localizeText, useLanguage, type LocalizedText } from '../../../i18n/language';
import { DASHBOARD_UI, TOPBAR_UI } from '../../data/dashboardData';
import { useProfile } from '../../../auth/hooks/useProfile';
import { UserProfileButton } from './UserProfileButton';
import { hasPlatformRevenueAccess } from '../../utils/platformRevenueAccess';

import logoIcon from '../../../assets/logo-icon-768.png';

export type DashboardRoute =
  | '/dashboard'
  | '/dashboard/chat'
  | '/dashboard/api'
  | '/dashboard/usage'
  | '/dashboard/ranking'
  | '/dashboard/benchmark'
  | '/dashboard/revenue'
  | '/dashboard/settings';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeRoute: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

interface SidebarNavItemProps {
  icon: React.ElementType;
  label: LocalizedText;
  isActive: boolean;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}

const SidebarNavItem = React.memo(({
  icon: Icon, label, isActive, onClick, title, danger
}: SidebarNavItemProps) => {
  const { language } = useLanguage();
  const labelText = localizeText(language, label);
  return (
    <button
      type="button"
      className={`dashboard-sidebar-btn ${isActive ? 'is-active' : ''} ${danger ? 'is-danger' : ''}`}
      onClick={onClick}
      title={title || labelText}
    >
      <Icon size={18} />
      <span className="sidebar-label">{labelText}</span>
    </button>
  );
});

SidebarNavItem.displayName = 'SidebarNavItem';

export const Sidebar = React.memo(({
  isOpen,
  onToggle,
  activeRoute,
  onNavigate,
  onSignOut,
}: SidebarProps) => {
  const { language } = useLanguage();
  const { displayName, email, avatarUrl, isLoading } = useProfile();
  
  const handleNavClick = useCallback((path: string) => {
    onNavigate(path);
  }, [onNavigate]);
  const handleHomeClick = useCallback(() => {
    onNavigate('/');
  }, [onNavigate]);

  const isRouteActive = (path: string) => activeRoute === path;
  const visibleRoutes = DASHBOARD_ROUTES.filter((route) => (
    route.path !== '/dashboard/revenue' || hasPlatformRevenueAccess(email)
  ));

  const toggleLabel = isOpen 
    ? localizeText(language, DASHBOARD_UI.collapse) 
    : localizeText(language, TOPBAR_UI.openSidebar);

  return (
    <aside className={`dashboard-sidebar ${!isOpen ? 'is-closed' : ''}`}>
      <div className="dashboard-sidebar-logo-wrapper">
        <button
          type="button"
          className="dashboard-sidebar-logo-button"
          onClick={handleHomeClick}
          title={localizeText(language, { th: 'หน้าแรก', en: 'Home' })}
          aria-label={localizeText(language, { th: 'ไปหน้าแรก', en: 'Go to home' })}
        >
          <img src={logoIcon} alt="PyGrassReal-Ai Logo" className="dashboard-sidebar-logo" />
        </button>
      </div>
      <nav className="dashboard-nav">
        <button
          type="button"
          className="dashboard-sidebar-btn dashboard-sidebar-toggle"
          onClick={onToggle}
          title={isOpen ? localizeText(language, TOPBAR_UI.closeSidebar) : localizeText(language, TOPBAR_UI.openSidebar)}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? (
            <>
              <PanelLeftClose size={18} />
              <span className="sidebar-label">{toggleLabel}</span>
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

        {visibleRoutes.map((route) => (
          <SidebarNavItem
            key={route.path}
            icon={route.icon}
            label={route.label}
            isActive={isRouteActive(route.path)}
            onClick={() => handleNavClick(route.path)}
          />
        ))}
      </nav>

      <div className="dashboard-sidebar-footer">
        <UserProfileButton
          displayName={displayName}
          email={email}
          avatarUrl={avatarUrl}
          isLoading={isLoading}
          onSignOut={onSignOut}
          onNavigate={onNavigate}
          activeRoute={activeRoute}
        />
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
