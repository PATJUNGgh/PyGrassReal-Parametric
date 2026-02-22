import type { CheckoutStatus } from '../types/pricing.types';

interface PaymentStatusBadgeProps {
  status: CheckoutStatus;
}

const STATUS_LABEL: Record<CheckoutStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return (
    <span className={`pricing-payment-status pricing-payment-status-${status}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
