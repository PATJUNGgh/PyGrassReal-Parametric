import { useEffect, useState } from 'react';
import { CheckCircle2, LayoutDashboard, WalletCards } from 'lucide-react';
import { getCheckoutSession } from './services/checkout.api';
import { activateEntitlementFromSession } from './services/entitlement.api';
import { getPricingPlanById } from './services/pricing.api';
import type { CheckoutSession, PricingPlan, SubscriptionEntitlement } from './types/pricing.types';
import './pricing.css';

interface PricingSuccessPageProps {
  onNavigate: (path: string) => void;
}

const formatDate = (value: string | null): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function PricingSuccessPage({ onNavigate }: PricingSuccessPageProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [plan, setPlan] = useState<PricingPlan | null>(null);
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleSuccess = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      const query = new URLSearchParams(window.location.search);
      const sessionId = query.get('session');

      if (!sessionId) {
        setErrorMessage('Missing checkout session ID.');
        setIsLoading(false);
        return;
      }

      const resolvedSession = await getCheckoutSession(sessionId);
      if (!resolvedSession) {
        if (!cancelled) {
          setErrorMessage('Checkout session not found.');
          setIsLoading(false);
        }
        return;
      }

      if (resolvedSession.status === 'pending') {
        onNavigate(
          `/pricing/checkout?plan=${encodeURIComponent(resolvedSession.plan_id)}&cycle=${resolvedSession.billing_cycle}`,
        );
        return;
      }

      if (resolvedSession.status !== 'paid') {
        onNavigate(`/pricing/cancel?session=${encodeURIComponent(resolvedSession.session_id)}`);
        return;
      }

      try {
        const [selectedPlan, activatedEntitlement] = await Promise.all([
          getPricingPlanById(resolvedSession.plan_id),
          activateEntitlementFromSession(resolvedSession),
        ]);

        if (!cancelled) {
          setSession(resolvedSession);
          setPlan(selectedPlan);
          setEntitlement(activatedEntitlement);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to activate subscription entitlement.');
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
  }, [onNavigate]);

  if (isLoading) {
    return (
      <div className="pricing-page">
        <div className="pricing-shell pricing-result-layout">
          <section className="pricing-result-card">
            <span className="pricing-result-chip is-success">Finalizing</span>
            <h1>Completing subscription activation...</h1>
            <p>Please wait while we update your entitlement and dashboard access.</p>
          </section>
        </div>
      </div>
    );
  }

  if (!session || !entitlement || errorMessage) {
    return (
      <div className="pricing-page">
        <div className="pricing-shell pricing-result-layout">
          <section className="pricing-result-card">
            <span className="pricing-result-chip is-cancel">Activation issue</span>
            <h1>Unable to complete subscription setup</h1>
            <p>{errorMessage ?? 'Please retry checkout from pricing page.'}</p>
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
          <h1>Your subscription is active and ready on Dashboard.</h1>
          <p>
            {plan ? `${plan.name} plan` : 'Selected plan'} has been activated for your account. You can continue in
            Dashboard immediately.
          </p>

          <div className="pricing-result-summary">
            <div>
              <span>Session ID</span>
              <strong>{session.session_id}</strong>
            </div>
            <div>
              <span>Plan</span>
              <strong>{plan?.name ?? entitlement.plan_id}</strong>
            </div>
            <div>
              <span>Billing cycle</span>
              <strong>{entitlement.billing_cycle}</strong>
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
