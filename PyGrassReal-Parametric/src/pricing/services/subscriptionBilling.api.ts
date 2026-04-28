import { supabase } from '../../lib/supabaseClient';
import type { BillingCycle, SubscriptionEntitlement } from '../types/pricing.types';

export type SubscriptionTransactionStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export interface SubscriptionTransaction {
  id: string;
  userId: string;
  stripeSessionId: string | null;
  stripeSubscriptionId: string | null;
  stripeInvoiceId: string | null;
  planId: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: SubscriptionTransactionStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionTransactionRow {
  id: string;
  user_id: string;
  stripe_session_id: string | null;
  stripe_subscription_id: string | null;
  stripe_invoice_id: string | null;
  plan_id: string;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  status: SubscriptionTransactionStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileBillingRow {
  id: string;
  subscription_tier: string;
  subscription_status: string;
  subscription_billing_cycle: BillingCycle | null;
  subscription_current_period_end: string | null;
}

interface FinalizeCheckoutResponse {
  status?: SubscriptionTransactionStatus | string;
  error?: string;
  transaction?: {
    user_id: string;
    stripe_session_id: string | null;
    stripe_subscription_id: string | null;
    plan_id: string;
    billing_cycle: BillingCycle;
    amount: number;
    currency: string;
    paid_at: string | null;
  };
  entitlement?: SubscriptionEntitlement | null;
}

const TERMINAL_STATUSES = new Set<SubscriptionTransactionStatus>([
  'paid',
  'failed',
  'cancelled',
  'expired',
  'refunded',
]);

const mapTransaction = (row: SubscriptionTransactionRow): SubscriptionTransaction => {
  return {
    id: row.id,
    userId: row.user_id,
    stripeSessionId: row.stripe_session_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripeInvoiceId: row.stripe_invoice_id,
    planId: row.plan_id,
    billingCycle: row.billing_cycle,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const resolveAccessToken = async (): Promise<string> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Please sign in before opening billing checkout.');
  }

  return session.access_token;
};

const resolveCurrentUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Please sign in before opening billing checkout.');
  }
  return data.user.id;
};

export const isTerminalStatus = (status: SubscriptionTransactionStatus): boolean => {
  return TERMINAL_STATUSES.has(status);
};

export const fetchSubscriptionTransactionBySession = async (
  sessionId: string
): Promise<SubscriptionTransaction | null> => {
  const userId = await resolveCurrentUserId();

  const { data, error } = await supabase
    .from('transactions')
    .select(
      [
        'id',
        'user_id',
        'stripe_session_id',
        'stripe_subscription_id',
        'stripe_invoice_id',
        'plan_id',
        'billing_cycle',
        'amount',
        'currency',
        'status',
        'paid_at',
        'created_at',
        'updated_at',
      ].join(',')
    )
    .eq('stripe_session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionTransactionRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapTransaction(data);
};

export const waitForSubscriptionTransaction = async (
  sessionId: string,
  options?: {
    timeoutMs?: number;
    intervalMs?: number;
  }
): Promise<SubscriptionTransaction | null> => {
  const timeoutMs = options?.timeoutMs ?? 25000;
  const intervalMs = options?.intervalMs ?? 1600;
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const tx = await fetchSubscriptionTransactionBySession(sessionId);
    if (tx && isTerminalStatus(tx.status)) {
      return tx;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return fetchSubscriptionTransactionBySession(sessionId);
};

export const fetchCurrentEntitlement = async (): Promise<SubscriptionEntitlement | null> => {
  const userId = await resolveCurrentUserId();

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, subscription_tier, subscription_status, subscription_billing_cycle, subscription_current_period_end'
    )
    .eq('id', userId)
    .maybeSingle<ProfileBillingRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.subscription_status !== 'active' || data.subscription_tier === 'free') {
    return null;
  }

  return {
    user_id: data.id,
    plan_id: data.subscription_tier,
    billing_cycle: data.subscription_billing_cycle ?? 'monthly',
    status: 'active',
    activated_at: new Date().toISOString(),
    current_period_end: data.subscription_current_period_end,
  };
};

export const finalizeSubscriptionCheckoutSession = async (
  sessionId: string
): Promise<FinalizeCheckoutResponse> => {
  const accessToken = await resolveAccessToken();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/finalize-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ session_id: sessionId }),
  });

  const payload = (await response.json().catch(() => null)) as FinalizeCheckoutResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Failed to finalize checkout session (${response.status})`);
  }

  return payload ?? {};
};
