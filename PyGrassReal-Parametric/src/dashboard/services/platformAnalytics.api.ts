import { supabase } from '../../lib/supabaseClient';

export type PlatformPaymentSource = 'subscription' | 'credit_topup';
export type OpenRouterSettlementStatus = 'paid' | 'unpaid' | 'not_required';

export const OPENROUTER_COST_RATE = 0.7;
export const PLATFORM_REVENUE_RATE = 0.3;

export interface PlatformAnalyticsTotals {
  totalSignups: number;
  signupsLastWindow: number;
  totalPaidUsers: number;
  newPaidUsersLastWindow: number;
  activePaidSubscribers: number;
  totalRevenueUsd: number;
  revenueLastWindowUsd: number;
  subscriptionRevenueUsd: number;
  creditTopupRevenueUsd: number;
  totalPaidTransactions: number;
  paidTransactionsLastWindow: number;
  nonUsdTransactionCount: number;
}

export interface PlatformAnalyticsHourlyRow {
  bucketStart: string;
  signups: number;
  paidUsers: number;
  paidTransactions: number;
  revenueUsd: number;
  customerPaidUsd: number;
  openRouterCostUsd: number;
  platformRevenueUsd: number;
  openRouterStatus: OpenRouterSettlementStatus;
  openRouterPaidAt: string | null;
  cumulativeSignups: number;
  cumulativePaidUsers: number;
}

export interface PlatformAnalyticsPlanBreakdown {
  planId: string;
  activeSubscribers: number;
}

export interface PlatformAnalyticsCurrencyBreakdown {
  currencyCode: string;
  paidTransactions: number;
  revenueAmount: number;
}

export interface PlatformAnalyticsPaymentRow {
  id: string;
  paidAt: string;
  source: PlatformPaymentSource;
  customerId: string | null;
  amountUsd: number;
  amount: number;
  currencyCode: string;
  planId: string | null;
  billingCycle: string | null;
  description: string | null;
  externalReferenceUrl: string | null;
}

export interface PlatformAnalyticsSnapshot {
  generatedAt: string;
  windowHours: number;
  totals: PlatformAnalyticsTotals;
  hourly: PlatformAnalyticsHourlyRow[];
  planBreakdown: PlatformAnalyticsPlanBreakdown[];
  currencyBreakdown: PlatformAnalyticsCurrencyBreakdown[];
  recentPayments: PlatformAnalyticsPaymentRow[];
  isFallback?: boolean;
  fallbackReason?: string;
}

export interface CreateStripeTestPaymentInput {
  email: string;
  amountUsd: number;
  source: PlatformPaymentSource;
  planId?: string | null;
  billingCycle?: string | null;
}

export interface PlatformCreditWalletByEmail {
  email: string;
  userId: string;
  balanceUsdCents: number;
  lifetimeTopupUsdCents: number;
  balanceUsdMicros: number;
  lifetimeTopupUsdMicros: number;
  updatedAt: string | null;
}

interface EdgeErrorPayload {
  error?: string;
  message?: string;
}

class EdgeRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'EdgeRequestError';
    this.status = status;
  }
}

interface ProfileRow {
  id: string;
  created_at: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
}

interface SubscriptionTransactionRow {
  id: string;
  user_id: string | null;
  plan_id: string | null;
  billing_cycle: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string;
  paid_at: string | null;
  created_at: string | null;
  external_reference_url: string | null;
}

interface CreditTransactionRow {
  id: string;
  user_id: string | null;
  kind: string;
  direction: string;
  amount_usd_cents: number | null;
  status: string;
  currency: string | null;
  description: string | null;
  external_reference_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REQUEST_TIMEOUT_MS = 15_000;
const LOCAL_SETTLEMENT_STORAGE_KEY = 'platform-openrouter-hourly-settlements';
const LOCAL_STRIPE_TEST_PAYMENTS_STORAGE_KEY = 'platform-stripe-test-payments';
const LOCAL_STRIPE_TEST_PENDING_MAX_AGE_MS = 15 * 60 * 1000;

const resolveAccessToken = async (): Promise<string> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Please sign in before viewing platform revenue.');
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
    throw new Error('Please sign in again before viewing platform revenue.');
  }

  return session.access_token;
};

const toErrorMessage = (status: number, payload: EdgeErrorPayload | null): string => {
  const message = payload?.error || payload?.message;
  if (message?.trim()) {
    return message;
  }

  return `Unable to load platform revenue (${status})`;
};

