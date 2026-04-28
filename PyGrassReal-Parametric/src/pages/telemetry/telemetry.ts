import type { LanguageCode } from '../../i18n/language';

import {
  TELEMETRY_EVENT,
  type TelemetryEventName,
  type TelemetryEventPayload,
} from './events';

export { TELEMETRY_EVENT };
export type { TelemetryEventName, TelemetryEventPayload };

export type TelemetryLevel = 'debug' | 'info' | 'warn' | 'error';
export type TelemetryPayload = Record<string, unknown>;
export type TelemetryDispatchPriority = 'high' | 'normal' | 'low';

interface TelemetryDispatchOptions {
  backendEndpoint?: string;
  skipBackend?: boolean;
  skipAnalytics?: boolean;
  skipConsole?: boolean;
  skipSampling?: boolean;
  priority?: TelemetryDispatchPriority;
}

interface ConnectionLike {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: ConnectionLike;
  mozConnection?: ConnectionLike;
  webkitConnection?: ConnectionLike;
}

export interface RuntimeContextSnapshot {
  path: string;
  href: string;
  language: LanguageCode | string | null;
  referrer: string | null;
  userAgent: string | null;
  online: boolean | null;
  visibilityState: DocumentVisibilityState | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  networkEffectiveType: string | null;
  networkDownlink: number | null;
  networkRtt: number | null;
  networkSaveData: boolean | null;
  capturedAt: string;
}

interface BackendEventEnvelope {
  eventName: TelemetryEventName;
  level: TelemetryLevel;
  payload: TelemetryPayload;
  timestamp: string;
  sessionId: string;
}

interface QueuedBatchRequest {
  endpoint: string;
  events: BackendEventEnvelope[];
  queuedAt: string;
  attemptCount: number;
  nextRetryAt: number;
}

interface TelemetryBatchConfig {
  batchSize: number;
  flushIntervalMs: number;
}

interface IdleDeadlineLike {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
}

type IdleCallbackLike = (deadline: IdleDeadlineLike) => void;

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: IdleCallbackLike,
    options?: { timeout?: number }
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export interface TelemetryBreadcrumb {
  eventName: TelemetryEventName;
  level: TelemetryLevel;
  timestamp: string;
  path: string;
  payload: TelemetryPayload;
}

const DEFAULT_TELEMETRY_ENDPOINT = '/api/telemetry';
export const DEFAULT_CLIENT_ERROR_ENDPOINT = '/api/client-errors';
const TELEMETRY_OPT_OUT_STORAGE_KEY = 'pygrass.telemetry.opt-out';
const SESSION_STORAGE_KEY = 'pygrass.telemetry.session-id';
const OFFLINE_QUEUE_STORAGE_KEY = 'pygrass.telemetry.offline-queue.v2';
const OFFLINE_QUEUE_MAX_ITEMS = 200;
const MAX_SCRUB_DEPTH = 7;
const REDACTED_EMAIL = '[REDACTED_EMAIL]';
const REDACTED_PHONE = '[REDACTED_PHONE]';
const REDACTED_SECRET = '[REDACTED_SECRET]';
const DEFAULT_BREADCRUMB_LIMIT = 20;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_BATCH_FLUSH_MS = 2000;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 120000;
const CLIENT_ERROR_MAX_PAYLOAD_BYTES = 24 * 1024;
const DEFAULT_MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_BACKEND_PAYLOAD_DEPTH = 6;
const MAX_BACKEND_PAYLOAD_KEYS = 40;
const MAX_BACKEND_PAYLOAD_ARRAY_ITEMS = 24;
const MAX_BACKEND_PAYLOAD_STRING_LENGTH = 1600;
const CLIENT_ERROR_MAX_BREADCRUMBS = 10;
const CLIENT_ERROR_MAX_STACK_LENGTH = 2400;
const FALLBACK_SESSION_ID_HEX_BYTES = 16;

const LEVEL_WEIGHTS: Record<TelemetryLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const EMAIL_REGEX_GLOBAL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const EMAIL_REGEX_SINGLE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const EMAIL_KEY_REGEX = /email|e-mail|mail/i;
const PHONE_REGEX_GLOBAL = /(?:\+?\d[\d().\-\s]{7,}\d)/g;
const TOKEN_BEARER_REGEX_GLOBAL = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi;
const TOKEN_JWT_REGEX_GLOBAL = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const TOKEN_HEX_REGEX_GLOBAL = /\b[a-f0-9]{32,}\b/gi;
const TOKEN_BASE64_REGEX_GLOBAL = /\b[A-Za-z0-9_-]{36,}={0,2}\b/g;
const TOKEN_BEARER_REGEX_SINGLE = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/i;
const TOKEN_JWT_REGEX_SINGLE = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/;
const TOKEN_HEX_REGEX_SINGLE = /\b[a-f0-9]{32,}\b/i;
const TOKEN_BASE64_REGEX_SINGLE = /\b[A-Za-z0-9_-]{36,}={0,2}\b/;
const PHONE_KEY_REGEX = /phone|mobile|telephone|tel|contact_number/i;
const TOKEN_KEY_REGEX =
  /token|auth|authorization|api[-_]?key|secret|password|passwd|session|jwt|signature|sig|cookie/i;
