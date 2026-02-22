import type { AuthResult } from '../types/auth.types';

const NETWORK_DELAY_MS = 650;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isValidEmail = (email: string) => EMAIL_PATTERN.test(email);

export async function signIn(email: string, password: string): Promise<AuthResult> {
  await sleep(NETWORK_DELAY_MS);

  if (!isValidEmail(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  if (!password) {
    return { ok: false, message: 'Password is required.' };
  }

  if (normalizeEmail(email).includes('locked')) {
    return { ok: false, message: 'This account is locked. Contact support.' };
  }

  return { ok: true };
}

export async function register(email: string, password: string, name?: string): Promise<AuthResult> {
  await sleep(NETWORK_DELAY_MS);

  if (!isValidEmail(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  if (password.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' };
  }

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail.includes('taken')) {
    return { ok: false, message: 'This email is already in use.' };
  }

  if (name && name.trim().length > 0 && name.trim().length < 2) {
    return { ok: false, message: 'Display name must be at least 2 characters.' };
  }

  return { ok: true, message: 'Account created successfully.' };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  await sleep(NETWORK_DELAY_MS);

  if (!isValidEmail(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  if (normalizeEmail(email).includes('error')) {
    return { ok: false, message: 'Unable to send reset link. Please try again.' };
  }

  return { ok: true, message: 'If this email exists, we sent a reset link.' };
}
