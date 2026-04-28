import { useEffect, useMemo, useState } from 'react';
import { BillingToggle } from './components/BillingToggle';
import { PlanCard } from './components/PlanCard';
import { getEntitlementByUserId } from './services/entitlement.api';
import { listPricingPlans } from './services/pricing.api';
import { PRICING_PLANS } from './config/plans';
import type { BillingCycle, PricingPlan, SubscriptionEntitlement } from './types/pricing.types';
import { useProfile } from '../auth/hooks/useProfile';
import './pricing.css';

interface PricingPageProps {
  onNavigate: (path: string) => void;
}

const SOURCE_ROUTE_MAP: Record<string, string> = {
  settings: '/dashboard/settings',
  dashboard: '/dashboard',
  chat: '/dashboard/chat',
  api: '/dashboard/api',
  home: '/',
};

const REFERRER_RETURN_PATHS = new Set<string>([
  '/',
  '/dashboard',
  '/dashboard/chat',
  '/dashboard/api',
  '/dashboard/settings',
]);

const resolveInitialBillingCycle = (): BillingCycle => {
  const query = new URLSearchParams(window.location.search);
  const cycle = query.get('cycle');
  if (cycle === 'yearly' || cycle === 'quarterly') return cycle;
  return 'monthly';
};

const resolveRouteFromSource = (source: string | null): string | null => {
  if (!source) {
    return null;
  }
  return SOURCE_ROUTE_MAP[source] ?? null;
};

const resolveRouteFromReferrer = (): string | null => {
  if (!document.referrer) {
    return null;
  }

  try {
    const referrerUrl = new URL(document.referrer);
    if (referrerUrl.origin !== window.location.origin) {
      return null;
    }

    const referrerPath = referrerUrl.pathname;
    if (REFERRER_RETURN_PATHS.has(referrerPath)) {
      return referrerPath;
    }
  } catch {
    return null;
  }

  return null;
};

export function PricingPage({ onNavigate }: PricingPageProps) {
  const [plans, setPlans] = useState<PricingPlan[]>(PRICING_PLANS);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(resolveInitialBillingCycle);
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const profile = useProfile();
  const userId = profile.id;
  const fromSource = useMemo(() => {
    const query = new URLSearchParams(window.location.search);
    return query.get('from');
  }, []);

  useEffect(() => {
    if (profile.isLoading) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [plansData, entitlementData] = await Promise.all([
          listPricingPlans(),
          userId ? getEntitlementByUserId(userId) : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setPlans(plansData);
          setEntitlement(entitlementData);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [userId, profile.isLoading]);

  const handleChoosePlan = (planId: string) => {
    const selectedPlan = plans.find((plan) => plan.id === planId);
    if (!selectedPlan || selectedPlan.checkoutEnabled === false) {
      return;
    }
    const fromParam = fromSource ? `&from=${encodeURIComponent(fromSource)}` : '';
    onNavigate(`/pricing/checkout?plan=${encodeURIComponent(planId)}&cycle=${billingCycle}${fromParam}`);
  };

  const handleClose = () => {
    const routeFromSource = resolveRouteFromSource(fromSource);
    if (routeFromSource) {
      onNavigate(routeFromSource);
      return;
    }

    const routeFromReferrer = resolveRouteFromReferrer();
    if (routeFromReferrer) {
      onNavigate(routeFromReferrer);
      return;
    }

    // Default fallback: If they are logged in and no fromSource, send them to dashboard, otherwise homepage
    if (userId) {
      onNavigate('/dashboard');
    } else {
      onNavigate('/');
    }
  };

  return (
    <div className="pricing-page">
      <button
        type="button"
        className="pricing-close-floating"
        onClick={handleClose}
        aria-label="Close subscription"
        title="Close"
      >
        <span className="pricing-close-glyph" aria-hidden="true">
          X
        </span>
      </button>

      <div className="pricing-shell">
        <section className="pricing-hero-card pricing-hero-card--compact">
          <div className="pricing-billing-row pricing-billing-row--compact">
            <BillingToggle value={billingCycle} onChange={setBillingCycle} />
          </div>
        </section>

        <section className="pricing-plan-grid">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billingCycle={billingCycle}
              onChoosePlan={handleChoosePlan}
              isCurrentPlan={entitlement ? entitlement.plan_id === plan.id : plan.id === 'free'}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

export default PricingPage;
