import { ArrowLeft, Eye, EyeOff, LayoutDashboard, ShieldQuestion, UserRoundPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import Editor from './3d-edit/Editor';
import ForgotPasswordPage from './auth/ForgotPasswordPage';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import DashboardPage from './dashboard/DashboardPage';
import { ChatAssistantPage } from './dashboard/ChatAssistantPage';
import { DashboardLayout } from './dashboard/DashboardLayout';
import { DashboardHeader } from './dashboard/components/DashboardHeader';
import AboutPage from './pages/AboutPage';
import DocsPage from './pages/DocsPage';
import LandingPage from './pages/LandingPage';
import CheckoutPage from './pricing/CheckoutPage';
import PricingCancelPage from './pricing/PricingCancelPage';
import PricingPage from './pricing/PricingPage';
import PricingSuccessPage from './pricing/PricingSuccessPage';
import './app-shell.css';
import type { Workflow } from './dashboard/types/workflow.types';

type AppRoute =
  | '/'
  | '/about'
  | '/docs'
  | '/dashboard'
  | '/dashboard/chat'
  | '/dashboard/settings'
  | '/pricing'
  | '/pricing/checkout'
  | '/pricing/success'
  | '/pricing/cancel'
  | '/editor'
  | '/auth/login'
  | '/auth/register'
  | '/auth/forgot';

const DEFAULT_ROUTE: AppRoute = '/';
const AUTH_SESSION_KEY = 'pygrass-auth-session';
const SWITCHER_HIDDEN_KEY = 'pygrass-route-switcher-hidden';
const SHOW_DEV_SWITCHER = true;

const isAppRoute = (path: string): path is AppRoute => {
  return (
    path === '/' ||
    path === '/about' ||
    path === '/docs' ||
    path === '/dashboard' ||
    path === '/dashboard/chat' ||
    path === '/dashboard/settings' ||
    path === '/pricing' ||
    path === '/pricing/checkout' ||
    path === '/pricing/success' ||
    path === '/pricing/cancel' ||
    path === '/editor' ||
    path === '/auth/login' ||
    path === '/auth/register' ||
    path === '/auth/forgot'
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

function App() {
  const initialAuthenticated = window.sessionStorage.getItem(AUTH_SESSION_KEY) === '1';
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialAuthenticated);
  const [isSwitcherHidden, setIsSwitcherHidden] = useState<boolean>(() => {
    return window.localStorage.getItem(SWITCHER_HIDDEN_KEY) === '1';
  });
  const [route, setRoute] = useState<AppRoute>(() => normalizeRoute(window.location.pathname));
  const [, setLocationVersion] = useState(0);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const navigate = useCallback((nextPath: string, options?: { replace?: boolean }) => {
    const nextRoute = normalizeRoute(nextPath);
    const nextUrl = buildRouteUrl(nextPath, nextRoute);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (currentUrl !== nextUrl) {
      if (options?.replace) {
        window.history.replaceState(null, '', nextUrl);
      } else {
        window.history.pushState(null, '', nextUrl);
      }
      setLocationVersion((version) => version + 1);
    } else if (options?.replace) {
      window.history.replaceState(null, '', nextUrl);
      setLocationVersion((version) => version + 1);
    }

    setRoute(nextRoute);
  }, []);

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
      setRoute(nextRoute);
      setLocationVersion((version) => version + 1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleAuthenticated = useCallback(() => {
    window.sessionStorage.setItem(AUTH_SESSION_KEY, '1');
    setIsAuthenticated(true);
    window.history.replaceState(null, '', '/dashboard');
    setRoute('/dashboard');
    setLocationVersion((version) => version + 1);
  }, []);

  const handleSignedOut = useCallback(() => {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    setIsAuthenticated(false);
    window.history.replaceState(null, '', '/auth/login');
    setRoute('/auth/login');
    setLocationVersion((version) => version + 1);
  }, []);

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

  let content: ReactElement;
  if (route === '/') {
    content = <LandingPage onNavigate={navigate} />;
  } else if (route === '/about') {
    content = <AboutPage onNavigate={navigate} />;
  } else if (route === '/docs') {
    content = <DocsPage onNavigate={navigate} />;
  } else if (route === '/auth/login') {
    content = <LoginPage onNavigate={navigate} onAuthenticated={handleAuthenticated} />;
  } else if (route === '/auth/register') {
    content = <RegisterPage onNavigate={navigate} />;
  } else if (route === '/auth/forgot') {
    content = <ForgotPasswordPage onNavigate={navigate} />;
  } else if (route === '/dashboard' || route === '/dashboard/chat' || route === '/dashboard/settings') {
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
          <ChatAssistantPage onUpgradePlan={() => navigate('/pricing?from=dashboard')} />
        )}
        {route === '/dashboard/settings' && (
          <div className="dashboard-overview-stack">
            <DashboardHeader />
            <section className="dashboard-settings-state">
              <h2>Settings</h2>
              <p>Workspace-level controls are currently in progress for this release.</p>
              <div className="dashboard-settings-note">
                This panel will include team roles, API keys, and shared workflow defaults in upcoming updates.
              </div>
            </section>
          </div>
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
  } else {
    content = <Editor />;
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
              title="Show view switcher"
            >
              <Eye size={13} />
              <span>Show menu</span>
            </button>
          ) : (
            <div className="app-route-switcher" role="navigation" aria-label="View switcher">
              <button
                type="button"
                className={`${isNavActive('/') ? 'is-active ' : ''}is-auth-blue`}
                onClick={() => navigate('/')}
              >
                <span>Home</span>
              </button>
              <button
                type="button"
                className={`${isNavActive('/about') ? 'is-active ' : ''}is-auth-blue`}
                onClick={() => navigate('/about')}
              >
                <span>About</span>
              </button>
              <button
                type="button"
                className={`${isNavActive('/docs') ? 'is-active ' : ''}is-auth-blue`}
                onClick={() => navigate('/docs')}
              >
                <span>Docs</span>
              </button>
              <button
                type="button"
                className={isNavActive('/editor') ? 'is-active' : ''}
                onClick={() => navigate('/editor')}
              >
                <ArrowLeft size={13} />
                <span>3D-Edit</span>
              </button>
              <button
                type="button"
                className={isNavActive('/dashboard') ? 'is-active' : ''}
                onClick={() => navigate('/dashboard')}
              >
                <LayoutDashboard size={13} />
                <span>Dashboard</span>
              </button>
              <button
                type="button"
                className={isNavActive('/auth/login') ? 'is-active' : ''}
                onClick={() => navigate('/auth/login')}
              >
                <span>Login</span>
              </button>
              <button
                type="button"
                className={isNavActive('/auth/register') ? 'is-active' : ''}
                onClick={() => navigate('/auth/register')}
              >
                <UserRoundPlus size={13} />
                <span>Register</span>
              </button>
              <button
                type="button"
                className={isNavActive('/auth/forgot') ? 'is-active' : ''}
                onClick={() => navigate('/auth/forgot')}
              >
                <ShieldQuestion size={13} />
                <span>Forgot</span>
              </button>
              <div className={`app-auth-chip ${isAuthenticated ? 'is-authenticated' : ''}`}>
                {isAuthenticated ? 'Signed in' : 'Guest'}
              </div>
              <button
                type="button"
                className="app-route-hide"
                onClick={() => setSwitcherHidden(true)}
                title="Hide view switcher"
              >
                <EyeOff size={13} />
                <span>Hide</span>
              </button>
            </div>
          )}
        </div>
      ) : null}

      {route === '/editor' && selectedWorkflow ? (
        <div className="app-editor-chip">{selectedWorkflow.name}</div>
      ) : null}
      {content}
    </>
  );
}

export default App;
