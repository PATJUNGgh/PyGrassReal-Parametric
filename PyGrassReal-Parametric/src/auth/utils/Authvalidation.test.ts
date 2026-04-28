import { describe, expect, it } from 'vitest';
import {
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  getConfirmPasswordResult,
  getDisplayNameResult,
  getEmailResult,
  getLoginPasswordResult,
  getPasswordResult,
  getPasswordStrength,
  validateEmail,
} from './Authvalidation';

describe('auth validation (zod schemas)', () => {
  it('validates email required and format', () => {
    expect(validateEmail('', 'en')).toBe('Email is required.');
    expect(validateEmail('not-an-email', 'en')).toBe('Please enter a valid email address.');
    expect(validateEmail('user@example.com', 'en')).toBeUndefined();
  });

  it('sanitizes email and display name before validation', () => {
    const emailResult = getEmailResult('  USER@Example.com  ', 'en');
    expect(emailResult.error).toBeUndefined();
    expect(emailResult.value).toBe('user@example.com');

    const displayNameResult = getDisplayNameResult('  John   Doe  ', 'en');
    expect(displayNameResult.error).toBeUndefined();
    expect(displayNameResult.value).toBe('John Doe');
  });

  it('accepts international display names and enforces max length', () => {
    const intlResult = getDisplayNameResult('ภูมิ🙂', 'en');
    expect(intlResult.error).toBeUndefined();

    const tooLong = 'a'.repeat(DISPLAY_NAME_MAX_LENGTH + 1);
    const longResult = getDisplayNameResult(tooLong, 'en');
    expect(longResult.error).toBe(`Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`);
  });

  it('strips control and format characters from display names', () => {
    const raw = `a\u202Eb\u200Bc`;
    const result = getDisplayNameResult(raw, 'en');
    expect(result.error).toBeUndefined();
    expect(result.value).toBe('abc');
  });

  it('validates login password as required only', () => {
    const loginResult = getLoginPasswordResult('', 'en');
    expect(loginResult.error).toBe('Password is required.');
    expect(getLoginPasswordResult('simple', 'en').error).toBeUndefined();
  });

  it('enforces advanced registration password policy', () => {
    expect(getPasswordResult(' Abcdef1!', 'en').error).toBe('Password cannot start or end with spaces.');
    expect(getPasswordResult('Ab1!', 'en').error).toBe(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
    );
    expect(getPasswordResult('longpassword1!', 'en').error).toBe('Password must include at least one uppercase letter.');
    expect(getPasswordResult('LONGPASSWORD1!', 'en').error).toBe('Password must include at least one lowercase letter.');
    expect(getPasswordResult('LongPassword!', 'en').error).toBe('Password must include at least one number.');
    expect(getPasswordResult('LongPassword1', 'en').error).toBe('Password must include at least one special character.');
    expect(getPasswordResult('LongPassword1!', 'en').error).toBeUndefined();
  });

  it('validates password confirmation', () => {
    expect(getConfirmPasswordResult('LongPassword1!', '', 'en').error).toBe('Please confirm your password.');
    expect(getConfirmPasswordResult('LongPassword1!', 'LongPassword2!', 'en').error).toBe('Passwords do not match.');
    expect(getConfirmPasswordResult('LongPassword1!', 'LongPassword1!', 'en').error).toBeUndefined();
  });

  it('calculates password strength feedback', () => {
    const strength = getPasswordStrength('LongPassword1!', 'en');
    expect(strength.score).toBe(strength.maxScore);
    expect(strength.label).toBe('Strong');
    expect(strength.tone).toBe('strong');
  });

  it('handles very long inputs without throwing', () => {
    const longInput = `\u200B${'x'.repeat(DISPLAY_NAME_MAX_LENGTH + 200)}\u200B`;
    const result = getDisplayNameResult(longInput, 'en');
    expect(result.error).toBe(`Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`);
  });
});
