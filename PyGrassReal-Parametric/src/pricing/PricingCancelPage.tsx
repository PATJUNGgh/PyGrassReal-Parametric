import { useEffect, useState } from 'react';
import { ArrowLeft, LayoutDashboard, RefreshCw, XCircle } from 'lucide-react';
import { getCheckoutSession } from './services/checkout.api';
import type { CheckoutSession } from './types/pricing.types';
import './pricing.css';

interface PricingCancelPageProps {
  onNavigate: (path: string) => void;
}

const toStatusMessage = (session: CheckoutSession | null): string => {
  if (!session) return 'No checkout session was found for this request.';
  if (session.status === 'expired') return 'Your payment session expired before confirmation.';
  if (session.status === 'cancelled') return 'Payment was cancelled before completion.';
  if (session.status === 'pending') return 'Payment is still pending. You can continue checkout.';
  return 'Payment result is not available for this checkout state.';
};

export function PricingCancelPage({ onNavigate }: PricingCancelPageProps) {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      setIsLoading(true);
      const query = new URLSearchParams(window.location.search);
      const sessionId = query.get('session');

      if (!sessionId) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const resolved = await getCheckoutSession(sessionId);
      if (!cancelled) {
        if (resolved?.status === 'paid') {
          onNavigate(`/pricing/success?session=${encodeURIComponent(resolved.session_id)}`);
          return;
        }
        setSession(resolved);
        setIsLoading(false);
      }
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [onNavigate]);

  return (
    <div className="pricing-page">
      <div className="pricing-shell pricing-result-layout">
        <section className="pricing-result-card">
          <span className="pricing-result-chip is-cancel">
            <XCircle size={14} />
            Payment cancelled
          </span>
          <h1>Checkout did not complete.</h1>
          <p>{isLoading ? 'Loading payment details...' : toStatusMessage(session)}</p>

          <div className="pricing-result-actions">
            {session?.status === 'pending' ? (
              <button
                type="button"
                className="pricing-top-button is-primary"
                onClick={() =>
                  onNavigate(
                    `/pricing/checkout?plan=${encodeURIComponent(session.plan_id)}&cycle=${session.billing_cycle}`,
                  )
                }
              >
                <RefreshCw size={15} />
                Continue checkout
              </button>
            ) : (
              <button type="button" className="pricing-top-button is-primary" onClick={() => onNavigate('/pricing')}>
                <ArrowLeft size={15} />
                Back to pricing
              </button>
            )}
            <button type="button" className="pricing-top-button" onClick={() => onNavigate('/dashboard')}>
              <LayoutDashboard size={15} />
              Go to dashboard
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default PricingCancelPage;
