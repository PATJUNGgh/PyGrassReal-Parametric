import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '../../i18n/language';
import { type TopbarNavItem } from '../config/navigation';
import { PageNavigationProvider, type PageNavigateOptions } from '../navigation/PageNavigationContext';
import { getPerformanceNow, TELEMETRY_EVENT, telemetry } from '../telemetry/telemetry';
import { Footer } from './Footer';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';
import { usePagePerformance } from './hooks/usePagePerformance';
import { useSEO } from './hooks/useSEO';
import { useSystemMonitoring } from './hooks/useSystemMonitoring';
import {
  createPendingNavigationState,
  createRouteReadinessState,
  extractPathname,
  getInitialNavigationStart,
  type PendingNavigationState,
  resolvePageViewSource,
} from './mainLayoutHelpers';
import { PageBackground } from './PageBackground';
import { Topbar } from './Topbar';

interface MainLayoutProps {
  onNavigate: (path: string, options?: { source?: string }) => void;
  topbarItems?: TopbarNavItem[];
  children: ReactNode;
  className?: string;
  pageTitle?: string;
  pageDescription?: string;
  currentPath?: string;
  isAuthenticated?: boolean;
}

export function MainLayout({
  onNavigate,
  topbarItems,
  children,
  className = '',
  pageTitle,
  pageDescription,
  currentPath,
  isAuthenticated = false,
}: MainLayoutProps) {
  const { language } = useLanguage();
  const resolvedPath = currentPath ?? window.location.pathname;
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigationState | null>(null);
  const pageViewKeyRef = useRef('');
  const legalAuditKeyRef = useRef('');
  const pendingPageViewSourceRef = useRef<string | null>(null);
  const routeReadinessRef = useRef(
    createRouteReadinessState(getInitialNavigationStart(), 'initial_load', 'initial_load', resolvedPath)
  );

  const handleRouteSettled = useCallback(() => {
    setIsTransitioning(false);
    setPendingNavigation(null);
  }, []);

  const navigationContextValue = useMemo(
    () => ({
      navigate: (path: string, options?: PageNavigateOptions) => {
        const destinationPath = extractPathname(path);
        const source = options?.source ?? 'page_navigation_context';

        if (destinationPath === resolvedPath) {
          onNavigate(path, { source });
          return;
        }

        pendingPageViewSourceRef.current = source;
        setPendingNavigation(createPendingNavigationState(destinationPath, source));
        routeReadinessRef.current = createRouteReadinessState(
          getPerformanceNow(),
          'navigation',
          source,
          resolvedPath
        );

        telemetry.info(TELEMETRY_EVENT.ROUTE_TRANSITION, {
          fromPath: resolvedPath,
          toPath: destinationPath,
          source,
          language,
        });

        onNavigate(path, { source });
      },
      currentPath: resolvedPath,
    }),
    [language, onNavigate, resolvedPath]
  );

  useSEO({
    resolvedPath,
    pageTitle,
    pageDescription,
  });

  usePagePerformance({
    resolvedPath,
    language,
    pageRef,
    routeReadinessRef,
    onRouteSettled: handleRouteSettled,
  });

  useSystemMonitoring({
    resolvedPath,
    language,
  });

  useEffect(() => {
    const source = pendingPageViewSourceRef.current ?? resolvePageViewSource();
    const pageViewKey = `${resolvedPath}|${language}|${window.location.search}`;
    if (pageViewKeyRef.current !== pageViewKey) {
      telemetry.info(TELEMETRY_EVENT.PAGE_VIEW, {
        path: resolvedPath,
        source,
        language,
        title: document.title,
      });
      pageViewKeyRef.current = pageViewKey;
      pendingPageViewSourceRef.current = null;
    }

    if (!resolvedPath.startsWith('/legal/')) {
      legalAuditKeyRef.current = '';
      return;
    }

    const legalAuditKey = `${resolvedPath}|${window.location.search}`;
    if (legalAuditKeyRef.current === legalAuditKey) {
      return;
    }

    telemetry.info(TELEMETRY_EVENT.LEGAL_PAGE_ACCESS, {
      path: resolvedPath,
      source,
      language,
      consentAudit: true,
    });
    legalAuditKeyRef.current = legalAuditKey;
  }, [language, resolvedPath]);

  return (
    <div ref={pageRef} className={`pg-page ${isTransitioning ? 'is-transitioning' : ''} ${className}`}>
      <PageBackground />

      <PageNavigationProvider value={navigationContextValue}>
        <GlobalErrorBoundary
          language={language}
          currentPath={resolvedPath}
          stateSnapshot={{
            isTransitioning,
            pageTitle: pageTitle ?? null,
            pageDescription: pageDescription ?? null,
            currentLanguage: language,
            pendingNavigation,
          }}
        >
          <Topbar items={topbarItems} isAuthenticated={isAuthenticated} />
          {children}
          <Footer />
        </GlobalErrorBoundary>
      </PageNavigationProvider>
    </div>
  );
}