const SESSION_ID_REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|sid_[0-9a-f]{32})$/i;
const CLIENT_ERROR_ALLOWED_ROOT_KEYS = new Set([
  'errorName',
  'errorMessage',
  'errorStack',
  'componentStack',
  'runtime',
  'stateSnapshot',
  'breadcrumbs',
  'sessionId',
  'eventName',
  'level',
  'timestamp',
  'path',
  'language',
]);
const CLIENT_ERROR_RUNTIME_ALLOWED_KEYS = new Set([
  'path',
  'href',
  'language',
  'referrer',
  'userAgent',
  'online',
  'visibilityState',
  'viewportWidth',
  'viewportHeight',
  'networkEffectiveType',
  'networkDownlink',
  'networkRtt',
  'networkSaveData',
  'capturedAt',
]);

let telemetryEnabledCache: boolean | null = null;
let cachedSessionId: string | null = null;
let hasAttachedOfflineQueueSync = false;
let isFlushingOfflineQueue = false;
let isFlushingBatchQueue = false;
let hasInitializedCoreWebVitals = false;
let batchFlushTimer: number | null = null;
let offlineRetryTimer: number | null = null;

const batchQueueByEndpoint = new Map<string, BackendEventEnvelope[]>();
const breadcrumbs: TelemetryBreadcrumb[] = [];
const KNOWN_TELEMETRY_EVENT_SET = new Set<string>(Object.values(TELEMETRY_EVENT));

const now = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
};

const runWhenSystemIdle = (callback: () => void) => {
  if (typeof window === 'undefined') {
    callback();
    return;
  }

  const windowWithIdleCallback = window as WindowWithIdleCallback;
  if (typeof windowWithIdleCallback.requestIdleCallback === 'function') {
    windowWithIdleCallback.requestIdleCallback(() => {
      callback();
    }, { timeout: 1500 });
    return;
  }

  window.setTimeout(callback, 180);
};

const clampInteger = (value: number, minimum: number, maximum: number): number => {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const readEnvValue = (key: string): string | undefined => {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const value = env[key];
  return typeof value === 'string' ? value : undefined;
};

const parseSampleRate = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, parsed));
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const normalizeLevel = (value: string | undefined, fallback: TelemetryLevel): TelemetryLevel => {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }
  return fallback;
};

const shouldEmit = (level: TelemetryLevel, minLevel: TelemetryLevel): boolean => {
  return LEVEL_WEIGHTS[level] >= LEVEL_WEIGHTS[minLevel];
};

const getConnection = (): ConnectionLike | undefined => {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  const nav = navigator as NavigatorWithConnection;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
};

const toAnalyticsValue = (value: unknown): string | number | boolean | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const toErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack ?? null,
    };
  }

  return {
    errorName: 'UnknownError',
    errorMessage: String(error),
    errorStack: null,
  };
};

const toHex = (value: number): string => value.toString(16).padStart(2, '0');

const createRandomHex = (byteLength: number): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const randomBytes = new Uint8Array(byteLength);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, toHex).join('');
  }

  return Array.from({ length: byteLength }, () => toHex(Math.floor(Math.random() * 256))).join('');
};

const isValidSessionId = (value: string): boolean => {
  return SESSION_ID_REGEX.test(value);
};

const createSessionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `sid_${createRandomHex(FALLBACK_SESSION_ID_HEX_BYTES)}`;
};

export const getAnonymousSessionId = (): string => {
  if (cachedSessionId && isValidSessionId(cachedSessionId)) {
    return cachedSessionId;
  }
  cachedSessionId = null;

  if (typeof sessionStorage !== 'undefined') {
    const existingSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existingSessionId && isValidSessionId(existingSessionId)) {
      cachedSessionId = existingSessionId;
      return existingSessionId;
    }

    const createdSessionId = createSessionId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, createdSessionId);
    cachedSessionId = createdSessionId;
    return createdSessionId;
  }

  const fallbackSessionId = createSessionId();
  cachedSessionId = fallbackSessionId;
  return fallbackSessionId;
};

export const isTelemetryEnabled = (): boolean => {
  if (telemetryEnabledCache !== null) {
    return telemetryEnabledCache;
  }

  if (typeof localStorage === 'undefined') {
    telemetryEnabledCache = true;
    return true;
  }

  try {
    telemetryEnabledCache = localStorage.getItem(TELEMETRY_OPT_OUT_STORAGE_KEY) !== '1';
  } catch {
    telemetryEnabledCache = true;
  }

  return telemetryEnabledCache;
};

const clearLocalTelemetryBuffers = () => {
  batchQueueByEndpoint.clear();

  if (batchFlushTimer !== null) {
    window.clearTimeout(batchFlushTimer);
    batchFlushTimer = null;
  }

  if (offlineRetryTimer !== null) {
    window.clearTimeout(offlineRetryTimer);
    offlineRetryTimer = null;
  }

  writeOfflineQueue([]);
};

export const setTelemetryEnabled = (enabled: boolean) => {
  telemetryEnabledCache = enabled;

  if (typeof localStorage !== 'undefined') {
    if (enabled) {
      localStorage.removeItem(TELEMETRY_OPT_OUT_STORAGE_KEY);
    } else {
      localStorage.setItem(TELEMETRY_OPT_OUT_STORAGE_KEY, '1');
    }
  }

  if (!enabled) {
    clearLocalTelemetryBuffers();
    return;
  }

  ensureOfflineQueueSync();
  scheduleOfflineRetry();
};

