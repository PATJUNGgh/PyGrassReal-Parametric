import { supabase } from '../../lib/supabaseClient';
import type { BillingCycle } from '../types/pricing.types';

export interface StripeCheckoutInput {
  planId: string;
  billingCycle: BillingCycle;
  stripePriceId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface StripeCheckoutResult {
  url: string;
  sessionId?: string;
}

interface EdgeErrorPayload {
  error?: string;
  message?: string;
  code?: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CHECKOUT_LOGIN_REQUIRED_ERROR = 'Please sign in again before starting checkout.';
const CHECKOUT_TIMEOUT_ERROR = 'Checkout request timed out. Please try again.';
const REQUEST_TIMEOUT_MS = 15_000;

const resolveAccessToken = async (): Promise<string> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error(CHECKOUT_LOGIN_REQUIRED_ERROR);
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshData.session?.access_token) {
    return refreshData.session.access_token;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new Error(CHECKOUT_LOGIN_REQUIRED_ERROR);
  }

  return session.access_token;
};

const assertAccessToken = async (accessToken: string): Promise<void> => {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error('Checkout auth token is invalid. Please sign in again.');
  }
};

const toErrorMessage = (status: number, payload: EdgeErrorPayload | null): string => {
  if (payload?.error && payload.error.trim().length > 0) {
    return payload.error;
  }
  if (payload?.message && payload.message.trim().length > 0) {
    return payload.message;
  }
  return `Server error: ${status}`;
};

const isJwtFailure = (message: string): boolean => /invalid jwt|jwt|unauthorized/i.test(message);

const callCreateCheckoutSession = async (
  input: StripeCheckoutInput,
  accessToken: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ ok: boolean; status: number; payload: StripeCheckoutResult | EdgeErrorPayload | null }> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        plan_id: input.planId,
        billing_cycle: input.billingCycle,
        stripe_price_id: input.stripePriceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
      signal: controller.signal,
    });

    let payload: StripeCheckoutResult | EdgeErrorPayload | null = null;
    try {
      payload = (await response.json()) as StripeCheckoutResult | EdgeErrorPayload;
    } catch {
      payload = null;
    }

    return { ok: response.ok, status: response.status, payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(CHECKOUT_TIMEOUT_ERROR);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export async function createStripeCheckoutSession(
  input: StripeCheckoutInput
): Promise<StripeCheckoutResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  const successUrl =
    input.successUrl ?? `${window.location.origin}/pricing/success?session={CHECKOUT_SESSION_ID}`;
  const cancelUrl = input.cancelUrl ?? `${window.location.origin}/pricing/cancel`;

  let accessToken = await resolveAccessToken();
  await assertAccessToken(accessToken);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await callCreateCheckoutSession(input, accessToken, successUrl, cancelUrl);
    if (response.ok) {
      const result = response.payload as StripeCheckoutResult | null;
      if (!result?.url) {
        throw new Error('Stripe Checkout URL was not returned by server.');
      }
      return result;
    }

    const payload = response.payload as EdgeErrorPayload | null;
    const errorMessage = toErrorMessage(response.status, payload);

    if (response.status === 401 && attempt === 0) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.access_token) {
        accessToken = refreshed.session.access_token;
        await assertAccessToken(accessToken);
        continue;
      }
    }

    if (response.status === 401 && isJwtFailure(errorMessage)) {
      throw new Error(`Stripe checkout auth failed (401): ${errorMessage}`);
    }

    throw new Error(errorMessage);
  }

  throw new Error('Unable to create checkout session right now.');
}

export function isStripeCheckoutAvailable(): boolean {
  return true;
}
