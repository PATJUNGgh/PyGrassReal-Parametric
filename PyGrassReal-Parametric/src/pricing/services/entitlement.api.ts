import type { CheckoutSession, SubscriptionEntitlement } from '../types/pricing.types';

const ENTITLEMENT_STORAGE_KEY = 'pygrass-pricing-entitlements';
const USER_ID_STORAGE_KEY = 'pygrass-pricing-user-id';
const NETWORK_DELAY_MS = 180;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isBrowser = (): boolean => typeof window !== 'undefined';

const readEntitlements = (): SubscriptionEntitlement[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ENTITLEMENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SubscriptionEntitlement[]) : [];
  } catch (error) {
    console.warn('Failed to parse entitlement storage.', error);
    return [];
  }
};

const writeEntitlements = (items: SubscriptionEntitlement[]): void => {
  if (!isBrowser()) return;
  window.localStorage.setItem(ENTITLEMENT_STORAGE_KEY, JSON.stringify(items));
};

const upsertEntitlement = (entitlement: SubscriptionEntitlement): SubscriptionEntitlement => {
  const existing = readEntitlements();
  const nextItems = existing.some((item) => item.user_id === entitlement.user_id)
    ? existing.map((item) => (item.user_id === entitlement.user_id ? entitlement : item))
    : [...existing, entitlement];

  writeEntitlements(nextItems);
  return entitlement;
};

const calculatePeriodEnd = (activatedAtIso: string, billingCycle: 'monthly' | 'yearly'): string => {
  const baseDate = new Date(activatedAtIso);
  if (billingCycle === 'yearly') {
    baseDate.setFullYear(baseDate.getFullYear() + 1);
    return baseDate.toISOString();
  }

  baseDate.setMonth(baseDate.getMonth() + 1);
  return baseDate.toISOString();
};

export const resolvePricingUserId = (): string => {
  if (!isBrowser()) return 'local-user';
  const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (existing) return existing;

  const fallback = 'local-user';
  window.localStorage.setItem(USER_ID_STORAGE_KEY, fallback);
  return fallback;
};

export async function getEntitlementByUserId(userId: string): Promise<SubscriptionEntitlement | null> {
  await wait(NETWORK_DELAY_MS);
  const found = readEntitlements().find((item) => item.user_id === userId);
  return found ?? null;
}

export async function activateEntitlementFromSession(
  session: CheckoutSession,
): Promise<SubscriptionEntitlement> {
  await wait(NETWORK_DELAY_MS);

  if (session.status !== 'paid') {
    throw new Error('Cannot activate entitlement before payment is completed.');
  }

  const activatedAt = session.paid_at ?? new Date().toISOString();

  const entitlement: SubscriptionEntitlement = {
    user_id: session.user_id,
    plan_id: session.plan_id,
    billing_cycle: session.billing_cycle,
    status: 'active',
    activated_at: activatedAt,
    current_period_end: calculatePeriodEnd(activatedAt, session.billing_cycle),
  };

  return upsertEntitlement(entitlement);
}
