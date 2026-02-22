import { ArrowLeft, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import type { BillingCycle, CheckoutSession, PricingPlan } from '../types/pricing.types';
import { getPlanAmount } from '../services/pricing.api';
import { PaymentStatusBadge } from './PaymentStatusBadge';

interface CheckoutPanelProps {
  plan: PricingPlan;
  billingCycle: BillingCycle;
  session: CheckoutSession;
  onBackToPricing: () => void;
  onMarkPaid: () => void;
  onCancelCheckout: () => void;
  isMarkingPaid: boolean;
  isCancelling: boolean;
}

const formatAmount = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function CheckoutPanel({
  plan,
  billingCycle,
  session,
  onBackToPricing,
  onMarkPaid,
  onCancelCheckout,
  isMarkingPaid,
  isCancelling,
}: CheckoutPanelProps) {
  const amount = getPlanAmount(plan, billingCycle);
  const status = session.status;
  const isPending = status === 'pending';

  return (
    <aside className="pricing-checkout-panel">
      <header className="pricing-checkout-panel-head">
        <h2>Checkout Summary</h2>
        <PaymentStatusBadge status={status} />
      </header>

      <div className="pricing-checkout-summary">
        <div>
          <span>Plan</span>
          <strong>{plan.name}</strong>
        </div>
        <div>
          <span>Billing</span>
          <strong>{billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</strong>
        </div>
        <div>
          <span>Amount</span>
          <strong>{formatAmount(amount, plan.currency)}</strong>
        </div>
        <div>
          <span>Session</span>
          <strong>{session.session_id}</strong>
        </div>
      </div>

      {isPending ? (
        <div className="pricing-checkout-actions">
          <button
            type="button"
            className="pricing-checkout-primary"
            onClick={onMarkPaid}
            disabled={isMarkingPaid}
          >
            <CheckCircle2 size={16} />
            {isMarkingPaid ? 'Confirming...' : 'I have completed payment'}
          </button>
          <button
            type="button"
            className="pricing-checkout-secondary"
            onClick={onCancelCheckout}
            disabled={isCancelling}
          >
            <XCircle size={15} />
            {isCancelling ? 'Cancelling...' : 'Cancel payment'}
          </button>
        </div>
      ) : status === 'expired' ? (
        <div className="pricing-checkout-state pricing-checkout-expired">
          <RefreshCw size={16} />
          <span>Session expired. Go back to pricing to create a new QR.</span>
        </div>
      ) : status === 'paid' ? (
        <div className="pricing-checkout-state pricing-checkout-paid">
          <CheckCircle2 size={16} />
          <span>Payment received. Redirecting to success page.</span>
        </div>
      ) : (
        <div className="pricing-checkout-state pricing-checkout-cancelled">
          <XCircle size={16} />
          <span>Payment flow cancelled. You can start again anytime.</span>
        </div>
      )}

      <button type="button" className="pricing-checkout-back" onClick={onBackToPricing}>
        <ArrowLeft size={15} />
        Back to plans
      </button>
    </aside>
  );
}
