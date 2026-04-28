import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_RATE_LIMIT_BLOCK_MS,
  AUTH_RATE_LIMIT_MAX_FAILURES,
  clearAuthFailures,
  getAuthRateLimitStatus,
  recordAuthFailure,
} from './rateLimit';
import { getLoginPasswordResult } from './Authvalidation';
import { authLogger } from './logger';

describe('auth rate limit', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks login action after repeated failures', () => {
    for (let attempt = 1; attempt < AUTH_RATE_LIMIT_MAX_FAILURES; attempt += 1) {
      expect(recordAuthFailure('login')).toBeNull();
    }

    const status = recordAuthFailure('login');
    expect(status).not.toBeNull();
    expect(status?.retryAfterMs).toBeGreaterThanOrEqual(AUTH_RATE_LIMIT_BLOCK_MS - 5);
    expect(getAuthRateLimitStatus('login')).not.toBeNull();
  });

  it('clears block after timeout or explicit reset', () => {
    for (let attempt = 0; attempt < AUTH_RATE_LIMIT_MAX_FAILURES; attempt += 1) {
      recordAuthFailure('register');
    }

    expect(getAuthRateLimitStatus('register')).not.toBeNull();
    vi.advanceTimersByTime(AUTH_RATE_LIMIT_BLOCK_MS + 1);
    expect(getAuthRateLimitStatus('register')).toBeNull();

    recordAuthFailure('register');
    clearAuthFailures('register');
    expect(getAuthRateLimitStatus('register')).toBeNull();
  });

  it('integrates with validation flow for repeated login attempts', () => {
    const passwordResult = getLoginPasswordResult('ValidPassword1!', 'en');
    expect(passwordResult.error).toBeUndefined();

    for (let attempt = 0; attempt < AUTH_RATE_LIMIT_MAX_FAILURES; attempt += 1) {
      recordAuthFailure('login');
    }

    expect(getAuthRateLimitStatus('login')).not.toBeNull();
  });

  it('does not crash when storage is unavailable', () => {
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    const getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });

    expect(() => recordAuthFailure('login')).not.toThrow();
    expect(() => getAuthRateLimitStatus('login')).not.toThrow();

    setItemSpy.mockRestore();
    getItemSpy.mockRestore();
  });

  it('logs debug failure counters while recording failures', () => {
    const debugSpy = vi.spyOn(authLogger, 'debug');
    recordAuthFailure('login');

    expect(debugSpy).toHaveBeenCalledWith(
      'auth.rate_limit.failure_recorded',
      expect.objectContaining({
        action: 'login',
        failureCount: 1,
        isBlocked: false,
      })
    );

    debugSpy.mockRestore();
  });
});
