import { LayoutDashboard, MessageSquare, Settings } from 'lucide-react';

export interface RouteItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export const DASHBOARD_ROUTES: RouteItem[] = [
  {
    path: '/dashboard',
    label: '3D-Edit',
    icon: LayoutDashboard,
  },
  {
    path: '/dashboard/chat',
    label: 'AI Assistant',
    icon: MessageSquare,
  },
];

export const SETTINGS_ROUTE: RouteItem = {
  path: '/dashboard/settings',
  label: 'Settings',
  icon: Settings,
};
