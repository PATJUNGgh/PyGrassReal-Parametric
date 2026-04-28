import { ArrowLeft, Eye, EyeOff, LayoutDashboard, ShieldQuestion, UserRoundPlus } from 'lucide-react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactElement } from 'react';
import Editor from './3d-edit/Editor';
import { ApiManagementPage } from './dashboard/ApiManagementPage';
import { UsagePage } from './dashboard/UsagePage';
import { ChatAssistantPage } from './dashboard/ChatAssistantPage';
import { DashboardLayout } from './dashboard/DashboardLayout';
import DashboardPage from './dashboard/DashboardPage';
import { RankingPage } from './dashboard/RankingPage';
import { BenchmarkPage } from './dashboard/BenchmarkPage';
import { PlatformRevenuePage } from './dashboard/PlatformRevenuePage';
import { SettingsPage } from './dashboard/SettingsPage';
import { hasPlatformRevenueAccess } from './dashboard/utils/platformRevenueAccess';
import {
  getCurrentAuthSession,
  signOut as signOutAuth,
  subscribeToAuthSessionChange,
} from './auth/services/auth.api';
import { localizeText, useLanguage } from './i18n/language';
import { PAGE_COMPONENTS } from './pages/config/routes';
import { LEGAL_ROUTE_PATHS, type LegalRoutePath } from './pages/legal/legalNavigation';
import { getPerformanceNow, TELEMETRY_EVENT, telemetry } from './pages/telemetry/telemetry';
import { useSEO } from './pages/components/hooks/useSEO';
import './app-shell.css';
import type { Workflow } from './dashboard/types/workflow.types';

const {
  AboutPage,
  DocsPage,
  DeveloperPage,
  IntegrationExtensionPage,
  LandingPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  PricingPage,
  CheckoutPage,
  PricingSuccessPage,
  PricingCancelPage,
  TermsOfService,
  PrivacyPolicy,
  AcceptableUsePolicy,
  AIUsePolicy,
  Contact,
} = PAGE_COMPONENTS;

type AppRoute =
  | '/'
  | '/about'
  | '/docs'
  | '/developer'
  | '/integration-extension'
  | '/dashboard'
  | '/dashboard/chat'
  | '/dashboard/api'
  | '/dashboard/usage'
  | '/dashboard/ranking'
  | '/dashboard/benchmark'
  | '/dashboard/revenue'
  | '/dashboard/settings'
  | '/pricing'
  | '/pricing/checkout'
  | '/pricing/success'
  | '/pricing/cancel'
  | '/editor'
  | '/auth/login'
  | '/auth/register'
  | '/auth/forgot'
  | LegalRoutePath;

const DEFAULT_ROUTE: AppRoute = '/';
const SWITCHER_HIDDEN_KEY = 'pygrass-route-switcher-hidden';
const SHOW_DEV_SWITCHER = true;
const LEGAL_ROUTE_SET = new Set<string>(LEGAL_ROUTE_PATHS);
const AUTH_ROUTE_SET = new Set<AppRoute>(['/auth/login', '/auth/register', '/auth/forgot']);
const PROTECTED_ROUTE_SET = new Set<AppRoute>([
  '/dashboard',
  '/dashboard/chat',
  '/dashboard/api',
  '/dashboard/usage',
  '/dashboard/ranking',
  '/dashboard/benchmark',
  '/dashboard/revenue',
  '/dashboard/settings',
  '/pricing/checkout',
  '/pricing/success',
  '/pricing/cancel',
]);
const GLOBAL_TOAST_TIMEOUT_MS = 3200;

type InteractionLatencyId = 'open_3d_editor' | 'open_dashboard';

interface InteractionLatencyTracker {
  interactionId: InteractionLatencyId;
  targetRoute: AppRoute;
  startedAtMs: number;
  source: string;
  fromPath: AppRoute;
}

type GlobalToastTone = 'success' | 'error';

interface GlobalToast {
  id: string;
  message: string;
  tone: GlobalToastTone;
}

interface AppHistoryState {
  preserveScroll?: boolean;
  scrollX?: number;
  scrollY?: number;
  pageScrollLeft?: number;
  pageScrollTop?: number;
  fromPath?: AppRoute;
  toPath?: AppRoute;
}

