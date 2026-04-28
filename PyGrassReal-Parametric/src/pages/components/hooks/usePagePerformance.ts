import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { LanguageCode } from '../../../i18n/language';
import {
  getPerformanceNow,
  initializeCoreWebVitalsTelemetry,
  TELEMETRY_EVENT,
  telemetry,
} from '../../telemetry/telemetry';
import type { RouteReadinessState } from '../mainLayoutHelpers';

interface UsePagePerformanceOptions {
  /** Current route path used for timing telemetry context. */
  resolvedPath: string;
  /** Current UI language for telemetry enrichment. */
  language: LanguageCode;
  /** Scroll container ref for page shell scrolling reset. */
  pageRef: RefObject<HTMLDivElement | null>;
  /** Mutable state describing the navigation phase currently being measured. */
  routeReadinessRef: MutableRefObject<RouteReadinessState>;
  /** Callback fired after a route is considered visually settled. */
  onRouteSettled?: () => void;
}

interface ScrollPreserveHistoryState {
  preserveScroll?: boolean;
  scrollX?: number;
  scrollY?: number;
  pageScrollLeft?: number;
  pageScrollTop?: number;
  fromPath?: string;
  toPath?: string;
}

const isLegalSubRoute = (path: string | undefined): boolean =>
  typeof path === 'string' && path.startsWith('/legal/');

/**
 * Collects route-level performance telemetry and maintains deterministic scroll resets.
 *
 * Side effects:
 * - Initializes Core Web Vitals observers once.
 * - Resets window/container scroll on path change.
 * - Emits hydration-readiness timing after first animation frame.
 */
export function usePagePerformance({
  resolvedPath,
  language,
  pageRef,
  routeReadinessRef,
  onRouteSettled,
}: UsePagePerformanceOptions) {
  useEffect(() => {
    initializeCoreWebVitalsTelemetry();
  }, []);

  useEffect(() => {
    const historyState = (window.history.state ?? null) as ScrollPreserveHistoryState | null;
    const preserveLegalScroll =
      historyState?.preserveScroll === true &&
      isLegalSubRoute(historyState.fromPath) &&
      isLegalSubRoute(historyState.toPath) &&
      historyState.toPath === resolvedPath;

    if (preserveLegalScroll) {
      const windowScrollTop = typeof historyState.scrollY === 'number' ? historyState.scrollY : window.scrollY;
      const windowScrollLeft = typeof historyState.scrollX === 'number' ? historyState.scrollX : window.scrollX;
      const pageScrollTop =
        typeof historyState.pageScrollTop === 'number' ? historyState.pageScrollTop : windowScrollTop;
      const pageScrollLeft =
        typeof historyState.pageScrollLeft === 'number' ? historyState.pageScrollLeft : windowScrollLeft;

      window.scrollTo({ top: windowScrollTop, left: windowScrollLeft, behavior: 'auto' });
      if (pageRef.current && typeof pageRef.current.scrollTo === 'function') {
        pageRef.current.scrollTo({ top: pageScrollTop, left: pageScrollLeft, behavior: 'auto' });
      }

      window.history.replaceState(
        { ...historyState, preserveScroll: false },
        '',
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      );
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      if (pageRef.current && typeof pageRef.current.scrollTo === 'function') {
        pageRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }

    const frameId = window.requestAnimationFrame(() => {
      const readinessDurationMs = Number(
        Math.max(0, getPerformanceNow() - routeReadinessRef.current.startedAtMs).toFixed(2)
      );

      telemetry.info(TELEMETRY_EVENT.HYDRATION_READINESS_TIMING, {
        path: resolvedPath,
        language,
        durationMs: readinessDurationMs,
        phase: routeReadinessRef.current.phase,
        source: routeReadinessRef.current.source,
        fromPath: routeReadinessRef.current.fromPath,
      });

      onRouteSettled?.();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [language, onRouteSettled, pageRef, resolvedPath, routeReadinessRef]);
}
