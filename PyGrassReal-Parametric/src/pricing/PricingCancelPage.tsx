import { useEffect, useState } from 'react';
import { ArrowLeft, LayoutDashboard, RefreshCw, XCircle } from 'lucide-react';
import { useProfile } from '../auth/hooks/useProfile';
import {
  fetchSubscriptionTransactionBySession,
  type SubscriptionTransaction,
} from './services/subscriptionBilling.api';
import './pricing.css';

interface PricingCancelPageProps {
  onNavigate: (path: string) => void;
}

const toStatusMessage = (tx: SubscriptionTransaction | null): string => {
  if (!tx) return 'No checkout session was found for this request.';
  if (tx.status === 'expired') return 'Your payment session expired before confirmation.';
  if (tx.status === 'cancelled') return 'Payment was cancelled before completion.';
  if (tx.status === 'failed') return 'Payment failed. Please try again.';
  if (tx.status === 'pending') return 'Payment is still pending. You can continue checkout.';
  return 'Payment result is not available for this checkout state.';
};

export function PricingCancelPage({ onNavigate }: PricingCancelPageProps) {
  const [transaction, setTransaction] = useState<SubscriptionTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profile = useProfile();

  useEffect(() => {
    let cancelled = false;

    const loadTransaction = async () => {
      setIsLoading(true);

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
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      const resolved = await fetchSubscriptionTransactionBySession(sessionId);
      if (cancelled) {
        return;
      }

      if (resolved?.status === 'paid') {
        onNavigate(`/pricing/success?session=${encodeURIComponent(sessionId)}`);
        return;
      }

      setTransaction(resolved);
      setIsLoading(false);
    };

    void loadTransaction();
    return () => {
      cancelled = true;
    };
  }, [onNavigate, profile.id, profile.isLoading]);

  return (
    <div className="pricing-page">
      <div className="pricing-shell pricing-result-layout">
        <section className="pricing-result-card">
          <span className="pricing-result-chip is-cancel">
            <XCircle size={14} />
            Payment cancelled
          </span>
          <h1>Checkout did not complete.</h1>
          <p>{isLoading ? 'Loading payment details...' : toStatusMessage(transaction)}</p>

          <div className="pricing-result-actions">
            {transaction?.status === 'pending' ? (
              <button
                type="button"
                className="pricing-top-button is-primary"
                onClick={() =>
                  onNavigate(
                    `/pricing/checkout?plan=${encodeURIComponent(transaction.planId)}&cycle=${transaction.billingCycle}`
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

