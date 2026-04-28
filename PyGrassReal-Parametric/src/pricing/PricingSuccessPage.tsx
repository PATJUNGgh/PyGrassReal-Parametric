import { useEffect, useState } from 'react';
import { CheckCircle2, LayoutDashboard, WalletCards } from 'lucide-react';
import { useProfile } from '../auth/hooks/useProfile';
import { getPricingPlanById } from './services/pricing.api';
import {
  finalizeSubscriptionCheckoutSession,
  fetchSubscriptionTransactionBySession,
  waitForSubscriptionTransaction,
  type SubscriptionTransaction,
} from './services/subscriptionBilling.api';
import { getEntitlementByUserId } from './services/entitlement.api';
import type { BillingCycle, PricingPlan, SubscriptionEntitlement } from './types/pricing.types';
import './pricing.css';

interface PricingSuccessPageProps {
  onNavigate: (path: string) => void;
}

const toCycleLabel = (billingCycle: BillingCycle): string => {
  if (billingCycle === 'quarterly') return 'Quarterly';
  if (billingCycle === 'yearly') return 'Yearly';
  return 'Monthly';
};

const formatDate = (value: string | null): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildFallbackEntitlement = (tx: SubscriptionTransaction): SubscriptionEntitlement => {
  return {
    user_id: tx.userId,
    plan_id: tx.planId,
    billing_cycle: tx.billingCycle,
    status: 'active',
    activated_at: tx.paidAt ?? tx.createdAt,
    current_period_end: null,
  };
};

export function PricingSuccessPage({ onNavigate }: PricingSuccessPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [transaction, setTransaction] = useState<SubscriptionTransaction | null>(null);
  const [plan, setPlan] = useState<PricingPlan | null>(null);
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const profile = useProfile();

  useEffect(() => {
    let cancelled = false;

    const handleSuccess = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      if (profile.isLoading) {
        return;
      }

      if (!profile.id) {
        onNavigate('/auth/login');
        return;
      }

      const query = new URLSearchParams(window.location.search);
      const sessionId = query.get('session');
      if (!sessionId) {
        setErrorMessage('Missing checkout session ID.');
        setIsLoading(false);
        return;
      }

      try {
        const finalized = await finalizeSubscriptionCheckoutSession(sessionId);
        if (cancelled) {
          return;
        }

        if (finalized.status === 'paid') {
          onNavigate('/dashboard');
          return;
        }

        const tx = await waitForSubscriptionTransaction(sessionId);
        if (!tx) {
          throw new Error('Checkout session was not found in billing records.');
        }

        if (tx.status !== 'paid') {
          onNavigate(`/pricing/cancel?session=${encodeURIComponent(sessionId)}`);
          return;
        }

        const [selectedPlan, resolvedEntitlement] = await Promise.all([
          getPricingPlanById(tx.planId),
          getEntitlementByUserId(profile.id),
        ]);

        if (cancelled) {
          return;
        }

        setTransaction(tx);
        setPlan(selectedPlan);
        setEntitlement(resolvedEntitlement ?? buildFallbackEntitlement(tx));
        onNavigate('/dashboard');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Unable to complete subscription setup.');

        const fallbackTx = await fetchSubscriptionTransactionBySession(sessionId);
        if (fallbackTx?.status && fallbackTx.status !== 'paid') {
          onNavigate(`/pricing/cancel?session=${encodeURIComponent(sessionId)}`);
          return;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void handleSuccess();
    return () => {
      cancelled = true;
    };
  }, [onNavigate, profile.id, profile.isLoading]);

  if (isLoading) {
    return (
      <div className="pricing-page">
        <div className="pricing-shell pricing-result-layout">
          <section className="pricing-result-card">
            <span className="pricing-result-chip is-success">Finalizing</span>
            <h1>Completing subscription activation...</h1>
            <p>Please wait while we verify payment and update your access.</p>
          </section>
        </div>
      </div>
    );
  }

  if (!transaction || !entitlement || errorMessage) {
    return (
      <div className="pricing-page">
        <div className="pricing-shell pricing-result-layout">
          <section className="pricing-result-card">
            <span className="pricing-result-chip is-cancel">Activation issue</span>
            <h1>Unable to complete subscription setup</h1>
            <p>{errorMessage ?? 'Please retry checkout from the pricing page.'}</p>
            <div className="pricing-result-actions">
              <button type="button" className="pricing-top-button is-primary" onClick={() => onNavigate('/pricing')}>
                Back to pricing
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      <div className="pricing-shell pricing-result-layout">
        <section className="pricing-result-card">
          <span className="pricing-result-chip is-success">
            <CheckCircle2 size={14} />
            Payment successful
          </span>
          <h1>Your subscription is active.</h1>
          <p>
            {plan ? `${plan.name} plan` : 'Selected plan'} has been activated for your account.
          </p>

          <div className="pricing-result-summary">
            <div>
              <span>Session ID</span>
              <strong>{transaction.stripeSessionId ?? 'N/A'}</strong>
            </div>
            <div>
              <span>Plan</span>
              <strong>{plan?.name ?? entitlement.plan_id}</strong>
            </div>
            <div>
              <span>Billing cycle</span>
              <strong>{toCycleLabel(entitlement.billing_cycle)}</strong>
            </div>
            <div>
              <span>Current period end</span>
              <strong>{formatDate(entitlement.current_period_end)}</strong>
            </div>
          </div>

          <div className="pricing-result-actions">
            <button type="button" className="pricing-top-button is-primary" onClick={() => onNavigate('/dashboard')}>
              <LayoutDashboard size={15} />
              Go to dashboard
            </button>
            <button type="button" className="pricing-top-button" onClick={() => onNavigate('/pricing')}>
              <WalletCards size={15} />
              View plans
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default PricingSuccessPage;