const redactEmails = (value: string): string => {
  return value.replace(EMAIL_REGEX_GLOBAL, REDACTED_EMAIL);
};

const containsEmail = (value: string): boolean => {
  return EMAIL_REGEX_SINGLE.test(value);
};

const countDigits = (value: string): number => {
  return value.replace(/\D/g, '').length;
};

const isLikelyPhoneNumber = (value: string): boolean => {
  const digitCount = countDigits(value);
  return digitCount >= 8 && digitCount <= 15;
};

const redactPhoneNumbers = (value: string): string => {
  return value.replace(PHONE_REGEX_GLOBAL, (match) => {
    return isLikelyPhoneNumber(match) ? REDACTED_PHONE : match;
  });
};

const containsPhone = (value: string): boolean => {
  const matches = value.match(PHONE_REGEX_GLOBAL);
  if (!matches) {
    return false;
  }

  return matches.some((match) => isLikelyPhoneNumber(match));
};

const looksLikeOpaqueToken = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length < 36) {
    return false;
  }

  const hasLetter = /[A-Za-z]/.test(trimmed);
  const hasDigit = /\d/.test(trimmed);
  if (!hasLetter || !hasDigit) {
    return false;
  }

  return TOKEN_HEX_REGEX_SINGLE.test(trimmed) || TOKEN_BASE64_REGEX_SINGLE.test(trimmed);
};

const containsToken = (value: string): boolean => {
  return (
    TOKEN_BEARER_REGEX_SINGLE.test(value) ||
    TOKEN_JWT_REGEX_SINGLE.test(value) ||
    looksLikeOpaqueToken(value)
  );
};

const redactTokenLikeStrings = (value: string): string => {
  let scrubbed = value.replace(TOKEN_BEARER_REGEX_GLOBAL, REDACTED_SECRET);
  scrubbed = scrubbed.replace(TOKEN_JWT_REGEX_GLOBAL, REDACTED_SECRET);
  scrubbed = scrubbed.replace(TOKEN_HEX_REGEX_GLOBAL, REDACTED_SECRET);
  scrubbed = scrubbed.replace(TOKEN_BASE64_REGEX_GLOBAL, (match) => {
    return looksLikeOpaqueToken(match) ? REDACTED_SECRET : match;
  });
  return scrubbed;
};

const isAbsoluteUrl = (value: string): boolean => {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
};

const shouldRedactByParam = (key: string, value: string): boolean => {
  return (
    EMAIL_KEY_REGEX.test(key) ||
    PHONE_KEY_REGEX.test(key) ||
    TOKEN_KEY_REGEX.test(key) ||
    containsEmail(value) ||
    containsPhone(value) ||
    containsToken(value)
  );
};

const scrubUrlSearchParams = (value: string): string => {
  if (!value.includes('?') && !value.includes('#')) {
    return value;
  }

  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';

  try {
    const parsed = isAbsoluteUrl(value) ? new URL(value) : new URL(value, baseOrigin);
    let changed = false;

    parsed.searchParams.forEach((paramValue, key) => {
      if (shouldRedactByParam(key, paramValue)) {
        if (EMAIL_KEY_REGEX.test(key) || containsEmail(paramValue)) {
          parsed.searchParams.set(key, REDACTED_EMAIL);
        } else if (PHONE_KEY_REGEX.test(key) || containsPhone(paramValue)) {
          parsed.searchParams.set(key, REDACTED_PHONE);
        } else {
          parsed.searchParams.set(key, REDACTED_SECRET);
        }
        changed = true;
      }
    });

    if (parsed.hash.includes('=')) {
      const hashParams = new URLSearchParams(parsed.hash.slice(1));
      let hashChanged = false;
      hashParams.forEach((paramValue, key) => {
        if (!shouldRedactByParam(key, paramValue)) {
          return;
        }

        if (EMAIL_KEY_REGEX.test(key) || containsEmail(paramValue)) {
          hashParams.set(key, REDACTED_EMAIL);
        } else if (PHONE_KEY_REGEX.test(key) || containsPhone(paramValue)) {
          hashParams.set(key, REDACTED_PHONE);
        } else {
          hashParams.set(key, REDACTED_SECRET);
        }
        hashChanged = true;
      });

      if (hashChanged) {
        parsed.hash = `#${hashParams.toString()}`;
        changed = true;
      }
    } else if (containsToken(parsed.hash) || containsEmail(parsed.hash) || containsPhone(parsed.hash)) {
      parsed.hash = '#[REDACTED_FRAGMENT]';
      changed = true;
    }

    if (!changed) {
      return value;
    }

    if (isAbsoluteUrl(value)) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return value;
  }
};

const scrubString = (value: string): string => {
  const redactedEmail = redactEmails(value);
  const redactedPhone = redactPhoneNumbers(redactedEmail);
  const redactedUrlParams = scrubUrlSearchParams(redactedPhone);
  return redactTokenLikeStrings(redactedUrlParams);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.getPrototypeOf(value) === Object.prototype;
};