const runWithViewTransition = (update: () => void) => {
  update();
};

const isLegalSubRoute = (path: string): boolean => path.startsWith('/legal/');

const getPageScrollPosition = (): { left: number; top: number } => {
  const pageElement = document.querySelector<HTMLElement>('.pg-page');
  if (!pageElement) {
    return {
      left: window.scrollX,
      top: window.scrollY,
    };
  }

  return {
    left: pageElement.scrollLeft,
    top: pageElement.scrollTop,
  };
};

const isAppRoute = (path: string): path is AppRoute => {
  return (
    path === '/' ||
    path === '/about' ||
    path === '/docs' ||
    path === '/developer' ||
    path === '/integration-extension' ||
    path === '/dashboard' ||
    path === '/dashboard/chat' ||
    path === '/dashboard/api' ||
    path === '/dashboard/usage' ||
    path === '/dashboard/ranking' ||
    path === '/dashboard/benchmark' ||
    path === '/dashboard/revenue' ||
    path === '/dashboard/settings' ||
    path === '/pricing' ||
    path === '/pricing/checkout' ||
    path === '/pricing/success' ||
    path === '/pricing/cancel' ||
    path === '/editor' ||
    path === '/auth/login' ||
    path === '/auth/register' ||
    path === '/auth/forgot' ||
    LEGAL_ROUTE_SET.has(path)
  );
};

