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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function PlanCard({ plan, billingCycle, onChoosePlan, isCurrentPlan }: PlanCardProps) {
  const amount = getPlanAmount(plan, billingCycle);
  const canCheckout = plan.checkoutEnabled !== false;
  const hasPaidPricing = plan.monthlyPrice > 0;
  const cycleMonths = billingCycle === 'yearly' ? 12 : billingCycle === 'quarterly' ? 3 : 1;
  const cycleUnit = billingCycle === 'yearly' ? 'year' : billingCycle === 'quarterly' ? 'quarter' : 'month';
  const referenceCycleAmount = hasPaidPricing ? plan.monthlyPrice * cycleMonths : 0;
  const cycleSavings =
    hasPaidPricing && cycleMonths > 1
      ? Math.max(0, Math.round((1 - amount / (plan.monthlyPrice * cycleMonths)) * 100))
      : 0;
  const effectiveMonthly = hasPaidPricing && cycleMonths > 1 ? amount / cycleMonths : 0;
  const isPremium = plan.id === 'enterprise';
  const [highlightFeature, ...detailFeatures] = plan.features;
  const isButtonDisabled = isCurrentPlan || !canCheckout;
  const buttonLabel = isCurrentPlan
    ? 'Current plan'
    : !canCheckout
      ? plan.ctaLabel ?? 'Included'
      : plan.ctaLabel ?? 'Choose plan';
  const cardClassName = ['pricing-plan-card', plan.recommended ? 'is-recommended' : '', isPremium ? 'is-premium' : '']
    .filter(Boolean)
    .join(' ');
  const buttonClassName = [
    'pricing-choose-button',
    isButtonDisabled ? 'is-disabled' : '',
    plan.recommended ? 'is-recommended' : '',
    isPremium ? 'is-premium' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClassName}>
      <div className="pricing-plan-head">
        <div className="pricing-plan-head-row">
          <h3>{plan.name}</h3>
          {isPremium ? <span className="pricing-plan-premium-tag">Max Usage</span> : null}
          {plan.badge ? <span className="pricing-plan-badge">{plan.badge}</span> : null}
          {plan.recommended ? (
            <span className="pricing-plan-recommended">
              <Sparkles size={14} />
              Popular
            </span>
          ) : null}
        </div>
      </div>

      <div className="pricing-plan-price-area">
        {hasPaidPricing && cycleMonths > 1 && cycleSavings > 0 ? (
          <p className="pricing-plan-discount">-{cycleSavings}% per {cycleUnit}</p>
        ) : null}
        <div className="pricing-plan-price-wrap">
          <strong>{formatAmount(amount, plan.currency)}</strong>
          <small>/ {cycleUnit}</small>
        </div>
        {hasPaidPricing && cycleMonths > 1 ? (
          <p className="pricing-plan-compare-price">
            <span>{formatAmount(referenceCycleAmount, plan.currency)} / {cycleUnit}</span>
          </p>
        ) : null}
        {hasPaidPricing && cycleMonths > 1 ? (
          <p className="pricing-plan-savings">Effective {formatAmount(effectiveMonthly, plan.currency)} / month</p>
        ) : null}
      </div>

      <button
        type="button"
        className={buttonClassName}
        disabled={isButtonDisabled}
        onClick={() => onChoosePlan(plan.id)}
      >
        {buttonLabel}
      </button>

      {highlightFeature ? (
        <p className="pricing-plan-highlight">
          <Sparkles size={14} />
          <span>{highlightFeature}</span>
        </p>
      ) : null}

      <ul className="pricing-plan-features">
        {detailFeatures.map((feature) => (
          <li key={feature}>
            <Check size={14} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
