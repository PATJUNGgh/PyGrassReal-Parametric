import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { subscribeToAuthSessionChange } from '../services/auth.api';
import type { Session, User } from '@supabase/supabase-js';

interface ProfileRow {
  display_name: string | null;
  email: string | null;
}

interface ProfileState {
  id: string | null;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  isLoading: boolean;
}

const DEFAULT_PROFILE_NAME = 'User';
const TOKEN_EXPIRY_BUFFER_SECONDS = 60;
const SESSION_TIMEOUT_MS = 3000;
const PROFILE_TIMEOUT_MS = 4000;

const toTrimmedString = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : '';
};

const resolveDisplayName = (
  profileDisplayName: string | null | undefined,
  metadataDisplayName: unknown,
  email: string | null | undefined
): string => {
  const fromProfile = toTrimmedString(profileDisplayName);
  if (fromProfile) {
    return fromProfile;
  }

  const fromMetadata = toTrimmedString(metadataDisplayName);
  if (fromMetadata) {
    return fromMetadata;
  }

  const fromEmail = toTrimmedString(email).split('@')[0] ?? '';
  return fromEmail || DEFAULT_PROFILE_NAME;
};

const resolveAvatarUrl = (metadataAvatarUrl: unknown): string | null => {
  const avatar = toTrimmedString(metadataAvatarUrl);
  return avatar || null;
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: () => T
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback()), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const toProfileFromUser = (user: User): ProfileState => {
  const resolvedEmail = user.email ?? '';
  return {
    id: user.id,
    displayName: resolveDisplayName(undefined, user.user_metadata?.display_name, resolvedEmail),
    email: resolvedEmail,
    avatarUrl: resolveAvatarUrl(user.user_metadata?.avatar_url),
    isLoading: false,
  };
};

const resolveSession = async (): Promise<Session | null> => {
  const {
    data: { session },
    error,
  } = await withTimeout(
    supabase.auth.getSession(),
    SESSION_TIMEOUT_MS,
    () => ({ data: { session: null }, error: null } as Awaited<ReturnType<typeof supabase.auth.getSession>>)
  );

  if (error || !session) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const needsRefresh =
    typeof session.expires_at === 'number' &&
    session.expires_at <= nowSeconds + TOKEN_EXPIRY_BUFFER_SECONDS;

  if (!needsRefresh) {
    return session;
  }

  const { data: refreshed, error: refreshError } = await withTimeout(
    supabase.auth.refreshSession(),
    SESSION_TIMEOUT_MS,
    () => ({ data: { session: null }, error: null } as Awaited<ReturnType<typeof supabase.auth.refreshSession>>)
  );

  if (refreshError || !refreshed.session) {
    return session;
  }

  return refreshed.session;
};

export function useProfile() {
  const [profile, setProfile] = useState<ProfileState>({
    id: null,
    displayName: DEFAULT_PROFILE_NAME,
    email: '',
    avatarUrl: null,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!isMounted) {
        return;
      }

      setProfile((prev) => ({ ...prev, isLoading: true }));

      try {
        const session = await resolveSession();
        if (!isMounted) {
          return;
        }

        const user = session?.user ?? null;
        if (!user) {
          setProfile({
            id: null,
            displayName: DEFAULT_PROFILE_NAME,
            email: '',
            avatarUrl: null,
            isLoading: false,
          });
          return;
        }

        // Unblock UI immediately from session user, then hydrate from profiles table.
        setProfile(toProfileFromUser(user));

        const profileResult = await withTimeout(
          supabase
            .from('profiles')
            .select('display_name, email')
            .eq('id', user.id)
            .maybeSingle<ProfileRow>(),
          PROFILE_TIMEOUT_MS,
          () => ({ data: null, error: null } as Awaited<
            ReturnType<
              ReturnType<
                ReturnType<typeof supabase.from<never>>['select']
              >['maybeSingle']
            >
          >)
        );

        if (!isMounted) {
          return;
        }

        const resolvedEmail = toTrimmedString(profileResult.data?.email) || user.email || '';
        setProfile({
          id: user.id,
          displayName: resolveDisplayName(
            profileResult.data?.display_name,
            user.user_metadata?.display_name,
            resolvedEmail
          ),
          email: resolvedEmail,
          avatarUrl: resolveAvatarUrl(user.user_metadata?.avatar_url),
          isLoading: false,
        });
      } catch {
        if (!isMounted) {
          return;
        }
        setProfile((prev) => ({ ...prev, isLoading: false }));
      }
    };

    void loadProfile();
    const unsubscribe = subscribeToAuthSessionChange(() => {
      void loadProfile();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return profile;
}
