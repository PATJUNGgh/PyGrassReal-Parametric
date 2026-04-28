import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { MobileMenu } from './components/layout/MobileMenu';
import { useClickOutside } from './hooks/useClickOutside';
import './dashboard.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeRoute: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeRoute,
  onNavigate,
  onSignOut,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  // Clean click outside for mobile menu
  const mobileMenuRef = useClickOutside<HTMLDivElement>(closeMobileMenu);

  return (
    <div className={`dashboard-root ${!isSidebarOpen ? 'is-sidebar-closed' : ''}`}>
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onToggle={toggleMobileMenu}
        activeRoute={activeRoute}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        menuRef={mobileMenuRef}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        activeRoute={activeRoute}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
      />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
};
