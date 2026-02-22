import { useMemo } from 'react';
import type { CheckoutSession } from '../types/pricing.types';

interface QRPaymentBoxProps {
  session: CheckoutSession;
  secondsLeft: number;
}

const QR_SIZE = 29;

const pad2 = (value: number): string => value.toString().padStart(2, '0');

const formatCountdown = (secondsLeft: number): string => {
  if (secondsLeft <= 0) return '00:00';
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return `${pad2(mins)}:${pad2(secs)}`;
};

const placeFinderPattern = (cells: boolean[], offsetX: number, offsetY: number): void => {
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const isBorder = x === 0 || x === 6 || y === 0 || y === 6;
      const isInner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      cells[(offsetY + y) * QR_SIZE + (offsetX + x)] = isBorder || isInner;
    }
  }
};

const buildMatrix = (seed: string): boolean[] => {
  const total = QR_SIZE * QR_SIZE;
  const cells = new Array<boolean>(total).fill(false);
  let hash = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let i = 0; i < total; i += 1) {
    hash ^= i + 1;
    hash = Math.imul(hash, 2246822519);
    cells[i] = ((hash >>> 0) & 1) === 1;
  }

  placeFinderPattern(cells, 0, 0);
  placeFinderPattern(cells, QR_SIZE - 7, 0);
  placeFinderPattern(cells, 0, QR_SIZE - 7);
  return cells;
};

export function QRPaymentBox({ session, secondsLeft }: QRPaymentBoxProps) {
  const qrCells = useMemo(() => buildMatrix(session.qr_payload), [session.qr_payload]);
  const isExpired = session.status === 'expired';
  const isPaid = session.status === 'paid';

  return (
    <section className="pricing-qr-card" aria-label="PromptPay QR payment">
      <div className="pricing-qr-top">
        <h2>PromptPay QR</h2>
        <p>Scan with your banking app and complete payment before session expires.</p>
      </div>

      <div className="pricing-qr-stage">
        <div className="pricing-qr-grid" role="img" aria-label="PromptPay QR code">
          {qrCells.map((isDark, index) => (
            <span
              key={`${session.session_id}-${index}`}
              className={`pricing-qr-cell ${isDark ? 'is-dark' : ''}`}
            />
          ))}
        </div>
        {(isExpired || isPaid) && (
          <div className={`pricing-qr-overlay ${isPaid ? 'is-paid' : ''}`}>
            {isPaid ? 'Payment received' : 'Session expired'}
          </div>
        )}
      </div>

      <div className="pricing-qr-meta">
        <div>
          <span>Reference</span>
          <strong>{session.qr_reference}</strong>
        </div>
        <div>
          <span>Expires in</span>
          <strong className={isExpired ? 'is-danger' : ''}>{formatCountdown(secondsLeft)}</strong>
        </div>
      </div>

      <p className="pricing-qr-note">
        QR payload: <code>{session.qr_payload}</code>
      </p>
    </section>
  );
}