const toNumber = (value: number | string | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCurrency = (currency: string | null | undefined): string => {
  return (currency ?? 'USD').trim().toUpperCase() || 'USD';
};

const parseDateMs = (value: string | null | undefined): number => {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIso = (ms: number): string => new Date(ms).toISOString();

const startOfCurrentHour = (): number => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.getTime();
};

const toMoney = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Number(value.toFixed(2));
};

const createLocalId = (prefix: string): string => {
  const uuid = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${uuid.replace(/-/g, '')}`;
};

const normalizeBucketStart = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setMinutes(0, 0, 0);
  return date.toISOString();
};

interface LocalStripeTestPaymentRow {
  id: string;
  email: string;
  amountUsd: number;
  source: PlatformPaymentSource;
  paidAt: string;
  planId: string | null;
  billingCycle: string | null;
  stripeSessionId: string;
  stripePaymentIntentId: string;
}

const readLocalStripeTestPaymentRows = (): LocalStripeTestPaymentRow[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_STRIPE_TEST_PAYMENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as LocalStripeTestPaymentRow[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((row) => (
      typeof row.id === 'string' &&
      typeof row.email === 'string' &&
      Number.isFinite(Number(row.amountUsd)) &&
      (row.source === 'subscription' || row.source === 'credit_topup')
    ));
  } catch {
    return [];
  }
};

const writeLocalStripeTestPaymentRows = (rows: LocalStripeTestPaymentRow[]): void => {
  window.localStorage.setItem(LOCAL_STRIPE_TEST_PAYMENTS_STORAGE_KEY, JSON.stringify(rows));
};

const mapLocalStripeTestPayment = (row: LocalStripeTestPaymentRow): PlatformAnalyticsPaymentRow => ({
  id: row.id,
  paidAt: row.paidAt,
  source: row.source,
  customerId: row.email,
  amountUsd: toMoney(row.amountUsd),
  amount: toMoney(row.amountUsd),
  currencyCode: 'USD',
  planId: row.source === 'subscription' ? row.planId ?? 'starter' : null,
  billingCycle: row.source === 'subscription' ? row.billingCycle ?? 'monthly' : null,
  description:
    row.source === 'credit_topup'
      ? `Stripe TEST top-up paid (${row.stripeSessionId})`
      : `Stripe TEST subscription paid (${row.stripeSessionId})`,
  externalReferenceUrl: `https://dashboard.stripe.com/test/payments/${row.stripePaymentIntentId}`,
});

const paymentRowKey = (row: Pick<PlatformAnalyticsPaymentRow, 'source' | 'id'>): string => (
  `${row.source}:${row.id}`
);

const localPaymentRowKey = (row: Pick<LocalStripeTestPaymentRow, 'source' | 'id'>): string => (
  `${row.source}:${row.id}`
);

const readLocalSettlementMap = (): Record<string, { status: 'paid' | 'unpaid'; paidAt: string | null }> => {
  try {
    const raw = window.localStorage.getItem(LOCAL_SETTLEMENT_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, { status?: string; paidAt?: string | null }>;
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([bucketStart, item]) => {
        if (item.status !== 'paid' && item.status !== 'unpaid') {
          return [];
        }

        return [[bucketStart, { status: item.status, paidAt: item.paidAt ?? null }]];
      })
    );
  } catch {
    return {};
  }
};

const writeLocalSettlement = (
  bucketStart: string,
  status: 'paid' | 'unpaid'
): { status: 'paid' | 'unpaid'; paidAt: string | null } => {
  const normalizedBucket = normalizeBucketStart(bucketStart);
  const current = readLocalSettlementMap();
  const next = {
    status,
    paidAt: status === 'paid' ? new Date().toISOString() : null,
  };

  current[normalizedBucket] = next;
  window.localStorage.setItem(LOCAL_SETTLEMENT_STORAGE_KEY, JSON.stringify(current));
  return next;
};

const resolveSettlementForBucket = (
  bucketStart: string,
  customerPaidUsd: number
): { status: OpenRouterSettlementStatus; paidAt: string | null } => {
  if (customerPaidUsd <= 0) {
    return { status: 'not_required', paidAt: null };
  }

  const local = readLocalSettlementMap()[normalizeBucketStart(bucketStart)];
  if (local) {
    return {
      status: local.status,
      paidAt: local.paidAt,
    };
  }

  return { status: 'unpaid', paidAt: null };
};

export const getStripeTestPaymentCount = (): number => {
  return readLocalStripeTestPaymentRows().length;
};

