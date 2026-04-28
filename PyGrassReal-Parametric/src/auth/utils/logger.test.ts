import { describe, expect, it, vi } from 'vitest';
import { REDACTED_TEXT, createLogger, sanitizeLogPayload } from './logger';

describe('auth logger', () => {
  it('sanitizes emails and sensitive fields', () => {
    const payload = {
      email: 'User@Example.com',
      password: 'SuperSecret!',
      token: 'token-value',
      sessionId: 'session-123',
      nested: {
        Authorization: 'Bearer token-value',
        note: 'Reach me at User@Example.com token=abc123',
      },
      list: [
        'user@example.com',
        { refresh_token: 'refresh-value' },
        'jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.signature',
      ],
    };

    const sanitized = sanitizeLogPayload(payload) as Record<string, unknown>;

    expect(sanitized).toEqual({
      email: 'u***@example.com',
      password: REDACTED_TEXT,
      token: REDACTED_TEXT,
      sessionId: 'session-123',
      nested: {
        Authorization: REDACTED_TEXT,
        note: `Reach me at u***@example.com token=${REDACTED_TEXT}`,
      },
      list: ['u***@example.com', { refresh_token: REDACTED_TEXT }, `jwt ${REDACTED_TEXT}`],
    });
  });

  it('suppresses debug/info in production', () => {
    const consoleStub = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const logger = createLogger({ isProd: true, console: consoleStub, name: 'auth' });

    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    expect(consoleStub.debug).not.toHaveBeenCalled();
    expect(consoleStub.info).not.toHaveBeenCalled();
    expect(consoleStub.warn).toHaveBeenCalledTimes(1);
    expect(consoleStub.error).toHaveBeenCalledTimes(1);
  });
});
