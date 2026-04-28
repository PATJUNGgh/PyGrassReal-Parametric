import { Activity, BarChart3, DollarSign, KeyRound, LayoutDashboard, MessageSquare, Settings, Trophy } from 'lucide-react';
import type { LocalizedText } from '../../i18n/language';

export interface RouteItem {
  path: string;
  label: LocalizedText;
  icon: typeof LayoutDashboard;
}

export const DASHBOARD_ROUTES: RouteItem[] = [
  {
    path: '/dashboard',
    label: { th: '3D-Edit', en: '3D-Edit' },
    icon: LayoutDashboard,
  },
  {
    path: '/dashboard/chat',
    label: { th: 'AI ผู้ช่วย', en: 'AI Assistant' },
    icon: MessageSquare,
  },
  {
    path: '/dashboard/api',
    label: { th: 'API Management', en: 'API Management' },
    icon: KeyRound,
  },
  {
    path: '/dashboard/usage',
    label: { th: 'Analytics', en: 'Analytics' },
    icon: Activity,
  },
  {
    path: '/dashboard/ranking',
    label: { th: 'อันดับ (Ranking)', en: 'Ranking' },
    icon: Trophy,
  },
  {
    path: '/dashboard/benchmark',
    label: { th: 'Benchmark', en: 'Benchmark' },
    icon: BarChart3,
  },
  {
    path: '/dashboard/revenue',
    label: { th: 'รายรับ', en: 'Revenue' },
    icon: DollarSign,
  },
];

export const SETTINGS_ROUTE: RouteItem = {
  path: '/dashboard/settings',
  label: { th: 'ตั้งค่า', en: 'Settings' },
  icon: Settings,
};