const extractPathname = (path: string): string => {
  try {
    const parsed = new URL(path, window.location.origin);
    return parsed.pathname || '/';
  } catch {
    const [pathname] = path.split(/[?#]/, 1);
    return pathname || '/';
  }
};

const buildRouteUrl = (target: string, normalizedRoute: AppRoute): string => {
  try {
    const parsed = new URL(target, window.location.origin);
    if (parsed.pathname !== normalizedRoute) {
      return normalizedRoute;
    }
    return `${normalizedRoute}${parsed.search}${parsed.hash}`;
  } catch {
    return normalizedRoute;
  }
};

const normalizeRoute = (path: string): AppRoute => {
  const pathname = extractPathname(path);
  if (pathname === '/' || pathname === '') {
    return '/';
  }

  if (isAppRoute(pathname)) {
    return pathname;
  }

  return DEFAULT_ROUTE;
};

const getInteractionLatencyId = (route: AppRoute): InteractionLatencyId | null => {
  if (route === '/editor') {
    return 'open_3d_editor';
  }

  if (
    route === '/dashboard' ||
    route === '/dashboard/chat' ||
    route === '/dashboard/api' ||
    route === '/dashboard/usage' ||
    route === '/dashboard/ranking' ||
    route === '/dashboard/benchmark' ||
    route === '/dashboard/revenue' ||
    route === '/dashboard/settings'
  ) {
    return 'open_dashboard';
  }

  return null;
};

const resolveNextRouteAfterAuth = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  const nextRaw = params.get('next');
  if (!nextRaw) {
    return null;
  }

  try {
    const parsed = new URL(nextRaw, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return null;
    }

    const normalized = normalizeRoute(parsed.pathname);
    if (normalized !== parsed.pathname) {
      return null;
    }

    return `${normalized}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

const buildLoginRedirectWithNext = (): string => {
  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/auth/login?next=${encodeURIComponent(next)}`;
};

function App() {
  const { language } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [isSwitcherHidden, setIsSwitcherHidden] = useState<boolean>(() => {
    return window.localStorage.getItem(SWITCHER_HIDDEN_KEY) === '1';
  });
  const [route, setRoute] = useState<AppRoute>(() => normalizeRoute(window.location.pathname));
  const routeRef = useRef<AppRoute>(route);
  const [, setLocationVersion] = useState(0);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [globalToasts, setGlobalToasts] = useState<GlobalToast[]>([]);
  const pendingInteractionRef = useRef<InteractionLatencyTracker | null>(null);
  const globalToastTimersRef = useRef<Map<string, number>>(new Map());

  // Update ref whenever route changes
  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  // Ensure global CSP and SEO metadata for all routes
  useSEO({
    resolvedPath: route,
  });

  const navigate = useCallback((nextPath: string, options?: { replace?: boolean; source?: string }) => {
    const nextRoute = normalizeRoute(nextPath);
    const nextUrl = buildRouteUrl(nextPath, nextRoute);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const fromRoute = routeRef.current;
    const shouldPreserveScroll = isLegalSubRoute(fromRoute) && isLegalSubRoute(nextRoute);
    const pageScrollPosition = getPageScrollPosition();
    const nextHistoryState: AppHistoryState | null = shouldPreserveScroll
      ? {
          preserveScroll: true,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          pageScrollLeft: pageScrollPosition.left,
          pageScrollTop: pageScrollPosition.top,
          fromPath: fromRoute,
          toPath: nextRoute,
        }
      : null;
    let shouldBumpLocationVersion = false;

    const interactionId = getInteractionLatencyId(nextRoute);
    if (interactionId && currentUrl !== nextUrl) {
      pendingInteractionRef.current = {
        interactionId,
        targetRoute: nextRoute,
        startedAtMs: getPerformanceNow(),
        source: options?.source ?? 'app.navigate',
        fromPath: routeRef.current,
      };
    }

    if (currentUrl !== nextUrl) {
      if (options?.replace) {
        window.history.replaceState(nextHistoryState, '', nextUrl);
      } else {
        window.history.pushState(nextHistoryState, '', nextUrl);
      }
      shouldBumpLocationVersion = true;
    } else if (options?.replace) {
      window.history.replaceState(nextHistoryState, '', nextUrl);
      shouldBumpLocationVersion = true;
    }

    runWithViewTransition(() => {
      setRoute(nextRoute);
      if (shouldBumpLocationVersion) {
        setLocationVersion((version) => version + 1);
      }
    });
  }, []);

  const removeGlobalToast = useCallback((id: string) => {
    const timerId = globalToastTimersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      globalToastTimersRef.current.delete(id);
    }
    setGlobalToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushGlobalToast = useCallback((message: string, tone: GlobalToastTone = 'error') => {
    if (!message.trim()) {
      return;
    }

    const id = crypto.randomUUID?.() ?? `toast-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    setGlobalToasts((prev) => {
      const next = [...prev, { id, tone, message }];
      if (next.length <= 4) {
        return next;
      }

      const [removed, ...rest] = next;
      const removedTimer = globalToastTimersRef.current.get(removed.id);
      if (removedTimer) {
        window.clearTimeout(removedTimer);
      }
      globalToastTimersRef.current.delete(removed.id);
      return rest;
    });

    const timeoutId = window.setTimeout(() => {
      removeGlobalToast(id);
    }, GLOBAL_TOAST_TIMEOUT_MS);
    globalToastTimersRef.current.set(id, timeoutId);
  }, [removeGlobalToast]);

  useEffect(() => {
    const timerMap = globalToastTimersRef.current;
    return () => {
      timerMap.forEach((timerId) => window.clearTimeout(timerId));
      timerMap.clear();
    };
  }, []);

  useEffect(() => {
    const pendingInteraction = pendingInteractionRef.current;
    if (!pendingInteraction || pendingInteraction.targetRoute !== route) {
      return;
    }

    pendingInteractionRef.current = null;
    const frameId = window.requestAnimationFrame(() => {
      const durationMs = Number((getPerformanceNow() - pendingInteraction.startedAtMs).toFixed(2));
      telemetry.info(TELEMETRY_EVENT.INTERACTION_LATENCY, {
        interactionId: pendingInteraction.interactionId,
        targetRoute: route,
        fromPath: pendingInteraction.fromPath,
        source: pendingInteraction.source,
        durationMs,
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [route]);

  useEffect(() => {
    const normalized = normalizeRoute(window.location.pathname);
    if (normalized !== window.location.pathname) {
      window.history.replaceState(null, '', normalized);
    }

    const handlePopState = () => {
      const nextRoute = normalizeRoute(window.location.pathname);
      if (nextRoute !== window.location.pathname) {
        window.history.replaceState(null, '', nextRoute);
      }
      runWithViewTransition(() => {
        setRoute(nextRoute);
        setLocationVersion((version) => version + 1);
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      const session = await getCurrentAuthSession();
      if (!isMounted) {
        return;
      }
      setIsAuthenticated(Boolean(session));
      setAuthEmail(session?.user.email ?? '');
      setIsAuthReady(true);
    };

    void initializeSession();
    const unsubscribe = subscribeToAuthSessionChange((session) => {
      if (!isMounted) {
        return;
      }
      setIsAuthenticated(Boolean(session));
      setAuthEmail(session?.user.email ?? '');
      setIsAuthReady(true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (isAuthenticated && AUTH_ROUTE_SET.has(route)) {
      const nextRoute = route === '/auth/login' ? resolveNextRouteAfterAuth() : null;
      navigate(nextRoute ?? '/dashboard', { replace: true, source: 'auth.session_redirect' });
      return;
    }

    if (!isAuthenticated && PROTECTED_ROUTE_SET.has(route)) {
      navigate(buildLoginRedirectWithNext(), { replace: true, source: 'auth.guard' });
      return;
    }

    if (isAuthenticated && route === '/dashboard/revenue' && !hasPlatformRevenueAccess(authEmail)) {
      pushGlobalToast(localizeText(language, {
        th: 'หน้านี้เปิดให้เฉพาะอีเมลเจ้าของแพลตฟอร์มที่กำหนดไว้เท่านั้น',
        en: 'This page is only available to the configured platform owner email.',
      }), 'error');
      navigate('/dashboard', { replace: true, source: 'auth.revenue_email_guard' });
    }
  }, [authEmail, isAuthReady, isAuthenticated, language, navigate, pushGlobalToast, route]);

  const handleAuthenticated = useCallback(() => {
    setIsAuthenticated(true);
    const nextRoute = resolveNextRouteAfterAuth();
    pendingInteractionRef.current = {
      interactionId: 'open_dashboard',
      targetRoute: nextRoute ? normalizeRoute(nextRoute) : '/dashboard',
      startedAtMs: getPerformanceNow(),
      source: 'auth.login_success',
      fromPath: route,
    };
    navigate(nextRoute ?? '/dashboard', { replace: true, source: 'auth.login_success' });
  }, [navigate, route]);

  const handleSignedOut = useCallback(() => {
    void (async () => {
      const result = await signOutAuth();
      if (!result.ok) {
        const message = result.message ?? localizeText(language, {
          th: 'Ã Â¹â€žÃ Â¸Â¡Ã Â¹Ë†Ã Â¸ÂªÃ Â¸Â²Ã Â¸Â¡Ã Â¸Â²Ã Â¸Â£Ã Â¸â€“Ã Â¸Â­Ã Â¸Â­Ã Â¸ÂÃ Â¸Ë†Ã Â¸Â²Ã Â¸ÂÃ Â¸Â£Ã Â¸Â°Ã Â¸Å¡Ã Â¸Å¡Ã Â¹â€žÃ Â¸â€Ã Â¹â€°Ã Â¹Æ’Ã Â¸â„¢Ã Â¸â€šÃ Â¸â€œÃ Â¸Â°Ã Â¸â„¢Ã Â¸ÂµÃ Â¹â€° Ã Â¸ÂÃ Â¸Â£Ã Â¸Â¸Ã Â¸â€œÃ Â¸Â²Ã Â¸Â¥Ã Â¸Â­Ã Â¸â€¡Ã Â¹Æ’Ã Â¸Â«Ã Â¸Â¡Ã Â¹Ë†Ã Â¸Â­Ã Â¸ÂµÃ Â¸ÂÃ Â¸â€žÃ Â¸Â£Ã Â¸Â±Ã Â¹â€°Ã Â¸â€¡',
          en: 'Unable to sign out right now. Please try again.',
        });
        pushGlobalToast(message, 'error');
        return;
      }

      setIsAuthenticated(false);
      setAuthEmail('');
      navigate('/auth/login', { replace: true, source: 'auth.sign_out' });
    })();
  }, [language, navigate, pushGlobalToast]);

  const isNavActive = (target: AppRoute) => route === target;

  const setSwitcherHidden = useCallback((hidden: boolean) => {
    setIsSwitcherHidden(hidden);
    if (hidden) {
      window.localStorage.setItem(SWITCHER_HIDDEN_KEY, '1');
      return;
    }
    window.localStorage.removeItem(SWITCHER_HIDDEN_KEY);
  }, []);

  const handleOpenWorkflowEditor = useCallback((workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    navigate('/editor');
  }, [navigate]);
  const renderLegalPage = (Page: ComponentType<{ onNavigate: (path: string) => void }>) => (
    <Suspense
      fallback={(
        <div className="app-page-loading" role="status" aria-live="polite">
          {localizeText(language, {
            th: 'กำลังโหลดเอกสารกฎหมาย...',
            en: 'Loading legal document...',
          })}
        </div>
      )}
    >
      <Page onNavigate={navigate} />
    </Suspense>
  );

  let content: ReactElement;
  if (!isAuthReady && PROTECTED_ROUTE_SET.has(route)) {
    content = (
      <div className="app-page-loading" role="status" aria-live="polite">
        <div className="app-loading-spinner" />
        <span>
          {localizeText(language, {
            th: 'กำลังตรวจสอบสถานะการเข้าสู่ระบบ...',
            en: 'Checking your session...',
          })}
        </span>
      </div>
    );
  } else if (route === '/') {
    content = <LandingPage onNavigate={navigate} />;
  } else if (route === '/about') {
    content = <AboutPage onNavigate={navigate} />;
  } else if (route === '/docs') {
    content = <DocsPage onNavigate={navigate} />;
  } else if (route === '/developer') {
    content = <DeveloperPage onNavigate={navigate} />;
  } else if (route === '/integration-extension') {
    content = <IntegrationExtensionPage onNavigate={navigate} />;
  } else if (route === '/auth/login') {
    content = (
      <LoginPage
        onNavigate={navigate}
        onAuthenticated={handleAuthenticated}
        onToast={pushGlobalToast}
      />
    );
  } else if (route === '/auth/register') {
    content = <RegisterPage onNavigate={navigate} onToast={pushGlobalToast} />;
  } else if (route === '/auth/forgot') {
    content = <ForgotPasswordPage onNavigate={navigate} onToast={pushGlobalToast} />;
  } else if (
    route === '/dashboard' ||
    route === '/dashboard/chat' ||
    route === '/dashboard/api' ||
    route === '/dashboard/usage' ||
    route === '/dashboard/ranking' ||
    route === '/dashboard/benchmark' ||
    route === '/dashboard/revenue' ||
    route === '/dashboard/settings'
  ) {
    content = (
      <DashboardLayout
        activeRoute={route}
        onNavigate={navigate}
        onSignOut={handleSignedOut}
      >
        {route === '/dashboard' && (
          <DashboardPage
            onOpenWorkflowEditor={handleOpenWorkflowEditor}
            onUpgradePlan={() => navigate('/pricing?from=dashboard')}
          />
        )}
        {route === '/dashboard/chat' && (
          <ChatAssistantPage onUpgradePlan={() => navigate('/pricing?from=chat')} />
        )}
        {route === '/dashboard/api' && <ApiManagementPage onNavigate={navigate} />}
        {route === '/dashboard/usage' && <UsagePage />}
        {route === '/dashboard/ranking' && <RankingPage />}
        {route === '/dashboard/benchmark' && <BenchmarkPage />}
        {route === '/dashboard/revenue' && <PlatformRevenuePage />}
        {route === '/dashboard/settings' && (
          <SettingsPage
            onNavigate={navigate}
            onSignOut={handleSignedOut}
          />
        )}
      </DashboardLayout>
    );
  } else if (route === '/pricing') {
    content = <PricingPage onNavigate={navigate} />;
  } else if (route === '/pricing/checkout') {
    content = <CheckoutPage onNavigate={navigate} />;
  } else if (route === '/pricing/success') {
    content = <PricingSuccessPage onNavigate={navigate} />;
  } else if (route === '/pricing/cancel') {
    content = <PricingCancelPage onNavigate={navigate} />;
  } else if (route === '/legal/terms') {
    content = renderLegalPage(TermsOfService);
  } else if (route === '/legal/privacy') {
    content = renderLegalPage(PrivacyPolicy);
  } else if (route === '/legal/acceptable-use') {
    content = renderLegalPage(AcceptableUsePolicy);
  } else if (route === '/legal/ai-policy') {
    content = renderLegalPage(AIUsePolicy);
  } else if (route === '/legal/contact') {
    content = renderLegalPage(Contact);
  } else {
    content = <Editor onNavigate={navigate} />;
  }

  return (
    <>
      {SHOW_DEV_SWITCHER ? (
        <div className="app-route-layer">
          {isSwitcherHidden ? (
            <button
              type="button"
              className="app-route-reveal"
              onClick={() => setSwitcherHidden(false)}
              title={localizeText(language, {
                th: 'Ã Â¹ÂÃ Â¸ÂªÃ Â¸â€Ã Â¸â€¡Ã Â¹â‚¬Ã Â¸Â¡Ã Â¸â„¢Ã Â¸Â¹Ã Â¸ÂªÃ Â¸Â¥Ã Â¸Â±Ã Â¸Å¡Ã Â¸Â«Ã Â¸â„¢Ã Â¹â€°Ã Â¸Â²',
                en: 'Show view switcher',
              })}
            >
              <Eye size={13} />
              <span>
                {localizeText(language, {
                  th: 'Ã Â¹ÂÃ Â¸ÂªÃ Â¸â€Ã Â¸â€¡Ã Â¹â‚¬Ã Â¸Â¡Ã Â¸â„¢Ã Â¸Â¹',
                  en: 'Show menu',
                })}
              </span>
            </button>
          ) : (
            <div
              className="app-route-switcher"
              role="navigation"
              aria-label={localizeText(language, {
                th: 'Ã Â¹â‚¬Ã Â¸Â¡Ã Â¸â„¢Ã Â¸Â¹Ã Â¸ÂªÃ Â¸Â¥Ã Â¸Â±Ã Â¸Å¡Ã Â¸Â«Ã Â¸â„¢Ã Â¹â€°Ã Â¸Â²',
                en: 'View switcher',
              })}
            >
              <button
                type="button"
                className={`${isNavActive('/') ? 'is-active ' : ''}is-auth-blue`}
                onClick={() => navigate('/')}
              >
                <span>
                  {localizeText(language, {
                    th: 'Ã Â¸Â«Ã Â¸â„¢Ã Â¹â€°Ã Â¸Â²Ã Â¹ÂÃ Â¸Â£Ã Â¸Â',
                    en: 'Home',
                  })}
                </span>
              </button>
              <button
                type="button"
                className={`${isNavActive('/about') ? 'is-active ' : ''}is-auth-blue`}
                onClick={() => navigate('/about')}
              >
                <span>
                  {localizeText(language, {
                    th: 'Ã Â¹â‚¬Ã Â¸ÂÃ Â¸ÂµÃ Â¹Ë†Ã Â¸Â¢Ã Â¸Â§Ã Â¸ÂÃ Â¸Â±Ã Â¸Å¡',
                    en: 'About',
                  })}
                </span>
              </button>
              <button
                type="button"
                className={`${isNavActive('/docs') ? 'is-active ' : ''}is-auth-blue`}
                onClick={() => navigate('/docs')}
              >
                <span>
                  {localizeText(language, {
                    th: 'Ã Â¹â‚¬Ã Â¸Â­Ã Â¸ÂÃ Â¸ÂªÃ Â¸Â²Ã Â¸Â£',
                    en: 'Docs',
                  })}
                </span>
              </button>
              <button
                type="button"
                className={isNavActive('/editor') ? 'is-active' : ''}
                onClick={() => navigate('/editor')}
              >
                <ArrowLeft size={13} />
                <span>3D Edit</span>
              </button>
              <button
                type="button"
                className={isNavActive('/dashboard') ? 'is-active' : ''}
                onClick={() => navigate('/dashboard')}
              >
                <LayoutDashboard size={13} />
                <span>
                  {localizeText(language, {
                    th: 'Ã Â¹ÂÃ Â¸â€Ã Â¸Å Ã Â¸Å¡Ã Â¸Â­Ã Â¸Â£Ã Â¹Å’Ã Â¸â€',
                    en: 'Dashboard',
                  })}
                </span>
              </button>
              <button
                type="button"
                className={isNavActive('/auth/login') ? 'is-active' : ''}
                onClick={() => navigate('/auth/login')}
              >
                <span>
                  {localizeText(language, {
                    th: 'Ã Â¹â‚¬Ã Â¸â€šÃ Â¹â€°Ã Â¸Â²Ã Â¸ÂªÃ Â¸Â¹Ã Â¹Ë†Ã Â¸Â£Ã Â¸Â°Ã Â¸Å¡Ã Â¸Å¡',
                    en: 'Login',
                  })}
                </span>
              </button>
              <button
                type="button"
                className={isNavActive('/auth/register') ? 'is-active' : ''}
                onClick={() => navigate('/auth/register')}
              >
                <UserRoundPlus size={13} />
                <span>
                  {localizeText(language, {
                    th: 'Ã Â¸ÂªÃ Â¸Â¡Ã Â¸Â±Ã Â¸â€žÃ Â¸Â£Ã Â¸ÂªÃ Â¸Â¡Ã Â¸Â²Ã Â¸Å Ã Â¸Â´Ã Â¸Â',
                    en: 'Register',
                  })}
                </span>
              </button>
              <button
                type="button"
                className={isNavActive('/auth/forgot') ? 'is-active' : ''}
                onClick={() => navigate('/auth/forgot')}
              >
                <ShieldQuestion size={13} />
                <span>
                  {localizeText(language, {
                    th: 'Ã Â¸Â¥Ã Â¸Â·Ã Â¸Â¡Ã Â¸Â£Ã Â¸Â«Ã Â¸Â±Ã Â¸Âª',
                    en: 'Forgot',
                  })}
                </span>
              </button>
              <div className={`app-auth-chip ${isAuthenticated ? 'is-authenticated' : ''}`}>
                {isAuthenticated
                  ? localizeText(language, {
                      th: 'Ã Â¸Â¥Ã Â¹â€¡Ã Â¸Â­Ã Â¸ÂÃ Â¸Â­Ã Â¸Â´Ã Â¸â„¢Ã Â¹ÂÃ Â¸Â¥Ã Â¹â€°Ã Â¸Â§',
                      en: 'Signed in',
                    })
                  : localizeText(language, {
                      th: 'Ã Â¸Å“Ã Â¸Â¹Ã Â¹â€°Ã Â¹â‚¬Ã Â¸Â¢Ã Â¸ÂµÃ Â¹Ë†Ã Â¸Â¢Ã Â¸Â¡Ã Â¸Å Ã Â¸Â¡',
                      en: 'Guest',
                    })}
              </div>
              <button
                type="button"
                className="app-route-hide"
                onClick={() => setSwitcherHidden(true)}
                title={localizeText(language, {
                  th: 'Ã Â¸â€¹Ã Â¹Ë†Ã Â¸Â­Ã Â¸â„¢Ã Â¹â‚¬Ã Â¸Â¡Ã Â¸â„¢Ã Â¸Â¹Ã Â¸ÂªÃ Â¸Â¥Ã Â¸Â±Ã Â¸Å¡Ã Â¸Â«Ã Â¸â„¢Ã Â¹â€°Ã Â¸Â²',
                  en: 'Hide view switcher',
                })}
              >
                <EyeOff size={13} />
                <span>
                  {localizeText(language, {
                    th: 'Ã Â¸â€¹Ã Â¹Ë†Ã Â¸Â­Ã Â¸â„¢',
                    en: 'Hide',
                  })}
                </span>
              </button>
            </div>
          )}
        </div>
      ) : null}

      {route === '/editor' && selectedWorkflow ? (
        <div className="app-editor-chip">{selectedWorkflow.name}</div>
      ) : null}

      {globalToasts.length > 0 ? (
        <div className="app-global-toast-stack" aria-live="polite" aria-atomic="true">
          {globalToasts.map((toast) => (
            <div
              key={toast.id}
              className={`app-global-toast ${toast.tone === 'error' ? 'is-error' : 'is-success'}`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="app-route-content">
        <Suspense
          fallback={(
            <div className="app-page-loading" role="status" aria-live="polite">
              <div className="app-loading-spinner" />
              <span>
                {localizeText(language, {
                  th: 'กำลังเตรียมหน้าเพจ...',
                  en: 'Preparing page...',
                })}
              </span>
            </div>
          )}
        >
          {content}
        </Suspense>
      </div>
    </>
  );
}

export default App;