export const fetchCreditWalletByEmail = async (
  emailInput: string
): Promise<PlatformCreditWalletByEmail> => {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid test customer email.');
  }

  const accessToken = await resolveAccessToken();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/platform-analytics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: 'get_credit_wallet_by_email',
      email,
    }),
  });

  let payload: { wallet?: PlatformCreditWalletByEmail } & EdgeErrorPayload | null = null;
  try {
    payload = (await response.json()) as ({ wallet?: PlatformCreditWalletByEmail } & EdgeErrorPayload) | null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = toErrorMessage(response.status, payload);
    if (/bucket_start|status must be paid or unpaid/i.test(message)) {
      throw new Error('platform-analytics function is outdated. Deploy the latest function to view credit balance by email.');
    }
    throw new Error(message);
  }

  if (!payload?.wallet) {
    throw new Error('Credit wallet lookup did not return wallet data.');
  }

  return payload.wallet;
};

export const createStripeTestPayment = async (
  input: CreateStripeTestPaymentInput
): Promise<PlatformAnalyticsPaymentRow> => {
  const email = input.email.trim().toLowerCase();
  const amountUsd = toMoney(input.amountUsd);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid test customer email.');
  }

  if (amountUsd <= 0) {
    throw new Error('Test payment amount must be greater than 0.');
  }

  if (input.source !== 'credit_topup') {
    throw new Error('Stripe TEST currently supports credit top-up payments only.');
  }

  const accessToken = await resolveAccessToken();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/platform-analytics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: 'create_test_credit_topup',
      email,
      amount_usd: amountUsd,
    }),
  });

  let payload: { payment?: PlatformAnalyticsPaymentRow } & EdgeErrorPayload | null = null;
  try {
    payload = (await response.json()) as ({ payment?: PlatformAnalyticsPaymentRow } & EdgeErrorPayload) | null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(toErrorMessage(response.status, payload));
  }

  if (!payload?.payment) {
    throw new Error('Stripe TEST did not return a payment row.');
  }

  // บันทึก payment ลง localStorage ด้วย เพื่อให้ mergeLocalStripeTestPayments แสดงผลทันทีในกราฟ
  // แม้ Edge Function จะบันทึก DB แล้ว แต่ refetch อาจยังช้า 1 รอบ
  const remotePayment = payload.payment;
  const stripeSessionId = remotePayment.id;
  const stripePaymentIntentId = remotePayment.externalReferenceUrl?.split('/').pop() ?? createLocalId('pi_test_remote');
  const localRow: LocalStripeTestPaymentRow = {
    id: stripeSessionId,
    email,
    amountUsd,
    source: input.source,
    paidAt: remotePayment.paidAt ?? new Date().toISOString(),
    planId: remotePayment.planId ?? null,
    billingCycle: remotePayment.billingCycle ?? null,
    stripeSessionId,
    stripePaymentIntentId,
  };
  const existingRows = readLocalStripeTestPaymentRows();
  // ป้องกัน duplicate: ถ้า id นี้มีอยู่แล้วใน localStorage ไม่ต้องเพิ่มซ้ำ
  if (!existingRows.some((row) => row.id === stripeSessionId)) {
    writeLocalStripeTestPaymentRows([localRow, ...existingRows].slice(0, 100));
  }

  return remotePayment;
};

export const createLocalStripeTestPayment = (
  input: CreateStripeTestPaymentInput
): PlatformAnalyticsPaymentRow => {
  const email = input.email.trim().toLowerCase();
  const amountUsd = toMoney(input.amountUsd);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid test customer email.');
  }

  if (amountUsd <= 0) {
    throw new Error('Test payment amount must be greater than 0.');
  }

  const row: LocalStripeTestPaymentRow = {
    id: createLocalId('stripe_test_payment'),
    email,
    amountUsd,
    source: input.source,
    paidAt: new Date().toISOString(),
    planId: input.source === 'subscription' ? input.planId?.trim() || 'starter' : null,
    billingCycle: input.source === 'subscription' ? input.billingCycle?.trim() || 'monthly' : null,
    stripeSessionId: createLocalId('cs_test_local'),
    stripePaymentIntentId: createLocalId('pi_test_local'),
  };

  const rows = [row, ...readLocalStripeTestPaymentRows()].slice(0, 100);
  writeLocalStripeTestPaymentRows(rows);
  return mapLocalStripeTestPayment(row);
};

export const clearStripeTestPayments = (): void => {
  window.localStorage.removeItem(LOCAL_STRIPE_TEST_PAYMENTS_STORAGE_KEY);
};

