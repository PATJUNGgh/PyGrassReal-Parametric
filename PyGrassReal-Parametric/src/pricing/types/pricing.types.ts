export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export interface PlanComparisonRow {
  id: string;
  label: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: 'USD';
  checkoutEnabled?: boolean;
  badge?: string;
  recommended?: boolean;
  ctaLabel?: string;
  features: string[];
  comparison: Record<string, boolean | string>;
}

export type CheckoutStatus = 'pending' | 'paid' | 'expired' | 'cancelled';
export type PaymentMethod = 'promptpay_qr' | 'external_redirect';

export interface CheckoutSession {
  session_id: string;
  user_id: string;
  plan_id: string;
  billing_cycle: BillingCycle;
  amount: number;
  currency: 'USD';
  payment_method: PaymentMethod;
  status: CheckoutStatus;
  qr_payload: string;
  qr_reference: string;
  redirect_url?: string | null;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
}

export interface SubscriptionEntitlement {
  user_id: string;
  plan_id: string;
  billing_cycle: BillingCycle;
  status: 'active';
  activated_at: string;
  current_period_end: string | null;
}
