import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { BillingToggle } from './components/BillingToggle';
import { PlanCard } from './components/PlanCard';
import { PlanComparison } from './components/PlanComparison';
import { PLAN_COMPARISON_ROWS } from './config/plans';
import { getEntitlementByUserId, resolvePricingUserId } from './services/entitlement.api';
import { listPricingPlans } from './services/pricing.api';
import type { BillingCycle, PricingPlan, SubscriptionEntitlement } from './types/pricing.types';
import './pricing.css';

interface PricingPageProps {
  onNavigate: (path: string) => void;
}

const resolveInitialBillingCycle = (): BillingCycle => {
  const query = new URLSearchParams(window.location.search);
  return query.get('cycle') === 'yearly' ? 'yearly' : 'monthly';
};

const toPlanLabel = (entitlement: SubscriptionEntitlement | null): string => {
  if (!entitlement) return 'Current plan: Free';
  const name = entitlement.plan_id.slice(0, 1).toUpperCase() + entitlement.plan_id.slice(1);
  return `Current plan: ${name} Active`;
};

export function PricingPage({ onNavigate }: PricingPageProps) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(resolveInitialBillingCycle);
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fromDashboard = new URLSearchParams(window.location.search).get('from') === 'dashboard';

  const userId = useMemo(() => resolvePricingUserId(), []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [plansData, entitlementData] = await Promise.all([
          listPricingPlans(),
          getEntitlementByUserId(userId),
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
  }, [userId]);

  const handleChoosePlan = (planId: string) => {
    const selectedPlan = plans.find((plan) => plan.id === planId);
    if (!selectedPlan || selectedPlan.checkoutEnabled === false) {
      return;
    }
    onNavigate(`/pricing/checkout?plan=${encodeURIComponent(planId)}&cycle=${billingCycle}`);
  };

  return (
    <div className="pricing-page">
      <div className="pricing-shell">
        <header className="pricing-topbar">
          <h2 className="pricing-brand">
            Pricing & Checkout
            <small>{toPlanLabel(entitlement)}</small>
          </h2>
          <div className="pricing-top-actions">
            <button type="button" className="pricing-top-button" onClick={() => onNavigate('/dashboard')}>
              <LayoutDashboard size={15} />
              Dashboard
            </button>
            <button type="button" className="pricing-top-button" onClick={() => onNavigate('/')}>
              <ArrowLeft size={15} />
              Home
            </button>
          </div>
        </header>

        <section className="pricing-hero-card">
          <span className="pricing-hero-eyebrow">Subscription plans</span>
          <h1>Choose a plan that matches your modeling workflow.</h1>
          <p>
            Upgrade in minutes. Start checkout with PromptPay QR and your entitlement will be activated as soon as
            payment is confirmed.
          </p>
          <div className="pricing-billing-row">
            {fromDashboard ? (
              <p className="pricing-from-dashboard">You came from Dashboard. Pick a plan to continue the upgrade.</p>
            ) : (
              <span />
            )}
            <BillingToggle value={billingCycle} onChange={setBillingCycle} />
          </div>
        </section>

        {isLoading ? (
          <section className="pricing-hero-card">
            <p>Loading pricing plans...</p>
          </section>
        ) : (
          <>
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

            <PlanComparison plans={plans} rows={PLAN_COMPARISON_ROWS} />
          </>
        )}
      </div>
    </div>
  );
}

export default PricingPage;
