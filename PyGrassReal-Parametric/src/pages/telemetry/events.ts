import type { LanguageCode } from '../../i18n/language';

/** Canonical telemetry event names shared across runtime, analytics, and backend ingestion. */
export const TELEMETRY_EVENT = {
  CTA_CLICK: 'cta_click',
  LANGUAGE_PREFERENCE_CHANGED: 'language_preference_changed',
  SECTION_VISIBLE: 'section_visible',
  ROUTE_TRANSITION: 'route_transition',
  PAGE_VIEW: 'page_view',
  LEGAL_PAGE_ACCESS: 'legal_page_access',
  DOCS_SEARCH_QUERY: 'docs_search_query',
  PREFETCH_CHUNK_LOADED: 'prefetch_chunk_loaded',
  LAZY_CHUNK_LOADED: 'lazy_chunk_loaded',
  PREFETCH_CONVERSION: 'prefetch_conversion',
  LAZY_CHUNK_LOAD_FAILED: 'lazy_chunk_load_failed',
  PREFETCH_REQUESTED: 'prefetch_requested',
  PREFETCH_SKIPPED_UNKNOWN_ROUTE: 'prefetch_skipped_unknown_route',
  RESOURCE_LOAD_ERROR: 'resource_load_error',
  NETWORK_OFFLINE: 'network_offline',
  NETWORK_ONLINE: 'network_online',
  HYDRATION_READINESS_TIMING: 'hydration_readiness_timing',
  TELEMETRY_OPT_OUT: 'telemetry_opt_out',
  TELEMETRY_OPT_IN: 'telemetry_opt_in',
  REACT_ERROR_BOUNDARY_CAPTURED: 'react_error_boundary_captured',
  INTERACTION_LATENCY: 'interaction_latency',
  CORE_WEB_VITAL: 'core_web_vital',
} as const;

export type KnownTelemetryEventName =
  (typeof TELEMETRY_EVENT)[keyof typeof TELEMETRY_EVENT];

/** Escape hatch for vetted custom events (`custom.*`) without changing the core enum. */
export type CustomTelemetryEventName = `custom.${string}`;
export type TelemetryEventName = KnownTelemetryEventName | CustomTelemetryEventName;

interface BasePathPayload {
  /** Current route path where the event occurred. */
  path: string;
}

interface BaseLanguagePayload extends BasePathPayload {
  /** Active UI language at event emission time. */
  language: LanguageCode | string;
}

/**
 * Strongly-typed payload registry for first-party telemetry events.
 * Keep this map synchronized with runtime emitters and backend contracts.
 */
export interface KnownTelemetryEventPayloadMap {
  [TELEMETRY_EVENT.CTA_CLICK]: BaseLanguagePayload & {
    area: string;
    ctaId: string;
  };
  [TELEMETRY_EVENT.LANGUAGE_PREFERENCE_CHANGED]: BasePathPayload & {
    fromLanguage: LanguageCode | string;
    toLanguage: LanguageCode | string;
  };
  [TELEMETRY_EVENT.SECTION_VISIBLE]: BaseLanguagePayload & {
    sectionId: string;
    visibleRatio: number;
  };
  [TELEMETRY_EVENT.ROUTE_TRANSITION]: BaseLanguagePayload & {
    fromPath: string;
    toPath: string;
    source: string;
  };
  [TELEMETRY_EVENT.PAGE_VIEW]: BaseLanguagePayload & {
    source: string;
    title: string;
  };
  [TELEMETRY_EVENT.LEGAL_PAGE_ACCESS]: BaseLanguagePayload & {
    source: string;
    consentAudit: boolean;
  };
  [TELEMETRY_EVENT.DOCS_SEARCH_QUERY]: BaseLanguagePayload & {
    queryHash: string;
    queryLength: number;
    tokenCount: number;
    hasDigits: boolean;
    resultCategoryCount: number;
  };
  [TELEMETRY_EVENT.PREFETCH_CHUNK_LOADED]: {
    page: string;
    durationMs: number;
    prefetchAttempts: number;
    prefetchedPath: string | null;
    wasCached: boolean;
  };
  [TELEMETRY_EVENT.LAZY_CHUNK_LOADED]: {
    page: string;
    durationMs: number;
    wasPrefetched: boolean;
    prefetchLeadMs: number | null;
    prefetchAttempts: number;
    prefetchedPath: string | null;
    wasCached: boolean;
  };
  [TELEMETRY_EVENT.PREFETCH_CONVERSION]: {
    page: string;
    path: string;
    prefetchAttempts: number;
    prefetchLeadMs: number | null;
  };
  [TELEMETRY_EVENT.LAZY_CHUNK_LOAD_FAILED]: {
    page: string;
    reason: 'route' | 'prefetch';
    durationMs: number;
    errorName?: string;
    errorMessage?: string;
    errorStack?: string | null;
  };
  [TELEMETRY_EVENT.PREFETCH_REQUESTED]: {
    page: string;
    path: string;
    trigger: 'hover' | 'focus' | 'manual';
    source: string;
    repeatCount: number;
  };
  [TELEMETRY_EVENT.PREFETCH_SKIPPED_UNKNOWN_ROUTE]: {
    path: string;
    pathname: string;
    trigger: 'hover' | 'focus' | 'manual';
    source: string;
  };
  [TELEMETRY_EVENT.RESOURCE_LOAD_ERROR]: BaseLanguagePayload & {
    tagName: string;
    resourceUrl: string;
    [key: string]: unknown;
  };
  [TELEMETRY_EVENT.NETWORK_OFFLINE]: BaseLanguagePayload & {
    [key: string]: unknown;
  };
  [TELEMETRY_EVENT.NETWORK_ONLINE]: BaseLanguagePayload & {
    [key: string]: unknown;
  };
  [TELEMETRY_EVENT.HYDRATION_READINESS_TIMING]: BaseLanguagePayload & {
    durationMs: number;
    phase: 'initial_load' | 'navigation';
    source: string;
    fromPath: string;
  };
  [TELEMETRY_EVENT.TELEMETRY_OPT_OUT]: BaseLanguagePayload;
  [TELEMETRY_EVENT.TELEMETRY_OPT_IN]: BaseLanguagePayload;
  [TELEMETRY_EVENT.REACT_ERROR_BOUNDARY_CAPTURED]: {
    [key: string]: unknown;
  };
  [TELEMETRY_EVENT.INTERACTION_LATENCY]: {
    interactionId: 'open_3d_editor' | 'open_dashboard';
    targetRoute: string;
    fromPath: string;
    source: string;
    durationMs: number;
  };
  [TELEMETRY_EVENT.CORE_WEB_VITAL]: BasePathPayload & {
    metric: 'LCP' | 'CLS';
    value: number;
    unit: 'ms' | 'score';
  };
}

export type TelemetryEventPayload<TEventName extends TelemetryEventName> =
  TEventName extends KnownTelemetryEventName
    ? KnownTelemetryEventPayloadMap[TEventName]
    : Record<string, unknown>;
