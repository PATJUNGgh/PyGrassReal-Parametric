import { lazy } from 'react';
import { TELEMETRY_EVENT, telemetry, telemetryErrorDetails } from '../telemetry/telemetry';

type PrefetchTrigger = 'hover' | 'focus' | 'manual';

interface PrefetchOptions {
  trigger?: PrefetchTrigger;
  source?: string;
}

interface PrefetchState {
  firstPrefetchAt: number;
  lastPrefetchAt: number;
  count: number;
  path: string;
}

interface ConnectionHints {
  effectiveType?: string;
  saveData?: boolean;
}

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
}

interface NavigatorSchedulingHints extends Navigator {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: ConnectionHints;
  mozConnection?: ConnectionHints;
  webkitConnection?: ConnectionHints;
  getBattery?: () => Promise<BatteryManagerLike>;
}

type PageLoadReason = 'route' | 'prefetch';

const prefetchStateByPage = new Map<string, PrefetchState>();
const loadedPages = new Set<string>();
const pendingIdlePrefetchPages = new Set<string>();

type IdleCallbackHandle = number;

const BASE_IDLE_TIMEOUT_MS = 180;
const MIN_IDLE_TIMEOUT_MS = 120;
const MAX_IDLE_TIMEOUT_MS = 900;

let batteryHintInitialized = false;
let batteryLevelHint: number | null = null;
let batteryChargingHint: boolean | null = null;

const now = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
};

const getConnectionHints = (): ConnectionHints | undefined => {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  const nav = navigator as NavigatorSchedulingHints;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
};

const primeBatteryHint = () => {
  if (batteryHintInitialized || typeof navigator === 'undefined') {
    return;
  }
  batteryHintInitialized = true;

  const nav = navigator as NavigatorSchedulingHints;
  if (typeof nav.getBattery !== 'function') {
    return;
  }

  void nav
    .getBattery()
    .then((battery) => {
      batteryLevelHint = battery.level;
      batteryChargingHint = battery.charging;

      const syncBatteryHint = () => {
        batteryLevelHint = battery.level;
        batteryChargingHint = battery.charging;
      };

      battery.addEventListener('levelchange', syncBatteryHint);
      battery.addEventListener('chargingchange', syncBatteryHint);
    })
    .catch(() => {
      batteryLevelHint = null;
      batteryChargingHint = null;
    });
};

const clampTimeout = (value: number): number =>
  Math.min(MAX_IDLE_TIMEOUT_MS, Math.max(MIN_IDLE_TIMEOUT_MS, Math.round(value)));

const resolveAdaptiveIdleTimeoutMs = (): number => {
  let timeoutMs = BASE_IDLE_TIMEOUT_MS;
  primeBatteryHint();

  const connection = getConnectionHints();
  if (connection?.saveData) {
    timeoutMs += 180;
  }

  if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
    timeoutMs += 320;
  } else if (connection?.effectiveType === '3g') {
    timeoutMs += 120;
  }

  if (typeof navigator !== 'undefined') {
    const nav = navigator as NavigatorSchedulingHints;
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 2) {
      timeoutMs += 110;
    }

    if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) {
      timeoutMs += 80;
    }
  }

  if (batteryChargingHint === false && typeof batteryLevelHint === 'number' && batteryLevelHint <= 0.2) {
    timeoutMs += 160;
  }

  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    timeoutMs -= 40;
  }

  return clampTimeout(timeoutMs);
};

export const resolveAdaptiveIdleTimeoutForTesting = (): number => {
  return resolveAdaptiveIdleTimeoutMs();
};

const runWhenIdle = (callback: () => void): IdleCallbackHandle => {
  const adaptiveTimeoutMs = resolveAdaptiveIdleTimeoutMs();

  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(() => {
      callback();
    }, { timeout: adaptiveTimeoutMs });
  }

  return window.setTimeout(callback, adaptiveTimeoutMs);
};