const mapSubscriptionPayment = (row: SubscriptionTransactionRow): PlatformAnalyticsPaymentRow => {
  const currencyCode = normalizeCurrency(row.currency);
  const amount = toNumber(row.amount);

  return {
    id: row.id,
    paidAt: row.paid_at ?? row.created_at ?? new Date().toISOString(),
    source: 'subscription',
    customerId: row.user_id,
    amountUsd: currencyCode === 'USD' ? amount : 0,
    amount,
    currencyCode,
    planId: row.plan_id,
    billingCycle: row.billing_cycle,
    description: null,
    externalReferenceUrl: row.external_reference_url,
  };
};

const mapCreditPayment = (row: CreditTransactionRow): PlatformAnalyticsPaymentRow => {
  const amount = toNumber(row.amount_usd_cents) / 100;

  return {
    id: row.id,
    paidAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    source: 'credit_topup',
    customerId: row.user_id,
    amountUsd: amount,
    amount,
    currencyCode: 'USD',
    planId: null,
    billingCycle: null,
    description: row.description,
    externalReferenceUrl: row.external_reference_url,
  };
};

const buildHourlyRows = (
  payments: PlatformAnalyticsPaymentRow[],
  profiles: ProfileRow[],
  hours: number
): PlatformAnalyticsHourlyRow[] => {
  const safeHours = Math.max(1, Math.min(Math.trunc(hours), 168));
  const currentHour = startOfCurrentHour();
  const windowStart = currentHour - (safeHours - 1) * 60 * 60 * 1000;
  const firstPaidMs = payments.reduce((min, payment) => {
    const ms = parseDateMs(payment.paidAt);
    if (!ms) return min;
    return min === 0 ? ms : Math.min(min, ms);
  }, 0);
  const bucketStarts = new Set<number>();

  for (let index = 0; index < safeHours; index += 1) {
    bucketStarts.add(windowStart + index * 60 * 60 * 1000);
  }

  for (const payment of payments) {
    if (payment.currencyCode !== 'USD') {
      continue;
    }

    const paidAtMs = parseDateMs(payment.paidAt);
    if (!paidAtMs) {
      continue;
    }

    const paidAtHour = new Date(paidAtMs);
    paidAtHour.setMinutes(0, 0, 0);
    bucketStarts.add(paidAtHour.getTime());
  }

  return Array.from(bucketStarts).sort((a, b) => a - b).map((bucketStart) => {
    const bucketEnd = bucketStart + 60 * 60 * 1000;
    const bucketPayments = payments.filter((payment) => {
      const ms = parseDateMs(payment.paidAt);
      return ms >= bucketStart && ms < bucketEnd && payment.currencyCode === 'USD';
    });
    const signups = profiles.filter((profile) => {
      const ms = parseDateMs(profile.created_at);
      return ms >= bucketStart && ms < bucketEnd;
    }).length;
    const paidUsers = firstPaidMs >= bucketStart && firstPaidMs < bucketEnd ? 1 : 0;
    const cumulativeSignups = profiles.filter((profile) => {
      const ms = parseDateMs(profile.created_at);
      return ms > 0 && ms < bucketEnd;
    }).length;
    const cumulativePaidUsers = firstPaidMs && firstPaidMs < bucketEnd ? 1 : 0;
    const revenueUsd = bucketPayments.reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0);
    const customerPaidUsd = toMoney(revenueUsd);
    const openRouterCostUsd = toMoney(customerPaidUsd * OPENROUTER_COST_RATE);
    const platformRevenueUsd = toMoney(customerPaidUsd * PLATFORM_REVENUE_RATE);
    const settlement = resolveSettlementForBucket(toIso(bucketStart), customerPaidUsd);

    return {
      bucketStart: toIso(bucketStart),
      signups,
      paidUsers,
      paidTransactions: bucketPayments.length,
      revenueUsd: customerPaidUsd,
      customerPaidUsd,
      openRouterCostUsd,
      platformRevenueUsd,
      openRouterStatus: settlement.status,
      openRouterPaidAt: settlement.paidAt,
      cumulativeSignups,
      cumulativePaidUsers,
    };
  });
};

