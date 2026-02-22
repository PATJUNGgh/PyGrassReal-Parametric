import { Check, Minus } from 'lucide-react';
import type { PlanComparisonRow, PricingPlan } from '../types/pricing.types';

interface PlanComparisonProps {
  plans: PricingPlan[];
  rows: PlanComparisonRow[];
}

const renderCellValue = (value: boolean | string | undefined) => {
  if (typeof value === 'boolean') {
    return value ? (
      <span className="pricing-compare-bool is-true">
        <Check size={13} />
        Yes
      </span>
    ) : (
      <span className="pricing-compare-bool is-false">
        <Minus size={13} />
        No
      </span>
    );
  }

  return value ?? '-';
};

export function PlanComparison({ plans, rows }: PlanComparisonProps) {
  return (
    <section className="pricing-comparison-card" aria-label="Plan comparison">
      <div className="pricing-comparison-header">
        <h2>Compare plans</h2>
        <p>Feature matrix for quick decision making.</p>
      </div>

      <div className="pricing-comparison-table-wrap">
        <table className="pricing-comparison-table">
          <thead>
            <tr>
              <th>Feature</th>
              {plans.map((plan) => (
                <th key={plan.id}>{plan.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.label}</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-${row.id}`}>{renderCellValue(plan.comparison[row.id])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
