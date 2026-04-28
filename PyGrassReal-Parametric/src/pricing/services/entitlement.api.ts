import type { CheckoutSession, SubscriptionEntitlement } from '../types/pricing.types';
import { fetchCurrentEntitlement } from './subscriptionBilling.api';

const USER_ID_STORAGE_KEY = 'pygrass-pricing-user-id';

const isBrowser = (): boolean => typeof window !== 'undefined';

export const resolvePricingUserId = (): string => {
  if (!isBrowser()) return 'local-user';
  const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (existing) return existing;

  const fallback = 'local-user';
  window.localStorage.setItem(USER_ID_STORAGE_KEY, fallback);
  return fallback;
};

export async function getEntitlementByUserId(userId: string): Promise<SubscriptionEntitlement | null> {
  if (!userId || userId === 'local-user') {
    return null;
  }

  try {
    const entitlement = await fetchCurrentEntitlement();
    if (!entitlement || entitlement.user_id !== userId) {
      return null;
    }
    return entitlement;
  } catch {
    return null;
  }
}

export async function activateEntitlementFromSession(
  _session: CheckoutSession
): Promise<SubscriptionEntitlement> {
  void _session;
  const entitlement = await fetchCurrentEntitlement();
  if (!entitlement) {
    throw new Error('Subscription has not been activated yet. Please refresh shortly.');
  }
  return entitlement;
}