const buildFallbackSnapshot = (
  payments: PlatformAnalyticsPaymentRow[],
  profiles: ProfileRow[],
  hours: number,
  fallbackReason: string
): PlatformAnalyticsSnapshot => {
  const safeHours = Math.max(1, Math.min(Math.trunc(hours), 168));
  const currentHour = startOfCurrentHour();
  const windowStart = currentHour - (safeHours - 1) * 60 * 60 * 1000;
  const windowEnd = currentHour + 60 * 60 * 1000;
  const usdPayments = payments.filter((payment) => payment.currencyCode === 'USD');
  const windowPayments = usdPayments.filter((payment) => {
    const ms = parseDateMs(payment.paidAt);
    return ms >= windowStart && ms < windowEnd;
  });
  const firstPaidMs = payments.reduce((min, payment) => {
    const ms = parseDateMs(payment.paidAt);
    if (!ms) return min;
    return min === 0 ? ms : Math.min(min, ms);
  }, 0);
  const totalRevenueUsd = usdPayments.reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0);
  const revenueLastWindowUsd = windowPayments.reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0);
  const paidUsers = payments.length > 0 ? 1 : 0;
  const signupsLastWindow = profiles.filter((profile) => {
    const ms = parseDateMs(profile.created_at);
    return ms >= windowStart && ms < windowEnd;
  }).length;
  const activePaidProfiles = profiles.filter((profile) => (
    profile.subscription_status === 'active' && (profile.subscription_tier ?? 'free') !== 'free'
  ));
  const activePaidSubscribers = activePaidProfiles.length;
  const planMap = new Map<string, number>();

  for (const profile of activePaidProfiles) {
    const planId = profile.subscription_tier ?? 'unknown';
    planMap.set(planId, (planMap.get(planId) ?? 0) + 1);
  }
  const currencyMap = new Map<string, { paidTransactions: number; revenueAmount: number }>();

  for (const payment of payments) {
    const current = currencyMap.get(payment.currencyCode) ?? { paidTransactions: 0, revenueAmount: 0 };
    current.paidTransactions += 1;
    current.revenueAmount += toNumber(payment.amount);
    currencyMap.set(payment.currencyCode, current);
  }

  return {
    generatedAt: new Date().toISOString(),
    windowHours: safeHours,
    totals: {
      totalSignups: profiles.length,
      signupsLastWindow,
      totalPaidUsers: paidUsers,
      newPaidUsersLastWindow: firstPaidMs >= windowStart && firstPaidMs < windowEnd ? 1 : 0,
      activePaidSubscribers,
      totalRevenueUsd: Number(totalRevenueUsd.toFixed(2)),
      revenueLastWindowUsd: Number(revenueLastWindowUsd.toFixed(2)),
      subscriptionRevenueUsd: Number(
        usdPayments
          .filter((payment) => payment.source === 'subscription')
          .reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0)
          .toFixed(2)
      ),
      creditTopupRevenueUsd: Number(
        usdPayments
          .filter((payment) => payment.source === 'credit_topup')
          .reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0)
          .toFixed(2)
      ),
      totalPaidTransactions: usdPayments.length,
      paidTransactionsLastWindow: windowPayments.length,
      nonUsdTransactionCount: payments.length - usdPayments.length,
    },
    hourly: buildHourlyRows(payments, profiles, safeHours),
    planBreakdown: Array.from(planMap.entries()).map(([planId, activeSubscribers]) => ({
      planId,
      activeSubscribers,
    })),
    currencyBreakdown: Array.from(currencyMap.entries()).map(([currencyCode, value]) => ({
      currencyCode,
      paidTransactions: value.paidTransactions,
      revenueAmount: Number(value.revenueAmount.toFixed(2)),
    })),
    recentPayments: [...payments].sort((a, b) => parseDateMs(b.paidAt) - parseDateMs(a.paidAt)).slice(0, 50),
    isFallback: true,
    fallbackReason,
  };
};