const scrubValue = (value: unknown, depth: number): unknown => {
  if (depth > MAX_SCRUB_DEPTH) {
    return '[TRUNCATED]';
  }

  if (typeof value === 'string') {
    return scrubString(value);
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!isPlainObject(value)) {
    return scrubString(String(value));
  }

  const result: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (EMAIL_KEY_REGEX.test(key)) {
      result[key] = REDACTED_EMAIL;
      continue;
    }
    if (PHONE_KEY_REGEX.test(key)) {
      result[key] = REDACTED_PHONE;
      continue;
    }
    if (TOKEN_KEY_REGEX.test(key)) {
      result[key] = REDACTED_SECRET;
      continue;
    }

    result[key] = scrubValue(nestedValue, depth + 1);
  }

  return result;
};

const scrubPayload = (payload: TelemetryPayload): TelemetryPayload => {
  return scrubValue(payload, 0) as TelemetryPayload;
};

export const scrubTelemetryPayloadForTesting = (payload: TelemetryPayload): TelemetryPayload => {
  return scrubPayload(payload);
};

const truncateString = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
};

const compactBreadcrumbPayload = (payload: TelemetryPayload): TelemetryPayload => {
  const compacted: TelemetryPayload = {};
  const entries = Object.entries(payload).slice(0, 20);

  for (const [key, value] of entries) {
    if (typeof value === 'string') {
      compacted[key] = truncateString(value, 120);
      continue;
    }

    if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
      compacted[key] = value;
      continue;
    }

    try {
      compacted[key] = truncateString(JSON.stringify(value), 200);
    } catch {
      compacted[key] = '[UNSERIALIZABLE]';
    }
  }

  return compacted;
};

const consoleLevel = normalizeLevel(
  readEnvValue('VITE_TELEMETRY_CONSOLE_LEVEL'),
  import.meta.env.PROD ? 'error' : 'debug'
);
const backendLevel = normalizeLevel(
  readEnvValue('VITE_TELEMETRY_BACKEND_LEVEL'),
  import.meta.env.PROD ? 'error' : 'warn'
);
const analyticsLevel = normalizeLevel(
  readEnvValue('VITE_TELEMETRY_ANALYTICS_LEVEL'),
  import.meta.env.PROD ? 'info' : 'debug'
);
const defaultBackendEndpoint = readEnvValue('VITE_TELEMETRY_ENDPOINT') ?? DEFAULT_TELEMETRY_ENDPOINT;
const debugSampleRate = import.meta.env.PROD
  ? parseSampleRate(readEnvValue('VITE_TELEMETRY_DEBUG_SAMPLE_RATE'), 0.2)
  : 1;
const infoSampleRate = import.meta.env.PROD
  ? parseSampleRate(readEnvValue('VITE_TELEMETRY_INFO_SAMPLE_RATE'), 0.5)
  : 1;
const breadcrumbLimit = parsePositiveInt(readEnvValue('VITE_TELEMETRY_BREADCRUMB_LIMIT'), DEFAULT_BREADCRUMB_LIMIT);
const baseBatchSize = parsePositiveInt(readEnvValue('VITE_TELEMETRY_BATCH_SIZE'), DEFAULT_BATCH_SIZE);
const baseBatchFlushIntervalMs = parsePositiveInt(
  readEnvValue('VITE_TELEMETRY_BATCH_FLUSH_MS'),
  DEFAULT_BATCH_FLUSH_MS
);

const resolveBatchConfig = (): TelemetryBatchConfig => {
  const connection = getConnection();
  let batchSize = baseBatchSize;
  let flushIntervalMs = baseBatchFlushIntervalMs;

  if (connection?.saveData) {
    batchSize = Math.max(4, Math.floor(batchSize * 0.75));
    flushIntervalMs = Math.max(flushIntervalMs, Math.round(baseBatchFlushIntervalMs * 2));
  }

  if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
    batchSize = Math.max(4, Math.floor(batchSize * 0.6));
    flushIntervalMs = Math.max(flushIntervalMs, 7000);
  } else if (connection?.effectiveType === '3g') {
    batchSize = Math.max(5, Math.floor(batchSize * 0.8));
    flushIntervalMs = Math.max(flushIntervalMs, 4200);
  }

  const unstableSignal =
    (typeof connection?.rtt === 'number' && connection.rtt > 320) ||
    (typeof connection?.downlink === 'number' && connection.downlink < 1.3);

  if (unstableSignal) {
    batchSize = Math.max(4, Math.floor(batchSize * 0.75));
    flushIntervalMs = Math.max(flushIntervalMs, Math.round(flushIntervalMs * 1.4));
  }

  return {
    batchSize: clampInteger(batchSize, 4, 50),
    flushIntervalMs: clampInteger(flushIntervalMs, 600, 20000),
  };
};

const shouldIncludeBySampling = (
  level: TelemetryLevel,
  skipSampling: boolean
): boolean => {
  if (!import.meta.env.PROD || skipSampling || level === 'warn' || level === 'error') {
    return true;
  }

  if (level === 'debug') {
    return Math.random() <= debugSampleRate;
  }

  return Math.random() <= infoSampleRate;
};

const isTelemetryEventName = (value: string): value is TelemetryEventName => {
  return KNOWN_TELEMETRY_EVENT_SET.has(value) || value.startsWith('custom.');
};

