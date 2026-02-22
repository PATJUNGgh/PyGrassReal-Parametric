import { PRICING_PLANS } from '../config/plans';
import type {
  BillingCycle,
  CheckoutSession,
  CheckoutStatus,
  PaymentMethod,
  PricingPlan,
} from '../types/pricing.types';
import { getPlanAmount } from './pricing.api';

const CHECKOUT_SESSIONS_KEY = 'pygrass-pricing-checkout-sessions';
const SESSION_EXPIRATION_MS = 10 * 60 * 1000;
const NETWORK_DELAY_MS = 220;
const DUPLICATE_WINDOW_MS = 45 * 1000;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isBrowser = (): boolean => typeof window !== 'undefined';

const readSessions = (): CheckoutSession[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CHECKOUT_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CheckoutSession[]) : [];
  } catch (error) {
    console.warn('Failed to parse checkout sessions.', error);
    return [];
  }
};

const writeSessions = (sessions: CheckoutSession[]): void => {
  if (!isBrowser()) return;
  window.localStorage.setItem(CHECKOUT_SESSIONS_KEY, JSON.stringify(sessions));
};

const resolvePlan = (planId: string): PricingPlan => {
  const matched = PRICING_PLANS.find((plan) => plan.id === planId);
  if (!matched) {
    throw new Error(`Unknown plan id: ${planId}`);
  }
  return matched;
};

const resolveExpiredStatus = (session: CheckoutSession, now: number): CheckoutSession => {
  if (session.status === 'pending' && now >= new Date(session.expires_at).getTime()) {
    return { ...session, status: 'expired' };
  }
  return session;
};

const persistSession = (nextSession: CheckoutSession): CheckoutSession => {
  const sessions = readSessions();
  const nextSessions = sessions.some((item) => item.session_id === nextSession.session_id)
    ? sessions.map((item) => (item.session_id === nextSession.session_id ? nextSession : item))
    : [...sessions, nextSession];
  writeSessions(nextSessions);
  return nextSession;
};

const lookupSession = (sessionId: string): CheckoutSession | null => {
  const sessions = readSessions();
  const found = sessions.find((item) => item.session_id === sessionId);
  if (!found) return null;

  const refreshed = resolveExpiredStatus(found, Date.now());
  if (refreshed.status !== found.status) {
    persistSession(refreshed);
  }
  return refreshed;
};

const createReference = (): string => {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PP-${now}-${rand}`;
};

const createSessionId = (): string => {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `cs_${now}_${rand}`;
};

const createPromptPayPayload = (reference: string, amount: number): string => {
  return `PROMPTPAY|merchant=PYGRASSREAL|reference=${reference}|amount=${amount.toFixed(2)}|currency=THB`;
};

const findReusableSession = (
  userId: string,
  planId: string,
  billingCycle: BillingCycle,
): CheckoutSession | null => {
  const now = Date.now();
  const sessions = readSessions().map((item) => resolveExpiredStatus(item, now));
  writeSessions(sessions);

  return (
    sessions.find((item) => {
      if (item.user_id !== userId) return false;
      if (item.plan_id !== planId) return false;
      if (item.billing_cycle !== billingCycle) return false;
      if (item.status !== 'pending') return false;
      const ageMs = now - new Date(item.created_at).getTime();
      return ageMs <= DUPLICATE_WINDOW_MS;
    }) ?? null
  );
};

interface CreateCheckoutSessionInput {
  userId: string;
  planId: string;
  billingCycle: BillingCycle;
  paymentMethod?: PaymentMethod;
}

export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
  await wait(NETWORK_DELAY_MS);

  const existing = findReusableSession(input.userId, input.planId, input.billingCycle);
  if (existing) return existing;

  const selectedPlan = resolvePlan(input.planId);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_EXPIRATION_MS);
  const reference = createReference();
  const amount = getPlanAmount(selectedPlan, input.billingCycle);
  const method = input.paymentMethod ?? 'promptpay_qr';

  const session: CheckoutSession = {
    session_id: createSessionId(),
    user_id: input.userId,
    plan_id: selectedPlan.id,
    billing_cycle: input.billingCycle,
    amount,
    currency: selectedPlan.currency,
    payment_method: method,
    status: 'pending',
    qr_payload: createPromptPayPayload(reference, amount),
    qr_reference: reference,
    redirect_url: method === 'external_redirect' ? 'https://example.com/payment-gateway' : null,
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    paid_at: null,
  };

  return persistSession(session);
}

export async function getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
  await wait(NETWORK_DELAY_MS);
  return lookupSession(sessionId);
}

export async function getCheckoutSessionStatus(sessionId: string): Promise<CheckoutStatus | null> {
  await wait(NETWORK_DELAY_MS);
  const session = lookupSession(sessionId);
  return session?.status ?? null;
}

export async function markCheckoutSessionPaid(sessionId: string): Promise<CheckoutSession | null> {
  await wait(NETWORK_DELAY_MS);
  const session = lookupSession(sessionId);
  if (!session) return null;

  if (session.status !== 'pending') {
    return session;
  }

  const paidSession: CheckoutSession = {
    ...session,
    status: 'paid',
    paid_at: new Date().toISOString(),
  };
  return persistSession(paidSession);
}

export async function cancelCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
  await wait(NETWORK_DELAY_MS);
  const session = lookupSession(sessionId);
  if (!session) return null;

  if (session.status !== 'pending') {
    return session;
  }

  const cancelledSession: CheckoutSession = {
    ...session,
    status: 'cancelled',
  };
  return persistSession(cancelledSession);
}