const buildTestPaymentHourlyRows = (
  baseRows: PlatformAnalyticsHourlyRow[],
  testPayments: PlatformAnalyticsPaymentRow[],
  hours: number
): PlatformAnalyticsHourlyRow[] => {
  const safeHours = Math.max(1, Math.min(Math.trunc(hours), 168));
  const currentHour = startOfCurrentHour();
  const windowStart = currentHour - (safeHours - 1) * 60 * 60 * 1000;
  const rowsByBucket = new Map<string, PlatformAnalyticsHourlyRow>();
  const firstPaymentByCustomer = new Map<string, number>();

  for (const row of baseRows) {
    rowsByBucket.set(normalizeBucketStart(row.bucketStart), { ...row });
  }

  for (const payment of testPayments) {
    const customer = payment.customerId?.trim().toLowerCase();
    if (!customer) {
      continue;
    }

    const paidAtMs = parseDateMs(payment.paidAt);
    if (!paidAtMs) {
      continue;
    }

    const current = firstPaymentByCustomer.get(customer);
    if (!current || paidAtMs < current) {
      firstPaymentByCustomer.set(customer, paidAtMs);
    }
  }

  for (let index = 0; index < safeHours; index += 1) {
    const bucketStart = normalizeBucketStart(toIso(windowStart + index * 60 * 60 * 1000));
    if (!rowsByBucket.has(bucketStart)) {
      rowsByBucket.set(bucketStart, {
        bucketStart,
        signups: 0,
        paidUsers: 0,
        paidTransactions: 0,
        revenueUsd: 0,
        customerPaidUsd: 0,
        openRouterCostUsd: 0,
        platformRevenueUsd: 0,
        openRouterStatus: 'not_required',
        openRouterPaidAt: null,
        cumulativeSignups: 0,
        cumulativePaidUsers: 0,
      });
    }
  }

  for (const payment of testPayments) {
    const bucketStart = normalizeBucketStart(payment.paidAt);
    const row = rowsByBucket.get(bucketStart) ?? {
      bucketStart,
      signups: 0,
      paidUsers: 0,
      paidTransactions: 0,
      revenueUsd: 0,
      customerPaidUsd: 0,
      openRouterCostUsd: 0,
      platformRevenueUsd: 0,
      openRouterStatus: 'not_required' as OpenRouterSettlementStatus,
      openRouterPaidAt: null,
      cumulativeSignups: 0,
      cumulativePaidUsers: 0,
    };

    row.paidTransactions += 1;
    row.customerPaidUsd = toMoney(row.customerPaidUsd + toNumber(payment.amountUsd));
    row.revenueUsd = row.customerPaidUsd;
    row.openRouterCostUsd = toMoney(row.customerPaidUsd * OPENROUTER_COST_RATE);
    row.platformRevenueUsd = toMoney(row.customerPaidUsd * PLATFORM_REVENUE_RATE);

    const settlement = resolveSettlementForBucket(bucketStart, row.customerPaidUsd);
    row.openRouterStatus = settlement.status;
    row.openRouterPaidAt = settlement.paidAt;
    rowsByBucket.set(bucketStart, row);
  }

  for (const paidAtMs of firstPaymentByCustomer.values()) {
    const bucketStart = normalizeBucketStart(toIso(paidAtMs));
    const row = rowsByBucket.get(bucketStart);
    if (row) {
      row.signups += 1;
      row.paidUsers += 1;
    }
  }

  const sortedRows = Array.from(rowsByBucket.values()).sort(
    (a, b) => Date.parse(a.bucketStart) - Date.parse(b.bucketStart)
  );
  let cumulativeSignups = 0;
  let cumulativePaidUsers = 0;

  return sortedRows.map((row) => {
    cumulativeSignups = Math.max(cumulativeSignups + row.signups, row.cumulativeSignups);
    cumulativePaidUsers = Math.max(cumulativePaidUsers + row.paidUsers, row.cumulativePaidUsers);

    return {
      ...row,
      cumulativeSignups,
      cumulativePaidUsers,
    };
  });
};

