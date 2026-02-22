import type { BillingCycle } from '../types/pricing.types';

interface BillingToggleProps {
  value: BillingCycle;
  onChange: (value: BillingCycle) => void;
}

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  return (
    <div className="pricing-billing-toggle" role="radiogroup" aria-label="Billing cycle">
      <button
        type="button"
        className={`pricing-billing-option ${value === 'monthly' ? 'is-active' : ''}`}
        onClick={() => onChange('monthly')}
        aria-pressed={value === 'monthly'}
      >
        Monthly
      </button>
      <button
        type="button"
        className={`pricing-billing-option ${value === 'yearly' ? 'is-active' : ''}`}
        onClick={() => onChange('yearly')}
        aria-pressed={value === 'yearly'}
      >
        Yearly
        <span className="pricing-billing-save">Save 17%</span>
      </button>
    </div>
  );
}
