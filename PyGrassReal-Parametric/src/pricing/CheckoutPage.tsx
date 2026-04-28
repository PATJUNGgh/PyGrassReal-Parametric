import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CreditCard, LoaderCircle, Zap } from 'lucide-react';
import { getPricingPlanById } from './services/pricing.api';
import {
  createStripeCheckoutSession,
  isStripeCheckoutAvailable,
} from './services/stripe.checkout.api';
import type { BillingCycle, PricingPlan } from './types/pricing.types';
import './pricing.css';

interface CheckoutPageProps {
  onNavigate: (path: string) => void;
}

const readQuery = (): { planId: string | null; billingCycle: BillingCycle; fromSource: string | null } => {
  const query = new URLSearchParams(window.location.search);
  const planId = query.get('plan');
  const cycle = query.get('cycle');
  const fromSource = query.get('from');
  const billingCycle = cycle === 'yearly' || cycle === 'quarterly' ? cycle : 'monthly';
  return { planId, billingCycle, fromSource };
};

const normalizeStripePriceId = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const resolveStripePriceId = (planId: string, billingCycle: BillingCycle): string | undefined => {
  if (import.meta.env.VITE_USE_EXPLICIT_STRIPE_PRICE_IDS === 'false') {
    return undefined;
  }

  if (planId === 'starter') {
    if (billingCycle === 'yearly') return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_STARTER_YEARLY);
    if (billingCycle === 'quarterly') return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_STARTER_QUARTERLY);
    return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY);
  }

  if (planId === 'pro') {
    if (billingCycle === 'yearly') return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY);
    if (billingCycle === 'quarterly') return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_PRO_QUARTERLY);
    return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY);
  }

  if (planId === 'studio') {
    if (billingCycle === 'yearly') return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_STUDIO_YEARLY);
    if (billingCycle === 'quarterly') return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_STUDIO_QUARTERLY);
    return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_STUDIO_MONTHLY);
  }

  if (planId === 'enterprise') {
    if (billingCycle === 'yearly') return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_YEARLY);
    if (billingCycle === 'quarterly') return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_QUARTERLY);
    return normalizeStripePriceId(import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY);
  }

  return undefined;
};

const toCycleLabel = (billingCycle: BillingCycle): string => {
  if (billingCycle === 'yearly') return 'year';
  if (billingCycle === 'quarterly') return 'quarter';
  return 'month';
};

const formatPrice = (plan: PricingPlan, billingCycle: BillingCycle): string => {
  const amount =
    billingCycle === 'yearly'
      ? plan.yearlyPrice
      : billingCycle === 'quarterly'
        ? Math.round(plan.monthlyPrice * 3 * 0.9)
        : plan.monthlyPrice;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const isAuthRequiredError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return /please sign in again/i.test(error.message);
};

const buildLoginWithNextUrl = (): string => {
  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/auth/login?next=${encodeURIComponent(next)}`;
};

export function CheckoutPage({ onNavigate }: CheckoutPageProps) {
  const [plan, setPlan] = useState<PricingPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [cancelUrl, setCancelUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isStripeRedirecting, setIsStripeRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  const launchStripeCheckout = useCallback(
    async (selectedPlan: PricingPlan, selectedCycle: BillingCycle, selectedCancelUrl?: string) => {
      if (isProcessingRef.current) return;
      
      try {
        isProcessingRef.current = true;
        setIsStripeRedirecting(true);
        setErrorMessage(null);

        const explicitPriceId = resolveStripePriceId(selectedPlan.id, selectedCycle);
        const result = await createStripeCheckoutSession({
          planId: selectedPlan.id,
          billingCycle: selectedCycle,
          stripePriceId: explicitPriceId,
          cancelUrl: selectedCancelUrl,
        });

        if (result.url) {
          window.location.assign(result.url);
        } else {
          throw new Error('No checkout URL received from server.');
        }
      } catch (error) {
        isProcessingRef.current = false;
        setIsStripeRedirecting(false);
        
        if (isAuthRequiredError(error)) {
          onNavigate(buildLoginWithNextUrl());
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to connect to Stripe checkout. Please try again.'
        );
      }
    },
    [onNavigate]
  );

  useEffect(() => {
    let cancelled = false;

    const prepareCheckout = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const { planId, billingCycle: cycleFromQuery, fromSource } = readQuery();
      setBillingCycle(cycleFromQuery);

      const resolvedCancelUrl = fromSource
        ? `${window.location.origin}/pricing?from=${encodeURIComponent(fromSource)}`
        : `${window.location.origin}/pricing`;
      setCancelUrl(resolvedCancelUrl);

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

        if (cancelled) return;

        setPlan(selectedPlan);
        setIsLoading(false);
        
        // Auto-launch only once
        if (!isProcessingRef.current) {
          await launchStripeCheckout(selectedPlan, cycleFromQuery, resolvedCancelUrl);
        }
      } catch (error) {
        if (cancelled) return;

        if (isAuthRequiredError(error)) {
          onNavigate(buildLoginWithNextUrl());
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load plan information. Please try again.'
        );
        setIsLoading(false);
      }
    };

    void prepareCheckout();
    return () => {
      cancelled = true;
    };
  }, [launchStripeCheckout, onNavigate]);

  const handleRetry = async (): Promise<void> => {
    if (!plan || isStripeRedirecting) return;
    await launchStripeCheckout(plan, billingCycle, cancelUrl);
  };

  if (isLoading) {
    return (
      <div className="pricing-page">
        <div className="pricing-shell pricing-result-layout">
          <section className="pricing-result-card">
            <span className="pricing-result-chip">Loading</span>
            <h1>Preparing your checkout...</h1>
            <p>Please wait while we initialize a secure Stripe payment session.</p>
          </section>
        </div>
      </div>
    );
  }

  if (errorMessage || !plan) {
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
            <small>Secure Payment</small>
          </h2>
          <div className="pricing-top-actions">
            <button type="button" className="pricing-top-button" onClick={() => onNavigate('/pricing')}>
              <ArrowLeft size={15} />
              Back to plans
            </button>
          </div>
        </header>

        <section className="pricing-result-card" style={{ marginTop: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
          <span className="pricing-result-chip" style={{ background: 'linear-gradient(135deg, #635bff, #0a2540)' }}>
            <Zap size={14} />
            Stripe Checkout
          </span>
          <h1>Pay for {plan.name}</h1>
          <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
            Amount: <strong>{formatPrice(plan, billingCycle)}</strong> / {toCycleLabel(billingCycle)}
          </p>
          <p>We will redirect you to Stripe to complete your payment securely.</p>

          {errorMessage ? (
            <div style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              {errorMessage}
            </div>
          ) : null}

          <div className="pricing-result-actions" style={{ justifyContent: 'center', marginTop: '2rem' }}>
            {isStripeCheckoutAvailable() ? (
              <button
                type="button"
                className="pricing-top-button is-primary"
                style={{ fontSize: '1.1rem', padding: '0.75rem 2rem', background: '#635bff' }}
                onClick={() => void handleRetry()}
                disabled={isStripeRedirecting}
                id="stripe-checkout-btn"
              >
                {isStripeRedirecting ? (
                  <>
                    <LoaderCircle size={18} className="spin" />
                    Connecting to Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Continue to payment
                  </>
                )}
              </button>
            ) : (
              <button type="button" className="pricing-top-button" disabled title="Stripe checkout is unavailable">
                <LoaderCircle size={14} />
                Payment is currently unavailable
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default CheckoutPage;
