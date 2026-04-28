import { localizeText, type LanguageCode, type LocalizedText } from '../../i18n/language';

export type TopNavRoute =
  | '/'
  | '/about'
  | '/docs'
  | '/developer'
  | '/pricing?from=home'
  | '/legal/terms'
  | '/dashboard'
  | '/pricing'
  | '/editor'
  | '/auth/login';

export type TopNavMenu = 'landing' | 'about' | 'docs' | 'legal';
export type TopNavTone = 'default' | 'plan' | 'cta';
export type TopNavMatch = 'exact' | 'prefix';

interface TopNavItemDefinition {
  path: TopNavRoute;
  label: LocalizedText;
  tone?: TopNavTone;
  match?: TopNavMatch;
  activePath?: string;
  activePaths?: readonly string[];
}

export interface TopbarNavItem {
  path: TopNavRoute;
  label: string;
  tone: TopNavTone;
  match: TopNavMatch;
  activePath?: string;
  activePaths?: readonly string[];
}

const DOCUMENTATION_ACTIVE_PATHS = [
  '/about',
  '/docs',
  '/developer',
  '/integration-extension',
  '/legal',
] as const;

const DOCUMENTATION_NAV_ITEM: TopNavItemDefinition = {
  path: '/docs',
  label: { th: 'เอกสาร', en: 'Documentation' },
  match: 'prefix',
  activePaths: DOCUMENTATION_ACTIVE_PATHS,
};

const LANDING_NAV_ITEMS: readonly TopNavItemDefinition[] = [
  {
    path: '/',
    label: { th: 'หน้าแรก', en: 'Home' },
  },
  DOCUMENTATION_NAV_ITEM,
  {
    path: '/pricing?from=home',
    label: { th: 'อัปเกรดแพ็กเกจ', en: 'Upgrade plan' },
    tone: 'plan',
    match: 'prefix',
    activePath: '/pricing',
  },
  {
    path: '/auth/login',
    label: { th: 'เข้าสู่ระบบ', en: 'Sign in' },
    tone: 'cta',
    match: 'prefix',
  },
];

const ABOUT_NAV_ITEMS: readonly TopNavItemDefinition[] = [];

const DOCS_NAV_ITEMS: readonly TopNavItemDefinition[] = [];

const LEGAL_NAV_ITEMS: readonly TopNavItemDefinition[] = [
  {
    path: '/legal/terms',
    label: { th: 'กฎหมาย', en: 'Legal' },
    match: 'prefix',
    activePath: '/legal',
  },
  DOCUMENTATION_NAV_ITEM,
  {
    path: '/pricing',
    label: { th: 'ราคา', en: 'Pricing' },
    match: 'prefix',
  },
  {
    path: '/auth/login',
    label: { th: 'เข้าสู่ระบบ', en: 'Sign in' },
    tone: 'cta',
    match: 'prefix',
  },
];

const TOP_NAV_BY_MENU: Record<TopNavMenu, readonly TopNavItemDefinition[]> = {
  landing: LANDING_NAV_ITEMS,
  about: ABOUT_NAV_ITEMS,
  docs: DOCS_NAV_ITEMS,
  legal: LEGAL_NAV_ITEMS,
};

export const getTopbarNavigation = (
  menu: TopNavMenu,
  language: LanguageCode,
  isAuthenticated = false
): TopbarNavItem[] => {
  const baseItems =
    menu === 'legal'
      ? TOP_NAV_BY_MENU[menu].filter((item) => item.path !== '/legal/terms')
      : TOP_NAV_BY_MENU[menu];

  const items = isAuthenticated
    ? baseItems.filter((item) => item.path !== '/auth/login')
    : baseItems;

  return items.map((item) => ({
    path: item.path,
    label: localizeText(language, item.label),
    tone: item.tone ?? 'default',
    match: item.match ?? 'exact',
    activePath: item.activePath,
    activePaths: item.activePaths,
  }));
};

export const isTopbarItemActive = (
  currentPath: string,
  item: Pick<TopbarNavItem, 'path' | 'match' | 'activePath' | 'activePaths'>
): boolean => {
  const pathsToMatch = item.activePaths?.length ? item.activePaths : [item.activePath ?? item.path];

  return pathsToMatch.some((pathToMatch) => {
    if (item.match === 'prefix') {
      return currentPath === pathToMatch || currentPath.startsWith(`${pathToMatch}/`);
    }

    return currentPath === pathToMatch;
  });
};
