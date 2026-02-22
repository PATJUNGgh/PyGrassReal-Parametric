import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { CheckoutPanel } from './components/CheckoutPanel';
import { QRPaymentBox } from './components/QRPaymentBox';
import {
  cancelCheckoutSession,
  createCheckoutSession,
  getCheckoutSession,
  markCheckoutSessionPaid,
} from './services/checkout.api';
import { resolvePricingUserId } from './services/entitlement.api';
import { getPricingPlanById } from './services/pricing.api';
import type { BillingCycle, CheckoutSession, PricingPlan } from './types/pricing.types';
import './pricing.css';

interface CheckoutPageProps {
  onNavigate: (path: string) => void;
}

const readQuery = (): { planId: string | null; billingCycle: BillingCycle } => {
  const query = new URLSearchParams(window.location.search);
  const planId = query.get('plan');
  const billingCycle = query.get('cycle') === 'yearly' ? 'yearly' : 'monthly';
  return { planId, billingCycle };
};

const getSecondsLeft = (expiresAtIso: string): number => {
  const diff = new Date(expiresAtIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 1000));
};

export function CheckoutPage({ onNavigate }: CheckoutPageProps) {
  const [plan, setPlan] = useState<PricingPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMarkingPaid, setIsMarkingPaid] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userId = useMemo(() => resolvePricingUserId(), []);
  const sessionId = session?.session_id ?? null;
  const sessionExpiresAt = session?.expires_at ?? null;

  useEffect(() => {
    let cancelled = false;

    const prepareCheckout = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const { planId, billingCycle: cycleFromQuery } = readQuery();
      setBillingCycle(cycleFromQuery);

      if (!planId) {
        onNavigate('/pricing');
        return;
      }

      try {
        const selectedPlan = await getPricingPlanById(planId);
        if (!selectedPlan) {
          onNavigate('/pricing');
          return;
        }

        const createdSession = await createCheckoutSession({
          userId,
          planId: selectedPlan.id,
          billingCycle: cycleFromQuery,
        });

        if (!cancelled) {
          setPlan(selectedPlan);
          setSession(createdSession);
          setSecondsLeft(getSecondsLeft(createdSession.expires_at));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize checkout session.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void prepareCheckout();
    return () => {
      cancelled = true;
    };
  }, [onNavigate, userId]);

  useEffect(() => {
    if (!sessionId || !sessionExpiresAt) return;

    const countdownTimer = window.setInterval(() => {
      setSecondsLeft(getSecondsLeft(sessionExpiresAt));
    }, 1000);

    const pollingTimer = window.setInterval(() => {
      void (async () => {
        const refreshed = await getCheckoutSession(sessionId);
        if (!refreshed) return;

        setSession(refreshed);
        setSecondsLeft(getSecondsLeft(refreshed.expires_at));

        if (refreshed.status === 'paid') {
          onNavigate(`/pricing/success?session=${encodeURIComponent(refreshed.session_id)}`);
          return;
        }

        if (refreshed.status === 'cancelled') {
          onNavigate(`/pricing/cancel?session=${encodeURIComponent(refreshed.session_id)}`);
        }
      })();
    }, 2400);

    return () => {
      window.clearInterval(countdownTimer);
      window.clearInterval(pollingTimer);
    };
  }, [onNavigate, sessionExpiresAt, sessionId]);

  const handleMarkPaid = async () => {
    if (!session) return;
    setIsMarkingPaid(true);
    try {
      const updated = await markCheckoutSessionPaid(session.session_id);
      if (!updated) {
        setErrorMessage('Unable to confirm payment for this session.');
        return;
      }

      setSession(updated);
      if (updated.status === 'paid') {
        onNavigate(`/pricing/success?session=${encodeURIComponent(updated.session_id)}`);
      }
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleCancelCheckout = async () => {
    if (!session) return;
    setIsCancelling(true);
    try {
      const updated = await cancelCheckoutSession(session.session_id);
      if (!updated) {
        setErrorMessage('Unable to cancel this payment session.');
        return;
      }

      setSession(updated);
      onNavigate(`/pricing/cancel?session=${encodeURIComponent(updated.session_id)}`);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="pricing-page">
        <div className="pricing-shell pricing-result-layout">
          <section className="pricing-result-card">
            <span className="pricing-result-chip">Loading</span>
            <h1>Preparing your checkout session...</h1>
            <p>We are setting up PromptPay QR and payment tracking.</p>
          </section>
        </div>
      </div>
    );
  }

  if (errorMessage || !session || !plan) {
    return (
      <div className="pricing-page">
        <div className="pricing-shell pricing-result-layout">
          <section className="pricing-result-card">
            <span className="pricing-result-chip is-cancel">Checkout error</span>
            <h1>Unable to start checkout</h1>
            <p>{errorMessage ?? 'Missing plan information for this checkout flow.'}</p>
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
      <div className="pricing-shell">
        <header className="pricing-topbar">
          <h2 className="pricing-brand">
            Checkout
            <small>Secure promptpay flow</small>
          </h2>
          <div className="pricing-top-actions">
            <button type="button" className="pricing-top-button" onClick={() => onNavigate('/pricing')}>
              <ArrowLeft size={15} />
              Back to plans
            </button>
          </div>
        </header>

        <div className="pricing-checkout-layout">
          <QRPaymentBox session={session} secondsLeft={secondsLeft} />
          <CheckoutPanel
            plan={plan}
            billingCycle={billingCycle}
            session={session}
            onBackToPricing={() => onNavigate('/pricing')}
            onMarkPaid={handleMarkPaid}
            onCancelCheckout={handleCancelCheckout}
            isMarkingPaid={isMarkingPaid}
            isCancelling={isCancelling}
          />
        </div>

        <section className="pricing-result-card">
          <span className="pricing-result-chip">Alternative gateway</span>
          <h1>Future-ready payment connector</h1>
          <p>
            Current flow uses PromptPay QR as the primary method. External redirect gateway can be enabled later
            without changing the route contract.
          </p>
          <div className="pricing-result-actions">
            <button type="button" className="pricing-top-button">
              <LoaderCircle size={14} />
              Gateway redirect (coming soon)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CheckoutPage;
