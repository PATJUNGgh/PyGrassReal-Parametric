import { useMemo, useState, type FormEvent } from 'react';
import Modal from '../components/Modal';
import { localizeText, useLanguage } from '../../i18n/language';

interface AddCreditsModalProps {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (amountUsd: number) => Promise<void>;
}

const MIN_AMOUNT_USD = 2;
const DEFAULT_AMOUNT = '5.00';

const ADD_CREDITS_MODAL_UI = {
  title: { th: 'เพิ่มเครดิต', en: 'Add Credits' },
  subtitle: {
    th: 'กรอกจำนวนเงินที่ต้องการเติมเครดิต แล้วระบบจะพาไปหน้า Stripe',
    en: 'Enter the amount to top up, then continue to Stripe checkout.',
  },
  amountLabel: { th: 'จำนวนเงิน (USD)', en: 'Amount (USD)' },
  amountPlaceholder: { th: 'เช่น 5.00', en: 'e.g. 5.00' },
  amountHint: { th: 'ขั้นต่ำ $2.00', en: 'Minimum $2.00' },
  cancel: { th: 'ยกเลิก', en: 'Cancel' },
  continueToStripe: { th: 'ไปชำระเงินที่ Stripe', en: 'Continue to Stripe' },
  submitting: { th: 'กำลังสร้างรายการชำระเงิน...', en: 'Preparing Stripe checkout...' },
  requiredAmountError: { th: 'กรุณากรอกจำนวนเงิน', en: 'Please enter an amount.' },
  invalidAmountError: {
    th: 'รูปแบบจำนวนเงินไม่ถูกต้อง (รองรับทศนิยมสูงสุด 2 ตำแหน่ง)',
    en: 'Invalid amount format (up to 2 decimal places).',
  },
  minimumAmountError: {
    th: 'จำนวนเงินขั้นต่ำคือ $2.00',
    en: 'Minimum amount is $2.00.',
  },
};

const parseAmount = (rawAmount: string): number | null => {
  const value = rawAmount.trim();
  if (!value) {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return null;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return Number(amount.toFixed(2));
};

export function AddCreditsModal({ open, isSubmitting, onClose, onSubmit }: AddCreditsModalProps) {
  const { language } = useLanguage();
  const [amountInput, setAmountInput] = useState(DEFAULT_AMOUNT);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const amountValue = useMemo(() => parseAmount(amountInput), [amountInput]);

  const validate = (): boolean => {
    if (!amountInput.trim()) {
      setFieldError(localizeText(language, ADD_CREDITS_MODAL_UI.requiredAmountError));
      return false;
    }

    if (amountValue == null) {
      setFieldError(localizeText(language, ADD_CREDITS_MODAL_UI.invalidAmountError));
      return false;
    }

    if (amountValue < MIN_AMOUNT_USD) {
      setFieldError(localizeText(language, ADD_CREDITS_MODAL_UI.minimumAmountError));
      return false;
    }

    setFieldError(null);
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate() || amountValue == null) {
      return;
    }

    await onSubmit(amountValue);
  };

  const footer = (
    <>
      <button type="button" className="is-secondary" onClick={onClose} disabled={isSubmitting}>
        {localizeText(language, ADD_CREDITS_MODAL_UI.cancel)}
      </button>
      <button
        type="submit"
        form="add-credits-form"
        className="is-primary"
        disabled={isSubmitting || amountValue == null}
      >
        {isSubmitting
          ? localizeText(language, ADD_CREDITS_MODAL_UI.submitting)
          : localizeText(language, ADD_CREDITS_MODAL_UI.continueToStripe)}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={localizeText(language, ADD_CREDITS_MODAL_UI.title)}
      footer={footer}
    >
      <p>{localizeText(language, ADD_CREDITS_MODAL_UI.subtitle)}</p>
      <form id="add-credits-form" onSubmit={handleSubmit}>
        <label htmlFor="billing-add-credits-amount">
          {localizeText(language, ADD_CREDITS_MODAL_UI.amountLabel)}
        </label>
        <input
          id="billing-add-credits-amount"
          type="text"
          inputMode="decimal"
          value={amountInput}
          onChange={(event) => {
            setAmountInput(event.target.value);
            if (fieldError) {
              setFieldError(null);
            }
          }}
          placeholder={localizeText(language, ADD_CREDITS_MODAL_UI.amountPlaceholder)}
          autoFocus
          maxLength={12}
          aria-invalid={fieldError ? 'true' : 'false'}
          aria-describedby="billing-add-credits-help billing-add-credits-error"
        />
        <small id="billing-add-credits-help" className="api-add-credits-helper">
          {localizeText(language, ADD_CREDITS_MODAL_UI.amountHint)}
        </small>
        {fieldError ? (
          <small id="billing-add-credits-error" className="api-add-credits-error">
            {fieldError}
          </small>
        ) : null}
      </form>
    </Modal>
  );
}
