import React, { useState } from 'react';
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

  // Clean click outside for mobile menu
  const mobileMenuRef = useClickOutside<HTMLDivElement>(() => setIsMobileMenuOpen(false));

  return (
    <div className={`dashboard-root ${!isSidebarOpen ? 'is-sidebar-closed' : ''}`}>
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        activeRoute={activeRoute}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        menuRef={mobileMenuRef}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
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