const cancelIdleRun = (handle: IdleCallbackHandle) => {
  if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
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

const withChunkTracking = <TModule>(
  pageName: string,
  loader: () => Promise<TModule>
): (() => Promise<TModule>) & { prefetch: () => Promise<TModule> } => {
  const loadChunk = async (reason: PageLoadReason): Promise<TModule> => {
    const start = now();
    const prefetchState = prefetchStateByPage.get(pageName);

    try {
      const module = await loader();
      const durationMs = Number((now() - start).toFixed(2));
      const prefetchLeadMs =
        prefetchState && reason === 'route'
          ? Number((start - prefetchState.firstPrefetchAt).toFixed(2))
          : null;

      if (reason === 'prefetch') {
        telemetry.debug(TELEMETRY_EVENT.PREFETCH_CHUNK_LOADED, {
          page: pageName,
          durationMs,
          prefetchAttempts: prefetchState?.count ?? 0,
          prefetchedPath: prefetchState?.path ?? null,
          wasCached: loadedPages.has(pageName),
        });
        loadedPages.add(pageName);
        return module;
      }

      telemetry.info(TELEMETRY_EVENT.LAZY_CHUNK_LOADED, {
        page: pageName,
        durationMs,
        wasPrefetched: Boolean(prefetchState),
        prefetchLeadMs,
        prefetchAttempts: prefetchState?.count ?? 0,
        prefetchedPath: prefetchState?.path ?? null,
        wasCached: loadedPages.has(pageName),
      });

      if (prefetchState) {
        telemetry.info(TELEMETRY_EVENT.PREFETCH_CONVERSION, {
          page: pageName,
          path: prefetchState.path,
          prefetchAttempts: prefetchState.count,
          prefetchLeadMs,
        });
        prefetchStateByPage.delete(pageName);
      }

      loadedPages.add(pageName);
      return module;
    } catch (error) {
      telemetry.error(TELEMETRY_EVENT.LAZY_CHUNK_LOAD_FAILED, {
        page: pageName,
        reason,
        durationMs: Number((now() - start).toFixed(2)),
        ...telemetryErrorDetails(error),
      });
      throw error;
    }
  };

  const routeLoader = (() => loadChunk('route')) as (() => Promise<TModule>) & {
    prefetch: () => Promise<TModule>;
  };
  routeLoader.prefetch = () => loadChunk('prefetch');
  return routeLoader;
};

export const PAGE_LOADERS = {
  LandingPage: withChunkTracking('LandingPage', () => import('../LandingPage')),
  AboutPage: withChunkTracking('AboutPage', () => import('../AboutPage')),
  DocsPage: withChunkTracking('DocsPage', () => import('../DocsPage')),
  DeveloperPage: withChunkTracking('DeveloperPage', () => import('../DeveloperPage')),
  IntegrationExtensionPage: withChunkTracking(
    'IntegrationExtensionPage',
    () => import('../IntegrationExtensionPage')
  ),
  LoginPage: withChunkTracking('LoginPage', () => import('../../auth/LoginPage')),
  RegisterPage: withChunkTracking('RegisterPage', () => import('../../auth/RegisterPage')),
  ForgotPasswordPage: withChunkTracking('ForgotPasswordPage', () => import('../../auth/ForgotPasswordPage')),
  PricingPage: withChunkTracking('PricingPage', () => import('../../pricing/PricingPage')),
  CheckoutPage: withChunkTracking('CheckoutPage', () => import('../../pricing/CheckoutPage')),
  PricingSuccessPage: withChunkTracking('PricingSuccessPage', () => import('../../pricing/PricingSuccessPage')),
  PricingCancelPage: withChunkTracking('PricingCancelPage', () => import('../../pricing/PricingCancelPage')),
  TermsOfService: withChunkTracking('TermsOfService', () => import('../legal/TermsOfService')),
  PrivacyPolicy: withChunkTracking('PrivacyPolicy', () => import('../legal/PrivacyPolicy')),
  AcceptableUsePolicy: withChunkTracking('AcceptableUsePolicy', () => import('../legal/AcceptableUsePolicy')),
  AIUsePolicy: withChunkTracking('AIUsePolicy', () => import('../legal/AIUsePolicy')),
  Contact: withChunkTracking('Contact', () => import('../legal/Contact')),
};

type PageLoaderName = keyof typeof PAGE_LOADERS;

export const PAGE_COMPONENTS = {
  LandingPage: lazy(PAGE_LOADERS.LandingPage),
  AboutPage: lazy(PAGE_LOADERS.AboutPage),
  DocsPage: lazy(PAGE_LOADERS.DocsPage),
  DeveloperPage: lazy(PAGE_LOADERS.DeveloperPage),
  IntegrationExtensionPage: lazy(PAGE_LOADERS.IntegrationExtensionPage),
  LoginPage: lazy(PAGE_LOADERS.LoginPage),
  RegisterPage: lazy(PAGE_LOADERS.RegisterPage),
  ForgotPasswordPage: lazy(PAGE_LOADERS.ForgotPasswordPage),
  PricingPage: lazy(PAGE_LOADERS.PricingPage),
  CheckoutPage: lazy(PAGE_LOADERS.CheckoutPage),
  PricingSuccessPage: lazy(PAGE_LOADERS.PricingSuccessPage),
  PricingCancelPage: lazy(PAGE_LOADERS.PricingCancelPage),
  TermsOfService: lazy(PAGE_LOADERS.TermsOfService),
  PrivacyPolicy: lazy(PAGE_LOADERS.PrivacyPolicy),
  AcceptableUsePolicy: lazy(PAGE_LOADERS.AcceptableUsePolicy),
  AIUsePolicy: lazy(PAGE_LOADERS.AIUsePolicy),
  Contact: lazy(PAGE_LOADERS.Contact),
};

const PAGE_PREFETCH_ROUTE_MAP: Record<string, PageLoaderName> = {
  '/': 'LandingPage',
  '/about': 'AboutPage',
  '/docs': 'DocsPage',
  '/developer': 'DeveloperPage',
  '/integration-extension': 'IntegrationExtensionPage',
  '/auth/login': 'LoginPage',
  '/auth/register': 'RegisterPage',
  '/auth/forgot': 'ForgotPasswordPage',
  '/pricing': 'PricingPage',
  '/pricing/checkout': 'CheckoutPage',
  '/pricing/success': 'PricingSuccessPage',
  '/pricing/cancel': 'PricingCancelPage',
  '/legal/terms': 'TermsOfService',
  '/legal/privacy': 'PrivacyPolicy',
  '/legal/acceptable-use': 'AcceptableUsePolicy',
  '/legal/ai-policy': 'AIUsePolicy',
  '/legal/contact': 'Contact',
};

export const prefetchPageByPath = (path: string, options: PrefetchOptions = {}) => {
  const pathname = extractPathname(path);
  const name = PAGE_PREFETCH_ROUTE_MAP[pathname];
  if (name && PAGE_LOADERS[name]) {
    const pageLoader = PAGE_LOADERS[name];
    const timestamp = now();
    const existing = prefetchStateByPage.get(name);
    const nextState: PrefetchState = {
      firstPrefetchAt: existing?.firstPrefetchAt ?? timestamp,
      lastPrefetchAt: timestamp,
      count: (existing?.count ?? 0) + 1,
      path: pathname,
    };
    prefetchStateByPage.set(name, nextState);

    telemetry.debug(TELEMETRY_EVENT.PREFETCH_REQUESTED, {
      page: name,
      path: pathname,
      trigger: options.trigger ?? 'manual',
      source: options.source ?? 'unknown',
      repeatCount: nextState.count,
    });

    if (loadedPages.has(name) || pendingIdlePrefetchPages.has(name)) {
      return;
    }

    pendingIdlePrefetchPages.add(name);
    let idleHandle: IdleCallbackHandle | null = null;

    const handlePageHide = () => {
      pendingIdlePrefetchPages.delete(name);
      if (idleHandle !== null) {
        cancelIdleRun(idleHandle);
      }
    };

    window.addEventListener('pagehide', handlePageHide, { once: true });

    idleHandle = runWhenIdle(() => {
      window.removeEventListener('pagehide', handlePageHide);
      pendingIdlePrefetchPages.delete(name);
      void pageLoader.prefetch();
    });
    return;
  }

  telemetry.debug(TELEMETRY_EVENT.PREFETCH_SKIPPED_UNKNOWN_ROUTE, {
    path,
    pathname,
    trigger: options.trigger ?? 'manual',
    source: options.source ?? 'unknown',
  });
};

