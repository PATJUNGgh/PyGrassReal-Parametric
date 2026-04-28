import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { localizeText, useLanguage } from '../../i18n/language';
import { API_MANAGEMENT_UI } from '../data/dashboardData';
import { AddCreditsModal } from './AddCreditsModal';
import {
  createCreditTopupSession,
  createCustomerPortalSession,
  fetchCreditTransactions,
  fetchCreditWallet,
} from '../services/creditTopup.api';
import type { CreditTransaction, CreditWallet } from '../types/billing.types';

const TRANSACTIONS_PER_PAGE = 8;
type TopupResult = 'success' | 'cancelled' | 'expired' | null;

const BILLING_CREDITS_UI = {
  title: { th: 'Credits', en: 'Credits' },
  liveData: { th: 'Live wallet data', en: 'Live wallet data' },
  buyCredits: { th: 'Buy Credits', en: 'Buy Credits' },
  addCredits: { th: 'Add Credits', en: 'Add Credits' },
  autoTopUp: { th: 'Auto Top-Up', en: 'Auto Top-Up' },
  autoTopUpHint: {
    th: "To activate auto top-up, you'll need a payment method that supports offline charging.",
    en: "To activate auto top-up, you'll need a payment method that supports offline charging.",
  },
  loading: { th: 'Loading...', en: 'Loading...' },
  recentTransactions: { th: 'Recent Transactions', en: 'Recent Transactions' },
  date: { th: 'Date', en: 'Date' },
  amount: { th: 'Amount', en: 'Amount' },
  actions: { th: 'Actions', en: 'Actions' },
  viewInvoice: { th: 'View Invoice', en: 'View Invoice' },
  noTransactions: { th: 'No transactions yet.', en: 'No transactions yet.' },
  notAvailable: { th: '-', en: '-' },
  page: { th: 'Page', en: 'Page' },
  prevPage: { th: 'Previous page', en: 'Previous page' },
  nextPage: { th: 'Next page', en: 'Next page' },
  walletLoadError: { th: 'Unable to load credit data.', en: 'Unable to load credit data.' },
  transactionsLoadError: { th: 'Unable to load transactions.', en: 'Unable to load transactions.' },
  checkoutCreateError: {
    th: 'Unable to create checkout session. Please try again.',
    en: 'Unable to create checkout session. Please try again.',
  },
  customerPortalCreateError: {
    th: 'Unable to open payment method portal. Please try again.',
    en: 'Unable to open payment method portal. Please try again.',
  },
  openingPaymentMethod: {
    th: 'Opening...',
    en: 'Opening...',
  },
  topupSuccess: {
    th: 'Payment successful. Refreshing your latest credit balance.',
    en: 'Payment successful. Refreshing your latest credit balance.',
  },
  topupCancelled: {
    th: 'Payment was cancelled.',
    en: 'Payment was cancelled.',
  },
  topupExpired: {
    th: 'Checkout session expired. Please create a new top-up.',
    en: 'Checkout session expired. Please create a new top-up.',
  },
};

const formatUsdFromCents = (amountUsdCents: number): string => {
  return (amountUsdCents / 100).toFixed(2);
};

const formatUsdFromMicros = (amountUsdMicros: number): string => {
  // Keep Billing display aligned with wallet floor-to-cent behavior (4.997232 -> 4.99)
  const cents = amountUsdMicros >= 0
    ? Math.floor(amountUsdMicros / 10_000)
    : Math.ceil(amountUsdMicros / 10_000);
  return (cents / 100).toFixed(2);
};

const formatSignedAmount = (transaction: CreditTransaction): string => {
  const amount = formatUsdFromCents(transaction.amountUsdCents);
  return transaction.direction === 'debit' ? `-$${amount}` : `$${amount}`;
};

const parseTopupResultFromSearch = (): TopupResult => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('topup');
  if (value === 'success' || value === 'cancelled' || value === 'expired') {
    return value;
  }
  return null;
};

const clearTopupSearchParams = (): void => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('topup') && !params.has('session_id')) {
    return;
  }

  params.delete('topup');
  params.delete('session_id');
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
};

const formatTransactionDate = (isoDate: string, language: 'th' | 'en'): string => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return parsed.toLocaleString(language === 'th' ? 'th-TH' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: language === 'en',
  });
};

