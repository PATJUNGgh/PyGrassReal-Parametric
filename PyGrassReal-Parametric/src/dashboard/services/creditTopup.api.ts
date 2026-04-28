import { supabase } from '../../lib/supabaseClient';
import type {
  CreditTransaction,
  CreditWallet,
  CreateCreditTopupPayload,
  CreateCreditTopupResult,
  PaginatedCreditTransactions,
} from '../types/billing.types';

interface CreditWalletRow {
  user_id: string;
  balance_usd_cents: number;
  lifetime_topup_usd_cents: number;
  balance_usd_micros?: number | null;
  lifetime_topup_usd_micros?: number | null;
}

interface CreditTransactionRow {
  id: string;
  user_id: string;
  kind: CreditTransaction['kind'];
  direction: CreditTransaction['direction'];
  amount_usd_cents: number;
  balance_after_usd_cents: number;
  status: CreditTransaction['status'];
  currency: string;
  description: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  external_reference_url: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateCustomerPortalSessionPayload {
  returnUrl?: string;
}

interface CreateCustomerPortalSessionResult {
  url: string;
}

const DEFAULT_TOPUP_AMOUNT_USD = 5;
const MIN_TOPUP_AMOUNT_USD = 2;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const BILLING_LOGIN_REQUIRED_ERROR = 'Please sign in before using Billing.';
const INVALID_AMOUNT_ERROR = 'Invalid amount format.';
const MISSING_CHECKOUT_URL_ERROR = 'Server did not return Stripe checkout URL.';
const MISSING_PORTAL_URL_ERROR = 'Server did not return Stripe portal URL.';

const resolveCurrentUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error(BILLING_LOGIN_REQUIRED_ERROR);
  }

  return data.user.id;
};

const mapWallet = (row: CreditWalletRow): CreditWallet => {
  const balanceUsdMicros =
    typeof row.balance_usd_micros === 'number' ? row.balance_usd_micros : row.balance_usd_cents * 10_000;
  const lifetimeTopupUsdMicros =
    typeof row.lifetime_topup_usd_micros === 'number'
      ? row.lifetime_topup_usd_micros
      : row.lifetime_topup_usd_cents * 10_000;

  return {
    userId: row.user_id,
    balanceUsdCents: row.balance_usd_cents,
    lifetimeTopupUsdCents: row.lifetime_topup_usd_cents,
    balanceUsdMicros,
    lifetimeTopupUsdMicros,
  };
};

const mapTransaction = (row: CreditTransactionRow): CreditTransaction => {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    direction: row.direction,
    amountUsdCents: row.amount_usd_cents,
    balanceAfterUsdCents: row.balance_after_usd_cents,
    status: row.status,
    currency: row.currency,
    description: row.description,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    externalReferenceUrl: row.external_reference_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const normalizeAmount = (amountUsd: number): number => {
  if (!Number.isFinite(amountUsd)) {
    throw new Error(INVALID_AMOUNT_ERROR);
  }

  const normalized = Number(amountUsd.toFixed(2));
  if (normalized < MIN_TOPUP_AMOUNT_USD) {
    throw new Error(`Minimum top-up amount is $${MIN_TOPUP_AMOUNT_USD.toFixed(2)}.`);
  }

  return normalized;
};

const buildTopupUrls = () => {
  const origin = window.location.origin;
  return {
    successUrl: `${origin}/dashboard/api?tab=billing&topup=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/dashboard/api?tab=billing&topup=cancelled`,
  };
};

const buildPortalReturnUrl = (): string => {
  return `${window.location.origin}/dashboard/api?tab=billing`;
};

const resolveAccessToken = async (): Promise<string> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error(BILLING_LOGIN_REQUIRED_ERROR);
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshed.session?.access_token) {
    return refreshed.session.access_token;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error(BILLING_LOGIN_REQUIRED_ERROR);
  }

  return session.access_token;
};

export const createCreditTopupSession = async (
  payload: CreateCreditTopupPayload
): Promise<CreateCreditTopupResult> => {
  const amountUsd = normalizeAmount(payload.amountUsd ?? DEFAULT_TOPUP_AMOUNT_USD);
  const accessToken = await resolveAccessToken();
  const fallbackUrls = buildTopupUrls();
  const body = {
    amount_usd: amountUsd,
    success_url: payload.successUrl ?? fallbackUrls.successUrl,
    cancel_url: payload.cancelUrl ?? fallbackUrls.cancelUrl,
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-credit-topup-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  let data: (CreateCreditTopupResult & { error?: string }) | null = null;
  try {
    data = (await response.json()) as CreateCreditTopupResult & { error?: string };
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || `Unable to create Stripe checkout session (${response.status})`);
  }

  if (!data?.url) {
    throw new Error(MISSING_CHECKOUT_URL_ERROR);
  }

  return {
    url: data.url,
    sessionId: data.sessionId,
  };
};

export const createCustomerPortalSession = async (
  payload?: CreateCustomerPortalSessionPayload
): Promise<CreateCustomerPortalSessionResult> => {
  const accessToken = await resolveAccessToken();
  const body = {
    return_url: payload?.returnUrl ?? buildPortalReturnUrl(),
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-customer-portal-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  let data: (CreateCustomerPortalSessionResult & { error?: string }) | null = null;
  try {
    data = (await response.json()) as CreateCustomerPortalSessionResult & { error?: string };
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || `Unable to open Stripe customer portal (${response.status})`);
  }

  if (!data?.url) {
    throw new Error(MISSING_PORTAL_URL_ERROR);
  }

  return { url: data.url };
};

export const fetchCreditWallet = async (): Promise<CreditWallet> => {
  const userId = await resolveCurrentUserId();

  const { data, error } = await supabase
    .from('credit_wallets')
    .select('user_id, balance_usd_cents, lifetime_topup_usd_cents, balance_usd_micros, lifetime_topup_usd_micros')
    .eq('user_id', userId)
    .maybeSingle<CreditWalletRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return {
      userId,
      balanceUsdCents: 0,
      lifetimeTopupUsdCents: 0,
      balanceUsdMicros: 0,
      lifetimeTopupUsdMicros: 0,
    };
  }

  return mapWallet(data);
};

export const fetchCreditTransactions = async (
  page: number,
  limit: number
): Promise<PaginatedCreditTransactions> => {
  const userId = await resolveCurrentUserId();
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 8;
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  const { data, error, count } = await supabase
    .from('credit_transactions')
    .select(
      [
        'id',
        'user_id',
        'kind',
        'direction',
        'amount_usd_cents',
        'balance_after_usd_cents',
        'status',
        'currency',
        'description',
        'stripe_checkout_session_id',
        'stripe_payment_intent_id',
        'external_reference_url',
        'created_at',
        'updated_at',
      ].join(','),
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const items = (data as CreditTransactionRow[] | null)?.map(mapTransaction) ?? [];
  return {
    items,
    totalCount: count ?? 0,
    page: safePage,
    pageSize: safeLimit,
  };
};
