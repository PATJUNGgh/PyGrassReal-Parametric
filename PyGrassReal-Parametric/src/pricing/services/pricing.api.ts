import { PRICING_PLANS } from '../config/plans';
import type { BillingCycle, PricingPlan } from '../types/pricing.types';

const QUARTERLY_DISCOUNT_RATE = 0.1;

export const getPlanAmount = (plan: PricingPlan, billingCycle: BillingCycle): number => {
  if (billingCycle === 'yearly') {
    return plan.yearlyPrice;
  }

  if (billingCycle === 'quarterly') {
    if (plan.monthlyPrice <= 0) return 0;
    return Math.round(plan.monthlyPrice * 3 * (1 - QUARTERLY_DISCOUNT_RATE));
  }

  return plan.monthlyPrice;
};

export async function listPricingPlans(): Promise<PricingPlan[]> {
  return PRICING_PLANS;
}

export async function getPricingPlanById(planId: string): Promise<PricingPlan | null> {
  const plan = PRICING_PLANS.find((item) => item.id === planId);
  return plan ?? null;
}
