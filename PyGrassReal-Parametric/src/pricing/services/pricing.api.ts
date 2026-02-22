import { PRICING_PLANS } from '../config/plans';
import type { BillingCycle, PricingPlan } from '../types/pricing.types';

const NETWORK_DELAY_MS = 220;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const getPlanAmount = (plan: PricingPlan, billingCycle: BillingCycle): number => {
  return billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
};

export async function listPricingPlans(): Promise<PricingPlan[]> {
  await wait(NETWORK_DELAY_MS);
  return PRICING_PLANS;
}

export async function getPricingPlanById(planId: string): Promise<PricingPlan | null> {
  await wait(NETWORK_DELAY_MS);
  const plan = PRICING_PLANS.find((item) => item.id === planId);
  return plan ?? null;
}
