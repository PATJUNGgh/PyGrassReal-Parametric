import { scrubTelemetryPayloadForTesting } from './telemetry';

describe('telemetry pii scrubbing', () => {
  it('redacts direct email addresses in strings and nested objects', () => {
    const scrubbed = scrubTelemetryPayloadForTesting({
      message: 'Contact me at hello@example.com',
      nested: {
        ownerEmail: 'owner@example.com',
      },
      tags: ['first', 'team@example.com'],
    });

    expect(scrubbed.message).toBe('Contact me at [REDACTED_EMAIL]');
    expect((scrubbed.nested as Record<string, unknown>).ownerEmail).toBe('[REDACTED_EMAIL]');
    expect((scrubbed.tags as string[])[1]).toBe('[REDACTED_EMAIL]');
  });

  it('redacts email values from query parameters while preserving non-pii params', () => {
    const scrubbed = scrubTelemetryPayloadForTesting({
      url: '/pricing?email=user@example.com&from=dashboard',
      absolute: 'https://example.com/docs?owner=doc@example.com&lang=en',
    });

    expect(scrubbed.url).toBe('/pricing?email=%5BREDACTED_EMAIL%5D&from=dashboard');
    expect(scrubbed.absolute).toBe('https://example.com/docs?owner=[REDACTED_EMAIL]&lang=en');
  });

  it('redacts phone numbers and token-like values from plain strings and URL params', () => {
    const scrubbed = scrubTelemetryPayloadForTesting({
      message: 'Call +66 89-123-4567 or use Bearer abcdefghijklmnopqrstuvwxyz1234567890',
      callbackUrl:
        '/auth/callback?phone=%2B66891234567&access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc123def456ghi789jkl012mno345pqr678stu901.vwx234yzA567bcd890efg123hij456klm789nop012',
      hashUrl:
        'https://example.com/#access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc123def456ghi789jkl012mno345pqr678stu901.vwx234yzA567bcd890efg123hij456klm789nop012',
    });

    expect(scrubbed.message).toContain('[REDACTED_PHONE]');
    expect(scrubbed.message).toContain('[REDACTED_SECRET]');
    expect(scrubbed.callbackUrl).toContain('phone=%5BREDACTED_PHONE%5D');
    expect(scrubbed.callbackUrl).toContain('access_token=%5BREDACTED_SECRET%5D');
    expect(scrubbed.hashUrl).toContain('#access_token=%5BREDACTED_SECRET%5D');
  });

  it('keeps non-sensitive telemetry fields unchanged', () => {
    const scrubbed = scrubTelemetryPayloadForTesting({
      queryHash: 'q_abc123',
      queryLength: 12,
      resultCategoryCount: 3,
      hasDigits: true,
    });

    expect(scrubbed).toEqual({
      queryHash: 'q_abc123',
      queryLength: 12,
      resultCategoryCount: 3,
      hasDigits: true,
    });
  });

  it('redacts values for email-like keys and preserves date serialization', () => {
    const scrubbed = scrubTelemetryPayloadForTesting({
      actorEmail: 'not-an-email-format',
      nested: {
        backup_email: 'backup@example.com',
      },
      happenedAt: new Date('2026-02-22T10:15:30.000Z'),
    });

    expect(scrubbed.actorEmail).toBe('[REDACTED_EMAIL]');
    expect((scrubbed.nested as Record<string, unknown>).backup_email).toBe('[REDACTED_EMAIL]');
    expect(scrubbed.happenedAt).toBe('2026-02-22T10:15:30.000Z');
  });

  it('truncates overly deep objects to avoid leaking deeply nested payloads', () => {
    const deepPayload: Record<string, unknown> = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                level6: {
                  level7: {
                    level8: {
                      email: 'deep@example.com',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const scrubbed = scrubTelemetryPayloadForTesting(deepPayload);
    const level1 = scrubbed.level1 as Record<string, unknown>;
    const level2 = level1.level2 as Record<string, unknown>;
    const level3 = level2.level3 as Record<string, unknown>;
    const level4 = level3.level4 as Record<string, unknown>;
    const level5 = level4.level5 as Record<string, unknown>;
    const level6 = level5.level6 as Record<string, unknown>;
    const level7 = level6.level7 as Record<string, unknown>;

    expect(level7.level8).toBe('[TRUNCATED]');
  });

  it('redacts sensitive fields inside extended user-profile payloads', () => {
    const scrubbed = scrubTelemetryPayloadForTesting({
      userProfile: {
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: 'Jane D.',
        email: 'jane@example.com',
        backupEmail: 'private@example.com',
        phoneNumber: '+1 (415) 555-9876',
        contact_number: '+66 89 123 0000',
        authToken: 'Bearer abcdefghijklmnopqrstuvwxyz123456',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
        notes: 'Reach me via jane@example.com if needed.',
      },
      profileUrl:
        '/profile?email=jane@example.com&phone=%2B14155559876&session_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
    });

    const userProfile = scrubbed.userProfile as Record<string, unknown>;
    expect(userProfile.firstName).toBe('Jane');
    expect(userProfile.lastName).toBe('Doe');
    expect(userProfile.displayName).toBe('Jane D.');
    expect(userProfile.email).toBe('[REDACTED_EMAIL]');
    expect(userProfile.backupEmail).toBe('[REDACTED_EMAIL]');
    expect(userProfile.phoneNumber).toBe('[REDACTED_PHONE]');
    expect(userProfile.contact_number).toBe('[REDACTED_PHONE]');
    expect(userProfile.authToken).toBe('[REDACTED_SECRET]');
    expect(userProfile.refresh_token).toBe('[REDACTED_SECRET]');
    expect(userProfile.notes).toContain('[REDACTED_EMAIL]');
    expect(scrubbed.profileUrl).toContain('email=%5BREDACTED_EMAIL%5D');
    expect(scrubbed.profileUrl).toContain('phone=%5BREDACTED_PHONE%5D');
    expect(scrubbed.profileUrl).toContain('session_token=%5BREDACTED_SECRET%5D');
  });
});