const isBackendEventEnvelope = (value: unknown): value is BackendEventEnvelope => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BackendEventEnvelope>;
  return (
    typeof candidate.eventName === 'string' &&
    isTelemetryEventName(candidate.eventName) &&
    (candidate.level === 'debug' ||
      candidate.level === 'info' ||
      candidate.level === 'warn' ||
      candidate.level === 'error') &&
    Boolean(candidate.payload && typeof candidate.payload === 'object') &&
    typeof candidate.timestamp === 'string' &&
    typeof candidate.sessionId === 'string'
  );
};

const readOfflineQueue = (): QueuedBatchRequest[] => {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is QueuedBatchRequest => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const candidate = item as Partial<QueuedBatchRequest>;
      return (
        typeof candidate.endpoint === 'string' &&
        Array.isArray(candidate.events) &&
        candidate.events.every((eventItem) => isBackendEventEnvelope(eventItem)) &&
        typeof candidate.queuedAt === 'string' &&
        typeof candidate.attemptCount === 'number' &&
        Number.isFinite(candidate.attemptCount) &&
        typeof candidate.nextRetryAt === 'number' &&
        Number.isFinite(candidate.nextRetryAt)
      );
    });
  } catch {
    return [];
  }
};

const writeOfflineQueue = (items: QueuedBatchRequest[]) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    if (items.length === 0) {
      localStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
      return;
    }

    localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota and serialization failures.
  }
};

const computeBackoffDelay = (attemptCount: number): number => {
  const normalizedAttempt = Math.max(0, attemptCount);
  const exponentialDelay = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** normalizedAttempt);
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(BACKOFF_MAX_MS, exponentialDelay + jitter);
};

const scheduleOfflineRetry = () => {
  if (offlineRetryTimer !== null) {
    window.clearTimeout(offlineRetryTimer);
    offlineRetryTimer = null;
  }

  const queue = readOfflineQueue();
  if (queue.length === 0) {
    return;
  }

  const nextRetryAt = Math.min(...queue.map((item) => item.nextRetryAt));
  const delayMs = Math.max(0, nextRetryAt - Date.now());

  offlineRetryTimer = window.setTimeout(() => {
    offlineRetryTimer = null;
    void flushOfflineQueue();
  }, delayMs);
};

const enqueueOfflineBatch = (
  endpoint: string,
  events: BackendEventEnvelope[],
  attemptCount = 0
) => {
  if (events.length === 0) {
    return;
  }

  const queue = readOfflineQueue();
  const nextRetryAt = Date.now() + (attemptCount > 0 ? computeBackoffDelay(attemptCount) : 0);

  queue.push({
    endpoint,
    events,
    queuedAt: new Date().toISOString(),
    attemptCount,
    nextRetryAt,
  });

  const trimmedQueue = queue.slice(-OFFLINE_QUEUE_MAX_ITEMS);
  writeOfflineQueue(trimmedQueue);
  scheduleOfflineRetry();
};

const normalizeEndpointPath = (endpoint: string): string => {
  try {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    return new URL(endpoint, baseOrigin).pathname;
  } catch {
    return endpoint.split(/[?#]/, 1)[0] ?? endpoint;
  }
};

const isClientErrorEndpoint = (endpoint: string): boolean => {
  return normalizeEndpointPath(endpoint) === DEFAULT_CLIENT_ERROR_ENDPOINT;
};

const getUtf8ByteLength = (value: string): number => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }

  return value.length;
};

const normalizeBackendPayloadValue = (value: unknown, depth: number): unknown => {
  if (depth > MAX_BACKEND_PAYLOAD_DEPTH) {
    return '[TRUNCATED]';
  }

  if (typeof value === 'string') {
    return truncateString(value, MAX_BACKEND_PAYLOAD_STRING_LENGTH);
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_BACKEND_PAYLOAD_ARRAY_ITEMS)
      .map((item) => normalizeBackendPayloadValue(item, depth + 1));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!isPlainObject(value)) {
    return truncateString(String(value), MAX_BACKEND_PAYLOAD_STRING_LENGTH);
  }

  const entries = Object.entries(value).slice(0, MAX_BACKEND_PAYLOAD_KEYS);
  const normalized: Record<string, unknown> = {};
  for (const [key, nestedValue] of entries) {
    normalized[key] = normalizeBackendPayloadValue(nestedValue, depth + 1);
  }

  return normalized;
};

const normalizeRuntimeForClientError = (runtimeValue: unknown): Record<string, unknown> | null => {
  if (!isPlainObject(runtimeValue)) {
    return null;
  }

  const normalizedRuntime: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(runtimeValue)) {
    if (!CLIENT_ERROR_RUNTIME_ALLOWED_KEYS.has(key)) {
      continue;
    }
    normalizedRuntime[key] = normalizeBackendPayloadValue(value, 1);
  }

  return normalizedRuntime;
};

const normalizeBreadcrumbsForClientError = (value: unknown): TelemetryPayload[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, CLIENT_ERROR_MAX_BREADCRUMBS).map((entry) => {
    if (!isPlainObject(entry)) {
      return {
        eventName: 'custom.invalid_breadcrumb',
        level: 'warn',
        timestamp: new Date().toISOString(),
        path: '/',
        payload: {},
      };
    }

    return {
      eventName: typeof entry.eventName === 'string' ? entry.eventName : 'custom.invalid_breadcrumb',
      level:
        entry.level === 'debug' || entry.level === 'info' || entry.level === 'warn' || entry.level === 'error'
          ? entry.level
          : 'warn',
      timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : new Date().toISOString(),
      path: typeof entry.path === 'string' ? entry.path : '/',
      payload: compactBreadcrumbPayload(
        isPlainObject(entry.payload) ? (entry.payload as TelemetryPayload) : {}
      ),
    };
  });
};

