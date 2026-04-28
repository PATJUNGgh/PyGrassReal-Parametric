import { describe, expect, it } from 'vitest';
import { PRICING_PLANS } from '../config/plans';
import { getPlanAmount } from './pricing.api';

describe('pricing.api#getPlanAmount', () => {
  it('returns discounted quarterly amount for paid plans', () => {
    const starter = PRICING_PLANS.find((plan) => plan.id === 'starter');
    expect(starter).toBeDefined();
    if (!starter) return;

    const quarterlyAmount = getPlanAmount(starter, 'quarterly');
    expect(quarterlyAmount).toBe(1323);
  });

  it('returns zero for quarterly free plan', () => {
    const free = PRICING_PLANS.find((plan) => plan.id === 'free');
    expect(free).toBeDefined();
    if (!free) return;

    const quarterlyAmount = getPlanAmount(free, 'quarterly');
    expect(quarterlyAmount).toBe(0);
  });
});
