import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REQUEST_TIMEOUT_MS = 15_000;
const SUBSCRIBER_CONFIRM_RETRIES = 8;
const SUBSCRIBER_CONFIRM_DELAY_MS = 500;

interface EdgeErrorPayload {
  error?: string;
  message?: string;
}

export interface PlatformSubscriber {
  id: string;
  email: string | null;
  displayName: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface PlatformSubscriberRow {
  id: string;
  email: string | null;
  display_name: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ListSubscribersPayload {
  subscribers?: PlatformSubscriberRow[];
}

interface CreateSubscriberPayload {
  subscriber?: PlatformSubscriberRow;
  temporaryPassword?: string | null;
  created?: boolean;
}

export interface CreatePlatformSubscriberInput {
  email: string;
  displayName?: string;
  password?: string;
}

export interface CreatePlatformSubscriberResult {
  subscriber: PlatformSubscriber;
  temporaryPassword: string | null;
  created: boolean;
}

const resolveAccessToken = async (): Promise<string> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Please sign in before managing subscribers.');
  }

  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed.session?.access_token) {
    return refreshed.session.access_token;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error('Please sign in again before managing subscribers.');
  }

  return session.access_token;
};

const toErrorMessage = (status: number, payload: EdgeErrorPayload | null): string => {
  const message = payload?.error || payload?.message;
  if (message?.trim()) {
    return message;
  }

  return `Unable to manage subscribers (${status})`;
};

const mapSubscriber = (row: PlatformSubscriberRow): PlatformSubscriber => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  subscriptionTier: row.subscription_tier ?? 'free',
  subscriptionStatus: row.subscription_status ?? 'inactive',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeEmail = (value: string | null | undefined): string => {
  return (value ?? '').trim().toLowerCase();
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

const createTemporaryPassword = (): string => {
  const random = globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 14) ?? String(Date.now());
  return `PgR-${random}!9`;
};

const fetchClientReadableSubscribers = async (): Promise<PlatformSubscriber[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, subscription_tier, subscription_status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return ((data as PlatformSubscriberRow[] | null) ?? []).map(mapSubscriber);
};

const findReadableSubscriberByEmail = async (
  email: string,
  attempts = SUBSCRIBER_CONFIRM_RETRIES
): Promise<PlatformSubscriber | null> => {
  const requestedEmail = normalizeEmail(email);

  for (let index = 0; index < attempts; index += 1) {
    const rows = await fetchClientReadableSubscribers();
    const match = rows.find((subscriber) => normalizeEmail(subscriber.email) === requestedEmail);
    if (match) {
      return match;
    }

    if (index < attempts - 1) {
      await delay(SUBSCRIBER_CONFIRM_DELAY_MS);
    }
  }

  return null;
};

const requestPlatformSubscribers = async <T>(method: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<T> => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  const accessToken = await resolveAccessToken();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/platform-subscribers`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
      signal: controller.signal,
    });

    let payload: T | EdgeErrorPayload | null = null;
    try {
      payload = (await response.json()) as T | EdgeErrorPayload;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(toErrorMessage(response.status, payload as EdgeErrorPayload | null));
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Subscriber request timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const createSubscriberWithClientSignup = async (
  input: CreatePlatformSubscriberInput,
  requestedEmail: string,
  preferredPassword?: string | null
): Promise<CreatePlatformSubscriberResult> => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  const displayName = input.displayName?.trim() || requestedEmail.split('@')[0];
  const password = input.password?.trim() || preferredPassword?.trim() || createTemporaryPassword();
  const isolatedSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
      storageKey: `platform-subscriber-${Date.now()}`,
    },
  });

  const { error } = await isolatedSupabase.auth.signUp({
    email: requestedEmail,
    password,
    options: {
      data: {
        display_name: displayName,
        source: 'platform-revenue-admin',
      },
    },
  });
  await isolatedSupabase.auth.signOut();

  if (error && !/already|registered|exists/i.test(error.message)) {
    throw new Error(error.message);
  }

  const subscriber = await findReadableSubscriberByEmail(requestedEmail);
  if (!subscriber) {
    throw new Error(`Supabase accepted ${requestedEmail}, but the profile row is not visible yet. Click refresh subscribers and check Auth Users.`);
  }

  return {
    subscriber,
    temporaryPassword: password,
    created: !error,
  };
};

export const fetchPlatformSubscribers = async (): Promise<PlatformSubscriber[]> => {
  try {
    const payload = await requestPlatformSubscribers<ListSubscribersPayload>('GET');
    return (payload.subscribers ?? []).map(mapSubscriber);
  } catch {
    return fetchClientReadableSubscribers();
  }
};

export const createPlatformSubscriber = async (
  input: CreatePlatformSubscriberInput
): Promise<CreatePlatformSubscriberResult> => {
  const requestedEmail = normalizeEmail(input.email);
  if (!requestedEmail) {
    throw new Error('Please enter a subscriber email.');
  }

  let payload: CreateSubscriberPayload;
  try {
    payload = await requestPlatformSubscribers<CreateSubscriberPayload>('POST', {
      email: requestedEmail,
      display_name: input.displayName,
      password: input.password,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const canUseClientSignup =
      /temporarily unavailable|manage subscribers \(5\d\d\)|failed to fetch|timed out|single JSON object|cannot coerce|invalid input syntax for type uuid|uuid.*undefined|valid user id|created subscriber without/i.test(
        message
      );
    if (!canUseClientSignup) {
      throw error;
    }

    return createSubscriberWithClientSignup(input, requestedEmail, input.password);
  }

  if (!payload.subscriber) {
    throw new Error('Supabase did not return the created subscriber.');
  }

  const edgeSubscriber = mapSubscriber(payload.subscriber);
  if (normalizeEmail(edgeSubscriber.email) !== requestedEmail) {
    return createSubscriberWithClientSignup(input, requestedEmail, payload.temporaryPassword);
  }

  const persistedSubscriber = await findReadableSubscriberByEmail(requestedEmail);
  if (!persistedSubscriber) {
    return createSubscriberWithClientSignup(input, requestedEmail, payload.temporaryPassword);
  }

  return {
    subscriber: persistedSubscriber,
    temporaryPassword: payload.temporaryPassword ?? null,
    created: Boolean(payload.created),
  };
};

export const deletePlatformSubscriber = async (subscriber: Pick<PlatformSubscriber, 'id' | 'email'>): Promise<void> => {
  await requestPlatformSubscribers<{ deleted?: boolean }>('DELETE', {
    user_id: subscriber.id,
    email: subscriber.email,
  });
};
