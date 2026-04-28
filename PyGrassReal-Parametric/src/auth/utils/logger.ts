export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogPayload =
  | Record<string, unknown>
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<unknown>;

export const REDACTED_TEXT = '[REDACTED]';

const EMAIL_PATTERN = /\b([A-Z0-9._%+-])([A-Z0-9._%+-]*)(@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const TOKEN_QUERY_PATTERN = /\b(token|access_token|refresh_token)=([^&\s]+)/gi;
const MAX_STRING_LENGTH = 200;
const MAX_DEPTH = 4;
const MAX_ARRAY_LENGTH = 20;
const ALLOWED_ID_KEYS = new Set(['userid', 'user_id', 'sessionid', 'session_id']);

const maskEmail = (value: string): string => {
  return value.replace(EMAIL_PATTERN, (_match, first, _rest, domain) => {
    const safeFirst = String(first).toLowerCase();
    const safeDomain = String(domain).toLowerCase();
    return `${safeFirst}***${safeDomain}`;
  });
};

const truncateString = (value: string): string =>
  value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;

const redactStringSecrets = (value: string): string =>
  value
    .replace(BEARER_TOKEN_PATTERN, `Bearer ${REDACTED_TEXT}`)
    .replace(JWT_PATTERN, REDACTED_TEXT)
    .replace(TOKEN_QUERY_PATTERN, (_match, key) => `${key}=${REDACTED_TEXT}`);

const sanitizeString = (value: string): string => truncateString(redactStringSecrets(maskEmail(value)));

const isEmailKey = (key: string): boolean => key.toLowerCase().includes('email');

const isSensitiveKey = (key: string): boolean => {
  const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (ALLOWED_ID_KEYS.has(normalized)) {
    return false;
  }
  return /password|pass|pwd|secret|token|authorization|cookie|jwt|session/.test(normalized);
};

const sanitizeValue = (value: unknown, depth: number, seen: WeakSet<object>): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[CIRCULAR]';
    }

    if (depth >= MAX_DEPTH) {
      return '[TRUNCATED]';
    }

    seen.add(value);
    const entries = Object.entries(value as Record<string, unknown>);
    const sanitized: Record<string, unknown> = {};

    for (const [key, entryValue] of entries) {
      if (isSensitiveKey(key)) {
        sanitized[key] = REDACTED_TEXT;
        continue;
      }

      if (isEmailKey(key)) {
        sanitized[key] = typeof entryValue === 'string' ? maskEmail(entryValue) : REDACTED_TEXT;
        continue;
      }

      sanitized[key] = sanitizeValue(entryValue, depth + 1, seen);
    }

    return sanitized;
  }

  return sanitizeString(String(value));
};

export const sanitizeLogPayload = (value: unknown): unknown => {
  const seen = new WeakSet<object>();
  return sanitizeValue(value, 0, seen);
};

export interface Logger {
  debug: (message: string, payload?: LogPayload) => void;
  info: (message: string, payload?: LogPayload) => void;
  warn: (message: string, payload?: LogPayload) => void;
  error: (message: string, payload?: LogPayload) => void;
}

interface LoggerOptions {
  name?: string;
  isProd?: boolean;
  console?: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
}

const shouldLogLevel = (level: LogLevel, isProd: boolean): boolean => {
  if (!isProd) {
    return true;
  }
  return level === 'warn' || level === 'error';
};

export const createLogger = (options: LoggerOptions = {}): Logger => {
  const { name = 'auth', isProd = import.meta.env.PROD, console: consoleTarget = console } = options;
  const prefix = name ? `[${name}]` : '';

  const formatMessage = (message: string) => (prefix ? `${prefix} ${message}` : message);

  const log = (level: LogLevel, message: string, payload?: LogPayload) => {
    if (!shouldLogLevel(level, isProd)) {
      return;
    }

    const safeMessage = sanitizeString(message);
    if (payload === undefined) {
      consoleTarget[level](formatMessage(safeMessage));
      return;
    }

    consoleTarget[level](formatMessage(safeMessage), sanitizeLogPayload(payload));
  };

  return {
    debug: (message, payload) => log('debug', message, payload),
    info: (message, payload) => log('info', message, payload),
    warn: (message, payload) => log('warn', message, payload),
    error: (message, payload) => log('error', message, payload),
  };
};

export const authLogger = createLogger({ name: 'auth' });