export const mergeLocalStripeTestPayments = (
  snapshot: PlatformAnalyticsSnapshot,
  hours: number
): PlatformAnalyticsSnapshot => {
  const remotePayments = snapshot.recentPayments ?? [];
  const remotePaymentKeys = new Set(remotePayments.map(paymentRowKey));
  const nowMs = Date.now();
  const localRows = readLocalStripeTestPaymentRows();
  const pendingRows = localRows.filter((row) => {
    if (remotePaymentKeys.has(localPaymentRowKey(row))) {
      return false;
    }

    const paidAtMs = parseDateMs(row.paidAt);
    if (!paidAtMs) {
      return false;
    }

    return Math.abs(nowMs - paidAtMs) <= LOCAL_STRIPE_TEST_PENDING_MAX_AGE_MS;
  });

  if (pendingRows.length !== localRows.length) {
    writeLocalStripeTestPaymentRows(pendingRows.slice(0, 100));
  }

  const testPayments = pendingRows.map(mapLocalStripeTestPayment);
  if (testPayments.length === 0) {
    return snapshot;
  }

  const safeHours = Math.max(1, Math.min(Math.trunc(hours), 168));
  const currentHour = startOfCurrentHour();
  const windowStart = currentHour - (safeHours - 1) * 60 * 60 * 1000;
  const windowEnd = currentHour + 60 * 60 * 1000;
  const windowPayments = testPayments.filter((payment) => {
    const paidAtMs = parseDateMs(payment.paidAt);
    return paidAtMs >= windowStart && paidAtMs < windowEnd;
  });
  const testCustomers = new Set(testPayments.map((payment) => payment.customerId).filter(Boolean));
  const windowCustomers = new Set(windowPayments.map((payment) => payment.customerId).filter(Boolean));
  const testRevenueUsd = testPayments.reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0);
  const windowRevenueUsd = windowPayments.reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0);
  const subscriptionRevenueUsd = testPayments
    .filter((payment) => payment.source === 'subscription')
    .reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0);
  const creditTopupRevenueUsd = testPayments
    .filter((payment) => payment.source === 'credit_topup')
    .reduce((sum, payment) => sum + toNumber(payment.amountUsd), 0);
  const planMap = new Map(snapshot.planBreakdown.map((plan) => [plan.planId, plan.activeSubscribers]));
  const subscriptionCustomersByPlan = new Map<string, Set<string>>();

  for (const payment of testPayments) {
    if (payment.source !== 'subscription' || !payment.customerId) {
      continue;
    }

    const planId = payment.planId ?? 'starter';
    const customers = subscriptionCustomersByPlan.get(planId) ?? new Set<string>();
    customers.add(payment.customerId);
    subscriptionCustomersByPlan.set(planId, customers);
  }

  for (const [planId, customers] of subscriptionCustomersByPlan.entries()) {
    planMap.set(planId, (planMap.get(planId) ?? 0) + customers.size);
  }

  const currencyBreakdown = [...snapshot.currencyBreakdown];
  const usdCurrency = currencyBreakdown.find((item) => item.currencyCode === 'USD');
  if (usdCurrency) {
    usdCurrency.paidTransactions += testPayments.length;
    usdCurrency.revenueAmount = toMoney(usdCurrency.revenueAmount + testRevenueUsd);
  } else {
    currencyBreakdown.push({
      currencyCode: 'USD',
      paidTransactions: testPayments.length,
      revenueAmount: toMoney(testRevenueUsd),
    });
  }

  return {
    ...snapshot,
    generatedAt: new Date().toISOString(),
    totals: {
      ...snapshot.totals,
      totalSignups: snapshot.totals.totalSignups + testCustomers.size,
      signupsLastWindow: snapshot.totals.signupsLastWindow + windowCustomers.size,
      totalPaidUsers: snapshot.totals.totalPaidUsers + testCustomers.size,
      newPaidUsersLastWindow: snapshot.totals.newPaidUsersLastWindow + windowCustomers.size,
      activePaidSubscribers:
        snapshot.totals.activePaidSubscribers +
        Array.from(subscriptionCustomersByPlan.values()).reduce((sum, customers) => sum + customers.size, 0),
      totalRevenueUsd: toMoney(snapshot.totals.totalRevenueUsd + testRevenueUsd),
      revenueLastWindowUsd: toMoney(snapshot.totals.revenueLastWindowUsd + windowRevenueUsd),
      subscriptionRevenueUsd: toMoney(snapshot.totals.subscriptionRevenueUsd + subscriptionRevenueUsd),
      creditTopupRevenueUsd: toMoney(snapshot.totals.creditTopupRevenueUsd + creditTopupRevenueUsd),
      totalPaidTransactions: snapshot.totals.totalPaidTransactions + testPayments.length,
      paidTransactionsLastWindow: snapshot.totals.paidTransactionsLastWindow + windowPayments.length,
    },
    hourly: buildTestPaymentHourlyRows(snapshot.hourly ?? [], testPayments, safeHours),
    planBreakdown: Array.from(planMap.entries()).map(([planId, activeSubscribers]) => ({
      planId,
      activeSubscribers,
    })),
    currencyBreakdown,
    recentPayments: [...testPayments, ...remotePayments]
      .sort((a, b) => parseDateMs(b.paidAt) - parseDateMs(a.paidAt))
      .slice(0, 100),
    isFallback: snapshot.isFallback,
    fallbackReason: snapshot.fallbackReason,
  };
};

const fetchClientReadableSnapshot = async (
  hours: number,
  fallbackReason: string
): Promise<PlatformAnalyticsSnapshot> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Please sign in before viewing platform revenue.');
  }

  const [profilesResult, subscriptionResult, creditResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, created_at, subscription_status, subscription_tier')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('transactions')
      .select('id, user_id, plan_id, billing_cycle, amount, currency, status, paid_at, created_at, external_reference_url')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('credit_transactions')
      .select('id, user_id, kind, direction, amount_usd_cents, status, currency, description, external_reference_url, created_at, updated_at')
      .eq('kind', 'topup')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const payments: PlatformAnalyticsPaymentRow[] = [
    ...((subscriptionResult.data as SubscriptionTransactionRow[] | null) ?? []).map(mapSubscriptionPayment),
    ...((creditResult.data as CreditTransactionRow[] | null) ?? []).map(mapCreditPayment),
  ];

  if (subscriptionResult.error && creditResult.error) {
    throw new Error(subscriptionResult.error.message || creditResult.error.message);
  }

  return buildFallbackSnapshot(payments, (profilesResult.data as ProfileRow[] | null) ?? [], hours, fallbackReason);
};