const sanitizeClientErrorPayload = (payload: TelemetryPayload): TelemetryPayload => {
  const sanitizedPayload: TelemetryPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!CLIENT_ERROR_ALLOWED_ROOT_KEYS.has(key)) {
      continue;
    }

    if (key === 'runtime') {
      sanitizedPayload.runtime = normalizeRuntimeForClientError(value);
      continue;
    }

    if (key === 'stateSnapshot') {
      sanitizedPayload.stateSnapshot = normalizeBackendPayloadValue(value, 0);
      continue;
    }

    if (key === 'breadcrumbs') {
      sanitizedPayload.breadcrumbs = normalizeBreadcrumbsForClientError(value);
      continue;
    }

    if (key === 'errorStack' || key === 'componentStack') {
      sanitizedPayload[key] =
        typeof value === 'string'
          ? truncateString(value, CLIENT_ERROR_MAX_STACK_LENGTH)
          : normalizeBackendPayloadValue(value, 0);
      continue;
    }

    sanitizedPayload[key] = normalizeBackendPayloadValue(value, 0);
  }

  return sanitizedPayload;
};

const enforcePayloadSize = (payload: TelemetryPayload, maxBytes: number): TelemetryPayload => {
  try {
    const serialized = JSON.stringify(payload);
    if (getUtf8ByteLength(serialized) <= maxBytes) {
      return payload;
    }
  } catch {
    // Continue to fallback payload below.
  }

  return {
    eventName: typeof payload.eventName === 'string' ? payload.eventName : 'custom.payload_truncated',
    level: typeof payload.level === 'string' ? payload.level : 'error',
    sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : getAnonymousSessionId(),
    timestamp: typeof payload.timestamp === 'string' ? payload.timestamp : new Date().toISOString(),
    payloadTruncated: true,
  };
};

const preparePayloadForEndpoint = (endpoint: string, payload: TelemetryPayload): TelemetryPayload => {
  const normalizedPayload = normalizeBackendPayloadValue(payload, 0) as TelemetryPayload;
  const isClientError = isClientErrorEndpoint(endpoint);
  const payloadForEndpoint = isClientError
    ? sanitizeClientErrorPayload(normalizedPayload)
    : normalizedPayload;

  const maxBytes = isClientError ? CLIENT_ERROR_MAX_PAYLOAD_BYTES : DEFAULT_MAX_PAYLOAD_BYTES;
  return enforcePayloadSize(payloadForEndpoint, maxBytes);
};

const fnv1aHash = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const computeBatchSignature = async (input: string): Promise<string> => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.digest === 'function' &&
    typeof TextEncoder !== 'undefined'
  ) {
    try {
      const digestBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
      const digestArray = Array.from(new Uint8Array(digestBuffer), toHex).join('');
      return `sha256:${digestArray}`;
    } catch {
      // Fall back to deterministic non-crypto checksum below.
    }
  }

  return `fnv1a:${fnv1aHash(input)}`;
};

