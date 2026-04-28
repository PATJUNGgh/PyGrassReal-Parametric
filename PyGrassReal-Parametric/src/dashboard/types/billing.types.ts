export type CreditTransactionKind = 'topup' | 'usage' | 'refund' | 'manual_adjustment';

export type CreditTransactionDirection = 'credit' | 'debit';

export type CreditTransactionStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export interface CreditWallet {
  userId: string;
  balanceUsdCents: number;
  lifetimeTopupUsdCents: number;
  balanceUsdMicros: number;
  lifetimeTopupUsdMicros: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  kind: CreditTransactionKind;
  direction: CreditTransactionDirection;
  amountUsdCents: number;
  balanceAfterUsdCents: number;
  status: CreditTransactionStatus;
  currency: string;
  description: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  externalReferenceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCreditTopupPayload {
  amountUsd: number;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCreditTopupResult {
  url: string;
  sessionId?: string;
}

export interface PaginatedCreditTransactions {
  items: CreditTransaction[];
  totalCount: number;
  page: number;
  pageSize: number;
}
