import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import type { AuthErrorKind, AuthResult } from '../types/auth.types';
import { authLogger } from '../utils/logger';

interface SupabaseErrorLike {
  message?: string | null;
  status?: number | null;
}

const NETWORK_ERROR_PATTERN = /network|fetch|timed out|timeout|connection|offline|enotfound|econn/i;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const toSessionLifecyclePayload = (session: Session | null) => ({
  isAuthenticated: Boolean(session),
  userId: session?.user?.id ?? null,
  expiresAt: session?.expires_at ?? null,
});

const getErrorKind = (error: SupabaseErrorLike): AuthErrorKind => {
  const message = error.message?.toLowerCase() ?? '';
  if (error.status === 0 || NETWORK_ERROR_PATTERN.test(message)) {
    return 'network';
  }
  if (message.includes('invalid') || message.includes('already') || message.includes('not confirmed')) {
    return 'auth';
  }
  return 'unknown';
};

const mapErrorMessage = (error: SupabaseErrorLike, fallbackMessage: string): string => {
  const rawMessage = error.message?.trim();
  if (!rawMessage) {
    return fallbackMessage;
  }

  const normalizedMessage = rawMessage.toLowerCase();
  if (normalizedMessage.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (normalizedMessage.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (normalizedMessage.includes('user already registered')) {
    return 'This email is already in use.';
  }
  if (normalizedMessage.includes('signup is disabled')) {
    return 'Registration is currently unavailable.';
  }

  return rawMessage;
};

const failureResult = (
  error: SupabaseErrorLike,
  fallbackMessage: string,
  errorKind?: AuthErrorKind
): AuthResult => ({
  ok: false,
  message: mapErrorMessage(error, fallbackMessage),
  errorKind: errorKind ?? getErrorKind(error),
});

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const startedAt = Date.now();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
  const durationMs = Date.now() - startedAt;
  authLogger.debug('auth.sign_in.timing', { durationMs });

  if (error) {
    const errorKind = getErrorKind(error);
    authLogger.error('auth.sign_in.error', {
      errorKind,
      status: error.status ?? undefined,
      message: error.message ?? undefined,
    });
    return failureResult(error, 'Unable to sign in right now. Please try again.', errorKind);
  }

  if (data?.user?.id) {
    authLogger.info('auth.sign_in.success', { userId: data.user.id });
  }

  return { ok: true };
}

export async function register(email: string, password: string, name?: string): Promise<AuthResult> {
  const trimmedName = name?.trim() ?? '';
  const startedAt = Date.now();
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: trimmedName ? { display_name: trimmedName } : undefined,
    },
  });
  const durationMs = Date.now() - startedAt;
  authLogger.debug('auth.register.timing', { durationMs });

  if (error) {
    const errorKind = getErrorKind(error);
    authLogger.error('auth.register.error', {
      errorKind,
      status: error.status ?? undefined,
      message: error.message ?? undefined,
    });
    return failureResult(error, 'Unable to create an account right now.', errorKind);
  }

  if (data.user?.id) {
    authLogger.info('auth.register.success', { userId: data.user.id });
  }

  if (data.user && !data.session) {
    return {
      ok: true,
      message: 'Account created. Please verify your email before signing in.',
    };
  }

  return { ok: true };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const redirectTo = `${window.location.origin}/auth/login`;
  const startedAt = Date.now();
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });
  const durationMs = Date.now() - startedAt;
  authLogger.debug('auth.password_reset.timing', { durationMs });
  authLogger.info('auth.password_reset.requested', { email: normalizedEmail });

  if (error) {
    const errorKind = getErrorKind(error);
    authLogger.error('auth.password_reset.error', {
      email: normalizedEmail,
      errorKind,
      status: error.status ?? undefined,
      message: error.message ?? undefined,
    });
    return failureResult(error, 'Unable to send reset link. Please try again.', errorKind);
  }

  return { ok: true, message: 'If this email exists, we sent a reset link.' };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    const errorKind = getErrorKind(error);
    authLogger.error('auth.sign_out.error', {
      errorKind,
      status: error.status ?? undefined,
      message: error.message ?? undefined,
    });
    return failureResult(error, 'Unable to sign out right now.', errorKind);
  }
  authLogger.info('auth.sign_out.success');
  return { ok: true };
}

export async function getCurrentAuthSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      authLogger.error('auth.session.read_failed', {
        status: error.status ?? undefined,
        message: error.message ?? undefined,
      });
      return null;
    }

    const session = data.session;
    if (!session?.access_token) {
      return null;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(session.access_token);
    if (userError || !userData.user) {
      authLogger.warn('auth.session.invalid_token', {
        status: userError?.status ?? undefined,
        message: userError?.message ?? undefined,
      });
      await supabase.auth.signOut();
      return null;
    }

    return session;
  } catch (error) {
    authLogger.error('auth.session.read_failed', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

export function subscribeToAuthSessionChange(onSessionChange: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      void (async () => {
        const { data: userData, error: userError } = await supabase.auth.getUser(session.access_token);
        if (userError || !userData.user) {
          authLogger.warn('auth.session.invalid_token_on_event', {
            event,
            status: userError?.status ?? undefined,
            message: userError?.message ?? undefined,
          });
          await supabase.auth.signOut();
          onSessionChange(null);
          return;
        }

        authLogger.info('auth.session.state_changed', {
          event,
          ...toSessionLifecyclePayload(session),
        });
        onSessionChange(session);
      })();
      return;
    }

    authLogger.info('auth.session.state_changed', {
      event,
      ...toSessionLifecyclePayload(session),
    });
    onSessionChange(session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
