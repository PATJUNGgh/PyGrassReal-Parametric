import { Check, Sparkles } from 'lucide-react';
import type { BillingCycle, PricingPlan } from '../types/pricing.types';
import { getPlanAmount } from '../services/pricing.api';

interface PlanCardProps {
  plan: PricingPlan;
  billingCycle: BillingCycle;
  onChoosePlan: (planId: string) => void;
  isCurrentPlan: boolean;
}

const formatAmount = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function PlanCard({ plan, billingCycle, onChoosePlan, isCurrentPlan }: PlanCardProps) {
  const amount = getPlanAmount(plan, billingCycle);
  const canCheckout = plan.checkoutEnabled !== false;
  const hasPaidPricing = plan.monthlyPrice > 0 && plan.yearlyPrice > 0;
  const yearlyAsMonthly = hasPaidPricing ? plan.yearlyPrice / 12 : 0;
  const yearlySavings = hasPaidPricing
    ? Math.max(0, Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100))
    : 0;
  const isButtonDisabled = isCurrentPlan || !canCheckout;
  const buttonLabel = isCurrentPlan
    ? 'Current plan'
    : !canCheckout
      ? plan.ctaLabel ?? 'Included'
      : plan.ctaLabel ?? 'Choose plan';

  return (
    <article className={`pricing-plan-card ${plan.recommended ? 'is-recommended' : ''}`}>
      <div className="pricing-plan-head">
        <div className="pricing-plan-badge-row">
          {plan.badge ? <span className="pricing-plan-badge">{plan.badge}</span> : null}
          {plan.recommended ? (
            <span className="pricing-plan-recommended">
              <Sparkles size={14} />
              Popular
            </span>
          ) : null}
        </div>
        <h3>{plan.name}</h3>
        <p>{plan.description}</p>
      </div>

      <div className="pricing-plan-price-wrap">
        <strong>{formatAmount(amount, plan.currency)}</strong>
        <small>/ {billingCycle === 'yearly' ? 'year' : 'month'}</small>
      </div>

      {billingCycle === 'yearly' && hasPaidPricing ? (
        <p className="pricing-plan-savings">
          Effective {formatAmount(yearlyAsMonthly, plan.currency)} / month, save {yearlySavings}%
        </p>
      ) : null}

      <ul className="pricing-plan-features">
        {plan.features.map((feature) => (
          <li key={feature}>
            <Check size={14} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`pricing-choose-button ${isButtonDisabled ? 'is-disabled' : ''}`}
        disabled={isButtonDisabled}
        onClick={() => onChoosePlan(plan.id)}
      >
        {buttonLabel}
      </button>
    </article>
  );
}
