import { authLogger } from './logger';

export type AuthRateLimitAction = 'login' | 'register';

interface RateLimitBucket {
  blockedUntil: number | null;
  failedAt: number[];
}

export interface AuthRateLimitStatus {
  blockedUntil: number;
  retryAfterMs: number;
  retryAfterSeconds: number;
}

const STORAGE_PREFIX = 'pygrass-auth-rate-limit:';
export const AUTH_RATE_LIMIT_WINDOW_MS = 5 * 60_000;
export const AUTH_RATE_LIMIT_MAX_FAILURES = 5;
export const AUTH_RATE_LIMIT_BLOCK_MS = 60_000;

const now = () => Date.now();

const toStorageKey = (action: AuthRateLimitAction) => `${STORAGE_PREFIX}${action}`;

const createEmptyBucket = (): RateLimitBucket => ({
  blockedUntil: null,
  failedAt: [],
});

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeBucket = (bucket: RateLimitBucket, currentTime: number): RateLimitBucket => {
  const threshold = currentTime - AUTH_RATE_LIMIT_WINDOW_MS;
  const failedAt = bucket.failedAt.filter((timestamp) => timestamp >= threshold);

  if (bucket.blockedUntil && bucket.blockedUntil <= currentTime) {
    return {
      blockedUntil: null,
      failedAt,
    };
  }

  return {
    blockedUntil: bucket.blockedUntil,
    failedAt,
  };
};

const readBucket = (action: AuthRateLimitAction): RateLimitBucket => {
  if (!isBrowser()) {
    return createEmptyBucket();
  }

  try {
    const raw = window.localStorage.getItem(toStorageKey(action));
    if (!raw) {
      return createEmptyBucket();
    }

    const parsed = JSON.parse(raw) as Partial<RateLimitBucket>;
    return {
      blockedUntil: typeof parsed.blockedUntil === 'number' ? parsed.blockedUntil : null,
      failedAt: Array.isArray(parsed.failedAt)
        ? parsed.failedAt.filter((value): value is number => typeof value === 'number')
        : [],
    };
  } catch {
    return createEmptyBucket();
  }
};

const writeBucket = (action: AuthRateLimitAction, bucket: RateLimitBucket): void => {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(toStorageKey(action), JSON.stringify(bucket));
  } catch {
    // Intentionally no-op on quota/security errors.
  }
};

const toStatus = (bucket: RateLimitBucket, currentTime: number): AuthRateLimitStatus | null => {
  if (!bucket.blockedUntil || bucket.blockedUntil <= currentTime) {
    return null;
  }

  const retryAfterMs = Math.max(0, bucket.blockedUntil - currentTime);
  return {
    blockedUntil: bucket.blockedUntil,
    retryAfterMs,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
  };
};

export const getAuthRateLimitStatus = (action: AuthRateLimitAction): AuthRateLimitStatus | null => {
  const currentTime = now();
  const bucket = normalizeBucket(readBucket(action), currentTime);
  writeBucket(action, bucket);
  return toStatus(bucket, currentTime);
};

export const recordAuthFailure = (action: AuthRateLimitAction): AuthRateLimitStatus | null => {
  const currentTime = now();
  const bucket = normalizeBucket(readBucket(action), currentTime);

  bucket.failedAt.push(currentTime);
  const failureCount = bucket.failedAt.length;
  if (failureCount >= AUTH_RATE_LIMIT_MAX_FAILURES) {
    bucket.blockedUntil = currentTime + AUTH_RATE_LIMIT_BLOCK_MS;
    bucket.failedAt = [];
  }

  writeBucket(action, bucket);
  const status = toStatus(bucket, currentTime);
  authLogger.debug('auth.rate_limit.failure_recorded', {
    action,
    failureCount,
    maxFailures: AUTH_RATE_LIMIT_MAX_FAILURES,
    isBlocked: Boolean(status),
    retryAfterSeconds: status?.retryAfterSeconds ?? null,
  });
  return status;
};

export const clearAuthFailures = (action: AuthRateLimitAction): void => {
  writeBucket(action, createEmptyBucket());
};