const postBatch = async (endpoint: string, events: BackendEventEnvelope[]): Promise<boolean> => {
  if (events.length === 0) {
    return true;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const batchedAt = new Date().toISOString();
  const requestPayload = {
    events,
    batchedAt,
  };
  const requestBody = JSON.stringify({
    ...requestPayload,
    batchSignature: await computeBatchSignature(JSON.stringify(requestPayload)),
  });

  if (typeof fetch === 'function') {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        keepalive: true,
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // Fallback to beacon below.
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([requestBody], { type: 'application/json' });
    return navigator.sendBeacon(endpoint, blob);
  }

  return false;
};

const flushOfflineQueue = async () => {
  if (isFlushingOfflineQueue || !isTelemetryEnabled()) {
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    scheduleOfflineRetry();
    return;
  }

  const queue = readOfflineQueue();
  if (queue.length === 0) {
    return;
  }

  isFlushingOfflineQueue = true;

  try {
    const remainingQueue: QueuedBatchRequest[] = [];
    const currentTimeMs = Date.now();

    for (const queuedBatch of queue) {
      if (queuedBatch.nextRetryAt > currentTimeMs) {
        remainingQueue.push(queuedBatch);
        continue;
      }

      const delivered = await postBatch(queuedBatch.endpoint, queuedBatch.events);
      if (delivered) {
        continue;
      }

      const nextAttemptCount = queuedBatch.attemptCount + 1;
      remainingQueue.push({
        ...queuedBatch,
        attemptCount: nextAttemptCount,
        nextRetryAt: Date.now() + computeBackoffDelay(nextAttemptCount),
      });
    }

    writeOfflineQueue(remainingQueue);
  } finally {
    isFlushingOfflineQueue = false;
    scheduleOfflineRetry();
  }
};

const flushBatchedEvents = async () => {
  if (isFlushingBatchQueue || !isTelemetryEnabled()) {
    return;
  }

  if (batchFlushTimer !== null) {
    window.clearTimeout(batchFlushTimer);
    batchFlushTimer = null;
  }

  isFlushingBatchQueue = true;

  try {
    const entriesToFlush = Array.from(batchQueueByEndpoint.entries());
    batchQueueByEndpoint.clear();

    for (const [endpoint, events] of entriesToFlush) {
      if (events.length === 0) {
        continue;
      }

      const delivered = await postBatch(endpoint, events);
      if (!delivered) {
        enqueueOfflineBatch(endpoint, events, 0);
      }
    }
  } finally {
    isFlushingBatchQueue = false;

    if (batchQueueByEndpoint.size > 0) {
      scheduleBatchFlush();
    }
  }
};

const scheduleBatchFlush = () => {
  if (batchFlushTimer !== null) {
    return;
  }

  const batchConfig = resolveBatchConfig();
  batchFlushTimer = window.setTimeout(() => {
    batchFlushTimer = null;
    void flushBatchedEvents();
  }, batchConfig.flushIntervalMs);
};

const enqueueBatchedEvent = (endpoint: string, eventEnvelope: BackendEventEnvelope) => {
  const existingBatch = batchQueueByEndpoint.get(endpoint) ?? [];
  existingBatch.push(eventEnvelope);
  batchQueueByEndpoint.set(endpoint, existingBatch);

  const batchConfig = resolveBatchConfig();
  if (existingBatch.length >= batchConfig.batchSize) {
    void flushBatchedEvents();
    return;
  }

  scheduleBatchFlush();
};

const ensureOfflineQueueSync = () => {
  if (hasAttachedOfflineQueueSync || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('online', () => {
    void flushOfflineQueue();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    void flushBatchedEvents();
    void flushOfflineQueue();
  });

  window.addEventListener('pagehide', () => {
    void flushBatchedEvents();
  });

  hasAttachedOfflineQueueSync = true;
  scheduleOfflineRetry();
  void flushOfflineQueue();
};

const recordBreadcrumb = (
  level: TelemetryLevel,
  eventName: TelemetryEventName,
  payload: TelemetryPayload
) => {
  const path =
    typeof payload.path === 'string'
      ? payload.path
      : typeof window !== 'undefined'
        ? window.location.pathname
        : '/';

  breadcrumbs.push({
    eventName,
    level,
    timestamp: new Date().toISOString(),
    path,
    payload: compactBreadcrumbPayload(payload),
  });

  if (breadcrumbs.length > breadcrumbLimit) {
    breadcrumbs.splice(0, breadcrumbs.length - breadcrumbLimit);
  }
};

export const getTelemetryBreadcrumbs = (): TelemetryBreadcrumb[] => {
  return breadcrumbs.slice();
};

const dispatchToConsole = (
  level: TelemetryLevel,
  eventName: TelemetryEventName,
  payload: TelemetryPayload,
  skipConsole: boolean
) => {
  if (skipConsole || !shouldEmit(level, consoleLevel)) {
    return;
  }

  const consoleMethod: keyof Pick<Console, 'debug' | 'info' | 'warn' | 'error'> = level;
  console[consoleMethod](`[telemetry:${level}] ${eventName}`, payload);
};

const dispatchToAnalytics = (
  level: TelemetryLevel,
  eventName: TelemetryEventName,
  payload: TelemetryPayload,
  skipAnalytics: boolean
) => {
  if (skipAnalytics || !shouldEmit(level, analyticsLevel)) {
    return;
  }

  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  const analyticsPayload: Record<string, string | number | boolean> = {
    telemetry_level: level,
  };

  for (const [key, value] of Object.entries(payload)) {
    const analyticsValue = toAnalyticsValue(value);
    if (analyticsValue === undefined) {
      continue;
    }
    analyticsPayload[key] = analyticsValue;
  }

  window.gtag('event', eventName, analyticsPayload);
};

const dispatchToBackend = (
  level: TelemetryLevel,
  eventName: TelemetryEventName,
  payload: TelemetryPayload,
  endpoint: string,
  skipBackend: boolean,
  priority: TelemetryDispatchPriority
) => {
  if (skipBackend || !shouldEmit(level, backendLevel) || !endpoint) {
    return;
  }

  ensureOfflineQueueSync();
  const protectedPayload = preparePayloadForEndpoint(endpoint, payload);

  const enqueueEventEnvelope = () => {
    const sessionId =
      typeof protectedPayload.sessionId === 'string' ? protectedPayload.sessionId : getAnonymousSessionId();

    enqueueBatchedEvent(endpoint, {
      eventName,
      level,
      payload: protectedPayload,
      timestamp: new Date().toISOString(),
      sessionId,
    });
  };

  if (priority === 'low') {
    runWhenSystemIdle(enqueueEventEnvelope);
    return;
  }

  enqueueEventEnvelope();
};

export const captureRuntimeContext = (
  overrides: Partial<RuntimeContextSnapshot> = {}
): RuntimeContextSnapshot => {
  const connection = getConnection();

  return {
    path:
      overrides.path ??
      (typeof window === 'undefined' ? '/' : window.location.pathname || '/'),
    href:
      overrides.href ??
      (typeof window === 'undefined' ? '' : window.location.href),
    language:
      overrides.language ??
      (typeof navigator === 'undefined' ? null : navigator.language ?? null),
    referrer:
      overrides.referrer ??
      (typeof document === 'undefined' ? null : document.referrer || null),
    userAgent:
      overrides.userAgent ??
      (typeof navigator === 'undefined' ? null : navigator.userAgent),
    online:
      overrides.online ??
      (typeof navigator === 'undefined' ? null : navigator.onLine),
    visibilityState:
      overrides.visibilityState ??
      (typeof document === 'undefined' ? null : document.visibilityState),
    viewportWidth:
      overrides.viewportWidth ??
      (typeof window === 'undefined' ? null : toFiniteNumber(window.innerWidth)),
    viewportHeight:
      overrides.viewportHeight ??
      (typeof window === 'undefined' ? null : toFiniteNumber(window.innerHeight)),
    networkEffectiveType:
      overrides.networkEffectiveType ?? connection?.effectiveType ?? null,
    networkDownlink:
      overrides.networkDownlink ?? toFiniteNumber(connection?.downlink) ?? null,
    networkRtt:
      overrides.networkRtt ?? toFiniteNumber(connection?.rtt) ?? null,
    networkSaveData:
      overrides.networkSaveData ?? connection?.saveData ?? null,
    capturedAt: overrides.capturedAt ?? new Date().toISOString(),
  };
};

export const emitTelemetry = <TEventName extends TelemetryEventName>(
  level: TelemetryLevel,
  eventName: TEventName,
  payload: TelemetryEventPayload<TEventName>,
  options: TelemetryDispatchOptions = {}
) => {
  const skipSampling = options.skipSampling ?? false;
  const priority = options.priority ?? (level === 'debug' ? 'low' : 'normal');

  if (!isTelemetryEnabled() && !skipSampling) {
    return;
  }

  if (!shouldIncludeBySampling(level, skipSampling)) {
    return;
  }

  ensureOfflineQueueSync();

  const sessionId = getAnonymousSessionId();
  const sanitizedPayload = scrubPayload(payload as TelemetryPayload);
  const enrichedPayload: TelemetryPayload = {
    ...sanitizedPayload,
    sessionId,
    eventName,
    level,
    timestamp: new Date().toISOString(),
  };

  recordBreadcrumb(level, eventName, enrichedPayload);

  dispatchToConsole(level, eventName, enrichedPayload, options.skipConsole ?? false);
  dispatchToAnalytics(level, eventName, enrichedPayload, options.skipAnalytics ?? false);
  dispatchToBackend(
    level,
    eventName,
    enrichedPayload,
    options.backendEndpoint ?? defaultBackendEndpoint,
    options.skipBackend ?? false,
    priority
  );
};

export const telemetry = {
  debug: <TEventName extends TelemetryEventName>(
    eventName: TEventName,
    payload: TelemetryEventPayload<TEventName>,
    options: TelemetryDispatchOptions = {}
  ) => emitTelemetry('debug', eventName, payload, options),
  info: <TEventName extends TelemetryEventName>(
    eventName: TEventName,
    payload: TelemetryEventPayload<TEventName>,
    options: TelemetryDispatchOptions = {}
  ) => emitTelemetry('info', eventName, payload, options),
  warn: <TEventName extends TelemetryEventName>(
    eventName: TEventName,
    payload: TelemetryEventPayload<TEventName>,
    options: TelemetryDispatchOptions = {}
  ) => emitTelemetry('warn', eventName, payload, options),
  error: <TEventName extends TelemetryEventName>(
    eventName: TEventName,
    payload: TelemetryEventPayload<TEventName>,
    options: TelemetryDispatchOptions = {}
  ) => emitTelemetry('error', eventName, payload, options),
};

export const telemetryErrorDetails = (error: unknown): TelemetryPayload => {
  return toErrorDetails(error);
};

export const initializeCoreWebVitalsTelemetry = () => {
  if (hasInitializedCoreWebVitals) {
    return;
  }
  hasInitializedCoreWebVitals = true;

  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return;
  }

  let largestContentfulPaint = 0;
  let cumulativeLayoutShift = 0;
  let hasReported = false;

  let lcpObserver: PerformanceObserver | null = null;
  let clsObserver: PerformanceObserver | null = null;

  const reportVitals = () => {
    if (hasReported) {
      return;
    }
    hasReported = true;

    if (largestContentfulPaint > 0) {
      telemetry.info(
        TELEMETRY_EVENT.CORE_WEB_VITAL,
        {
          metric: 'LCP',
          value: Number(largestContentfulPaint.toFixed(2)),
          unit: 'ms',
          path: window.location.pathname,
        },
        { skipSampling: true }
      );
    }

    telemetry.info(
      TELEMETRY_EVENT.CORE_WEB_VITAL,
      {
        metric: 'CLS',
        value: Number(cumulativeLayoutShift.toFixed(4)),
        unit: 'score',
        path: window.location.pathname,
      },
      { skipSampling: true }
    );

    lcpObserver?.disconnect();
    clsObserver?.disconnect();
  };

  try {
    lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (!lastEntry) {
        return;
      }

      largestContentfulPaint = Math.max(largestContentfulPaint, lastEntry.startTime);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    lcpObserver = null;
  }

  try {
    clsObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries() as Array<PerformanceEntry & {
        value?: number;
        hadRecentInput?: boolean;
      }>;

      for (const entry of entries) {
        if (entry.hadRecentInput) {
          continue;
        }

        cumulativeLayoutShift += entry.value ?? 0;
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    clsObserver = null;
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      reportVitals();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', reportVitals, { once: true });
};

export const getPerformanceNow = () => now();