const fetchEdgeSnapshot = async (hours: number, accessToken: string): Promise<PlatformAnalyticsSnapshot> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // เพิ่ม t= เพื่อ cache busting ป้องกัน browser/CDN cache คืนผลเก่า
    const cacheBust = Date.now();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/platform-analytics?hours=${hours}&t=${cacheBust}`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    let payload: PlatformAnalyticsSnapshot | EdgeErrorPayload | null = null;
    try {
      payload = (await response.json()) as PlatformAnalyticsSnapshot | EdgeErrorPayload;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new EdgeRequestError(response.status, toErrorMessage(response.status, payload as EdgeErrorPayload | null));
    }

    return normalizeSnapshot(payload as PlatformAnalyticsSnapshot);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Platform revenue request timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const normalizeSnapshot = (snapshot: PlatformAnalyticsSnapshot): PlatformAnalyticsSnapshot => {
  const hourly = (snapshot.hourly ?? []).map((row) => {
    const customerPaidUsd = toMoney(toNumber(row.customerPaidUsd ?? row.revenueUsd));
    const openRouterCostUsd = toMoney(toNumber(row.openRouterCostUsd) || customerPaidUsd * OPENROUTER_COST_RATE);
    const platformRevenueUsd = toMoney(toNumber(row.platformRevenueUsd) || customerPaidUsd * PLATFORM_REVENUE_RATE);
    const fallbackSettlement = resolveSettlementForBucket(row.bucketStart, customerPaidUsd);
    const status =
      customerPaidUsd <= 0
        ? 'not_required'
        : row.openRouterStatus === 'paid' || row.openRouterStatus === 'unpaid'
          ? row.openRouterStatus
          : fallbackSettlement.status;

    return {
      ...row,
      revenueUsd: customerPaidUsd,
      customerPaidUsd,
      openRouterCostUsd,
      platformRevenueUsd,
      openRouterStatus: status,
      openRouterPaidAt: status === 'paid' ? row.openRouterPaidAt ?? fallbackSettlement.paidAt : null,
    };
  });

  return {
    ...snapshot,
    hourly,
    recentPayments: snapshot.recentPayments ?? [],
    planBreakdown: snapshot.planBreakdown ?? [],
    currencyBreakdown: snapshot.currencyBreakdown ?? [],
  };
};

export async function fetchPlatformAnalyticsSnapshot(hours = 24): Promise<PlatformAnalyticsSnapshot> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  const accessToken = await resolveAccessToken();

  try {
    const edgeSnapshot = await fetchEdgeSnapshot(hours, accessToken);
    return mergeLocalStripeTestPayments(edgeSnapshot, hours);
  } catch (error) {
    if (error instanceof EdgeRequestError && (error.status === 401 || error.status === 403)) {
      throw error;
    }

    const fallbackReason = error instanceof Error ? error.message : 'Edge Function unavailable';
    const fallbackSnapshot = await fetchClientReadableSnapshot(hours, fallbackReason);
    return mergeLocalStripeTestPayments(fallbackSnapshot, hours);
  }
}

export interface UpdateOpenRouterSettlementInput {
  bucketStart: string;
  status: 'paid' | 'unpaid';
  customerPaidUsd: number;
  openRouterCostUsd: number;
  platformRevenueUsd: number;
}

export async function updateOpenRouterSettlement(
  input: UpdateOpenRouterSettlementInput
): Promise<{ paidAt: string | null; isFallback: boolean }> {
  const normalizedBucket = normalizeBucketStart(input.bucketStart);

  try {
    const accessToken = await resolveAccessToken();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/platform-analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        bucket_start: normalizedBucket,
        status: input.status,
        customer_paid_usd: toMoney(input.customerPaidUsd),
        openrouter_due_usd: toMoney(input.openRouterCostUsd),
        platform_revenue_usd: toMoney(input.platformRevenueUsd),
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new EdgeRequestError(response.status, `Unable to update OpenRouter settlement (${response.status})`);
      }

      throw new Error(`Unable to update OpenRouter settlement (${response.status})`);
    }

    const payload = (await response.json().catch(() => null)) as {
      settlement?: { paid_at?: string | null };
    } | null;

    return {
      paidAt: input.status === 'paid' ? payload?.settlement?.paid_at ?? new Date().toISOString() : null,
      isFallback: false,
    };
  } catch (error) {
    if (error instanceof EdgeRequestError && (error.status === 401 || error.status === 403)) {
      throw error;
    }

    const local = writeLocalSettlement(normalizedBucket, input.status);
    return {
      paidAt: local.paidAt,
      isFallback: true,
    };
  }
}
