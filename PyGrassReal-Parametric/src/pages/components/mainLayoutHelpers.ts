export interface PendingNavigationState {
  /** Destination pathname requested by user navigation. */
  toPath: string;
  /** Telemetry source id that triggered this navigation. */
  source: string;
  /** ISO timestamp when navigation was requested. */
  requestedAt: string;
}

export type RouteReadinessPhase = 'initial_load' | 'navigation';

export interface RouteReadinessState {
  /** High-resolution timestamp baseline for readiness calculation. */
  startedAtMs: number;
  /** Whether this measurement belongs to initial load or subsequent navigation. */
  phase: RouteReadinessPhase;
  /** Telemetry source id for the measured transition. */
  source: string;
  /** Previous route path used for navigation timing context. */
  fromPath: string;
}

interface ResourceElementLike extends HTMLElement {
  currentSrc?: string;
  src?: string;
  href?: string;
}

export interface ResolvedResourceTarget {
  /** Fully resolved failing resource URL. */
  resourceUrl: string;
  /** Lower-cased DOM tag name for diagnostic grouping. */
  tagName: string;
}

/**
 * Extracts pathname safely from absolute/relative URLs.
 * Falls back to string splitting when URL parsing fails.
 */
export const extractPathname = (path: string): string => {
  try {
    const parsed = new URL(path, window.location.origin);
    return parsed.pathname || '/';
  } catch {
    const [pathname] = path.split(/[?#]/, 1);
    return pathname || '/';
  }
};

/** Reads route attribution (`from`) from query string for page-view telemetry. */
export const resolvePageViewSource = (): string => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('from') ?? 'direct';
  } catch {
    return 'direct';
  }
};

/** Creates a deterministic pending-navigation object for UI + telemetry state. */
export const createPendingNavigationState = (
  destinationPath: string,
  source: string
): PendingNavigationState => ({
  toPath: destinationPath,
  source,
  requestedAt: new Date().toISOString(),
});

/** Creates route readiness measurement state to be consumed by performance hooks. */
export const createRouteReadinessState = (
  startedAtMs: number,
  phase: RouteReadinessPhase,
  source: string,
  fromPath: string
): RouteReadinessState => ({
  startedAtMs,
  phase,
  source,
  fromPath,
});

/**
 * Reads PerformanceNavigationTiming start offset for initial route readiness metrics.
 * Returns 0 when navigation timing is unavailable.
 */
export const getInitialNavigationStart = (): number => {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
    return 0;
  }

  const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (navigationEntries.length === 0) {
    return 0;
  }

  return navigationEntries[0].startTime;
};

/**
 * Converts a generic event target into a typed resource failure descriptor.
 * Used by global error listeners to classify load failures.
 */
export const resolveResourceFromTarget = (target: EventTarget | null): ResolvedResourceTarget | null => {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const element = target as ResourceElementLike;
  const resourceUrl = element.currentSrc ?? element.src ?? element.href ?? null;
  if (!resourceUrl) {
    return null;
  }

  return {
    resourceUrl,
    tagName: target.tagName.toLowerCase(),
  };
};