export function BillingTab() {
  const { language } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [createSessionError, setCreateSessionError] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [topupResult, setTopupResult] = useState<TopupResult>(null);

  const totalPages = Math.max(1, Math.ceil(totalTransactions / TRANSACTIONS_PER_PAGE));
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  useEffect(() => {
    const parsed = parseTopupResultFromSearch();
    if (!parsed) {
      return;
    }

    setTopupResult(parsed);
    setCurrentPage(1);
    clearTopupSearchParams();
  }, []);

  useEffect(() => {
    if (currentPage <= totalPages) {
      return;
    }
    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const loadWallet = useCallback(async () => {
    setIsWalletLoading(true);
    setWalletError(null);
    try {
      const data = await fetchCreditWallet();
      setWallet(data);
    } catch {
      setWalletError(localizeText(language, BILLING_CREDITS_UI.walletLoadError));
    } finally {
      setIsWalletLoading(false);
    }
  }, [language]);

  const loadTransactions = useCallback(
    async (page: number) => {
      setIsTransactionsLoading(true);
      setTransactionsError(null);
      try {
        const result = await fetchCreditTransactions(page, TRANSACTIONS_PER_PAGE);
        setTransactions(result.items);
        setTotalTransactions(result.totalCount);
      } catch {
        setTransactionsError(localizeText(language, BILLING_CREDITS_UI.transactionsLoadError));
      } finally {
        setIsTransactionsLoading(false);
      }
    },
    [language]
  );

  useEffect(() => {
    void loadWallet();
  }, [loadWallet, topupResult]);

  useEffect(() => {
    void loadTransactions(currentPage);
  }, [currentPage, loadTransactions, topupResult]);

  const topupMessage = useMemo(() => {
    if (topupResult === 'success') {
      return {
        tone: 'success',
        text: localizeText(language, BILLING_CREDITS_UI.topupSuccess),
      };
    }

    if (topupResult === 'cancelled') {
      return {
        tone: 'info',
        text: localizeText(language, BILLING_CREDITS_UI.topupCancelled),
      };
    }

    if (topupResult === 'expired') {
      return {
        tone: 'warning',
        text: localizeText(language, BILLING_CREDITS_UI.topupExpired),
      };
    }

    return null;
  }, [language, topupResult]);

  const handleCreateTopup = async (amountUsd: number) => {
    setCreateSessionError(null);
    setIsCreatingSession(true);
    try {
      const result = await createCreditTopupSession({ amountUsd });
      window.location.assign(result.url);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : localizeText(language, BILLING_CREDITS_UI.checkoutCreateError);
      setCreateSessionError(message);
      setIsCreatingSession(false);
    }
  };

  const handleOpenPortal = async () => {
    setPortalError(null);
    setIsOpeningPortal(true);
    try {
      const result = await createCustomerPortalSession();
      window.location.assign(result.url);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : localizeText(language, BILLING_CREDITS_UI.customerPortalCreateError);
      setPortalError(message);
      setIsOpeningPortal(false);
    }
  };

  const balanceValueMicros = wallet?.balanceUsdMicros ?? ((wallet?.balanceUsdCents ?? 0) * 10_000);

  return (
    <section className="api-tab-block api-billing-credits">
      <div className="api-credits-header">
        <div className="api-credits-title-wrap">
          <h2>{localizeText(language, BILLING_CREDITS_UI.title)}</h2>
          <p>
            {isWalletLoading
              ? localizeText(language, BILLING_CREDITS_UI.loading)
              : localizeText(language, BILLING_CREDITS_UI.liveData)}
          </p>
        </div>
      </div>

      {topupMessage ? (
        <div className={`api-credits-status-message is-${topupMessage.tone}`}>{topupMessage.text}</div>
      ) : null}
      {walletError ? <div className="api-credits-status-message is-error">{walletError}</div> : null}

      <article className="api-credits-balance-card">
        <div className="api-credits-balance-value">
          <span>$</span>
          <strong>{formatUsdFromMicros(balanceValueMicros)}</strong>
        </div>
      </article>

      <div className="api-credits-actions-grid">
        <article className="api-credits-panel">
          <div className="api-credits-panel-head">
            <h3>{localizeText(language, BILLING_CREDITS_UI.buyCredits)}</h3>
          </div>

          <div className="api-credits-panel-body">
            <button
              type="button"
              className="api-credits-primary-btn"
              onClick={() => {
                setCreateSessionError(null);
                setIsTopupModalOpen(true);
              }}
            >
              {localizeText(language, BILLING_CREDITS_UI.addCredits)}
            </button>
            {createSessionError ? <p className="api-credits-create-error">{createSessionError}</p> : null}
          </div>
        </article>

        <article className="api-credits-panel">
          <div className="api-credits-panel-head">
            <h3>{localizeText(language, BILLING_CREDITS_UI.autoTopUp)}</h3>
          </div>
          <div className="api-credits-panel-body">
            <button
              type="button"
              className="api-credits-secondary-btn"
              onClick={() => void handleOpenPortal()}
              disabled={isOpeningPortal}
            >
              {isOpeningPortal
                ? localizeText(language, BILLING_CREDITS_UI.openingPaymentMethod)
                : localizeText(language, API_MANAGEMENT_UI.billing.addPaymentMethod)}
            </button>
            <p className="api-credits-panel-note">
              {localizeText(language, BILLING_CREDITS_UI.autoTopUpHint)}
            </p>
            {portalError ? <p className="api-credits-create-error">{portalError}</p> : null}
          </div>
        </article>
      </div>

      <div className="api-credits-divider" />

      <section className="api-credits-transactions">
        <div className="api-credits-transactions-head">
          <div className="api-credits-transactions-copy">
            <h3>{localizeText(language, BILLING_CREDITS_UI.recentTransactions)}</h3>
          </div>

          <div className="api-credits-pagination" aria-label="Transaction pagination">
            <span className="api-credits-page-indicator">
              {localizeText(language, BILLING_CREDITS_UI.page)} {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              className="api-credits-page-btn"
              aria-label={localizeText(language, BILLING_CREDITS_UI.prevPage)}
              disabled={!canGoPrev || isTransactionsLoading}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              <span className="api-credits-page-arrow" aria-hidden="true">
                {'<'}
              </span>
            </button>
            <button
              type="button"
              className="api-credits-page-btn"
              aria-label={localizeText(language, BILLING_CREDITS_UI.nextPage)}
              disabled={!canGoNext || isTransactionsLoading}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <span className="api-credits-page-arrow" aria-hidden="true">
                {'>'}
              </span>
            </button>
          </div>
        </div>

        <div className="api-credits-table-wrap">
          <table className="api-credits-table">
            <thead>
              <tr>
                <th>{localizeText(language, BILLING_CREDITS_UI.date)}</th>
                <th>{localizeText(language, BILLING_CREDITS_UI.amount)}</th>
                <th className="api-credits-col-actions">{localizeText(language, BILLING_CREDITS_UI.actions)}</th>
              </tr>
            </thead>
            <tbody>
              {isTransactionsLoading ? (
                <tr>
                  <td colSpan={3} className="api-credits-empty-row">
                    {localizeText(language, BILLING_CREDITS_UI.loading)}
                  </td>
                </tr>
              ) : transactionsError ? (
                <tr>
                  <td colSpan={3} className="api-credits-empty-row is-error">
                    {transactionsError}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="api-credits-empty-row">
                    {localizeText(language, BILLING_CREDITS_UI.noTransactions)}
                  </td>
                </tr>
              ) : (
                transactions.map((item) => (
                  <tr key={item.id}>
                    <td>{formatTransactionDate(item.createdAt, language)}</td>
                    <td>{formatSignedAmount(item)}</td>
                    <td className="api-credits-col-actions">
                      {item.externalReferenceUrl ? (
                        <a
                          className="api-credits-inline-link"
                          href={item.externalReferenceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span>{localizeText(language, BILLING_CREDITS_UI.viewInvoice)}</span>
                          <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="api-credits-action-fallback">
                          {localizeText(language, BILLING_CREDITS_UI.notAvailable)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isTopupModalOpen ? (
        <AddCreditsModal
          open={isTopupModalOpen}
          isSubmitting={isCreatingSession}
          onClose={() => {
            if (!isCreatingSession) {
              setIsTopupModalOpen(false);
            }
          }}
          onSubmit={handleCreateTopup}
        />
      ) : null}
    </section>
  );
}
