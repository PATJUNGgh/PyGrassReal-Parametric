import { useState, useEffect, useMemo } from 'react';
import { getEntitlementByUserId } from '../../pricing/services/entitlement.api';
import type { SubscriptionEntitlement } from '../../pricing/types/pricing.types';
import { logStructured } from '../utils';
import { useProfile } from '../../auth/hooks/useProfile';

/**
 * Hook to manage user subscription entitlement and plan status.
 */
export function useUserEntitlement() {
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const profile = useProfile();
  const userId = profile.id;

  useEffect(() => {
    let cancelled = false;

    const loadEntitlement = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getEntitlementByUserId(userId);
        if (!cancelled) {
          setEntitlement(data);
          logStructured('User entitlement loaded', {
            user_id: userId,
            plan_id: data?.plan_id || 'free'
          });
        }
      } catch (error) {
        console.error('Failed to load entitlement:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadEntitlement();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return useMemo(() => ({ entitlement, loading, userId }), [entitlement, loading, userId]);
}
