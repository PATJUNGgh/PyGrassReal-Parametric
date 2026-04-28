import { Info, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LocalizedText } from '../../i18n/language';
import { localizeText, useLanguage } from '../../i18n/language';
import { PRICING_PLANS } from '../../pricing/config/plans';
import { API_MANAGEMENT_UI } from '../data/dashboardData';
import { PLATFORM_CONFIG, PERIOD_OPTIONS, ALL_PLATFORMS } from '../data/tokenUsageConfig';
import { useUserEntitlement } from '../hooks/useUserEntitlement';
import { useTokenUsage } from '../hooks/useTokenUsage';
import { fetchCreditWallet, createCustomerPortalSession } from '../services/creditTopup.api';
import { resetUsageHistory } from '../services/tokenUsage.service';
import type { CreditWallet } from '../types/billing.types';
import type { UsagePeriod } from '../types/tokenUsage.types';

type SubscriptionSubTab = 'subscription' | 'usage';

const USAGE_UI = {
  dashboardTitle: { th: 'แดชบอร์ดการใช้งาน', en: 'Usage dashboard' },
  balanceTitle: { th: 'Balance', en: 'Balance' },
  remaining: { th: 'เหลือ', en: 'remaining' },
  usageBreakdownTitle: { th: 'Usage breakdown', en: 'Usage breakdown' },
  personalUsage: { th: 'การใช้งานส่วนตัว', en: 'Personal usage' },
  tokenUsageLabel: { th: 'ค่าใช้จ่าย (USD/วัน)', en: 'Cost (USD/day)' },
  usageHistoryTitle: { th: 'ประวัติการใช้งาน API', en: 'API usage history' },
  creditsRemaining: { th: 'เครดิตคงเหลือ', en: 'Credits remaining' },
  addMore: { th: 'เพิ่มเครดิต', en: 'Add more' },
  tableDate: { th: 'วันที่', en: 'Date' },
  tablePlatform: { th: 'แพลตฟอร์ม', en: 'Platform' },
  tableModel: { th: 'โมเดล', en: 'Model' },
  tableTokens: { th: 'Token', en: 'Tokens' },
  tableCost: { th: 'ค่าใช้จ่าย', en: 'Cost' },
  noCreditUsage: { th: 'ยังไม่มีประวัติการใช้งาน', en: 'No usage recorded yet' },
  previous: { th: 'ก่อนหน้า', en: 'Previous' },
  next: { th: 'ถัดไป', en: 'Next' },
  resetHistory: { th: 'รีเซ็ตตาราง', en: 'Reset table' },
  hourlyLimit: { th: 'ลิมิตการใช้งาน 5 นาที', en: '5 minute usage limit' },
  weeklyLimit: { th: 'ลิมิตการใช้งาน 10 นาที', en: '10 minute usage limit' },
  resetAt: (date: string): LocalizedText => ({
    th: `รีเซ็ต ${new Date(date).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    en: `Resets ${new Date(date).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
  }),
  loading: { th: 'กำลังโหลด...', en: 'Loading...' },
  monthlyLimit: { th: 'โควต้าค่าใช้จ่ายรายเดือน', en: 'Monthly cost quota' },
  tokensUsed: { th: 'ใช้แล้ว', en: 'used' },
  tokensTotal: { th: 'รวมอ้างอิงรายเดือน', en: 'total reference' },
  apiCreditsTitle: { th: 'เครดิต API คงเหลือ', en: 'API credits balance' },
  tokensUsedCount: { th: 'โทเคนที่ถูกใช้ไป', en: 'Tokens used' },
  syncedWithBilling: { th: 'ยอดนี้ตรงกับ Credits ใน Billing', en: 'This matches the Credits balance in Billing.' },
  openBilling: { th: 'ไปที่ Billing', en: 'Open Billing' },
  walletLoadError: { th: 'ไม่สามารถโหลดเครดิต API ได้', en: 'Unable to load API credits.' },
};

const SUBSCRIPTION_INFO_UI = {
  currentTitle: { th: 'Current subscription', en: 'Current subscription' },
  currentSubtitle: { th: 'Your active plan and billing cycle details', en: 'Your active plan and billing cycle details' },
  checking: { th: 'Checking current subscription...', en: 'Checking current subscription...' },
  planLabel: { th: 'Plan', en: 'Plan' },
  billingLabel: { th: 'Billing cycle', en: 'Billing cycle' },
  activatedAtLabel: { th: 'Activated at', en: 'Activated at' },
  renewAtLabel: { th: 'Current period end', en: 'Current period end' },
  notAvailable: { th: 'N/A', en: 'N/A' },
  statusActive: { th: 'Active', en: 'Active' },
  statusFree: { th: 'Free tier', en: 'Free tier' },
  noPaidPlanNotice: {
    th: 'No paid subscription yet. You are currently on the free tier.',
    en: 'No paid subscription yet. You are currently on the free tier.',
  },
};

const BILLING_CYCLE_LABELS = {
  monthly: { th: 'Monthly', en: 'Monthly' },
  quarterly: { th: 'Quarterly', en: 'Quarterly' },
  yearly: { th: 'Yearly', en: 'Yearly' },
} as const;

const formatSubscriptionDate = (value: string | null, language: 'th' | 'en'): string => {
  if (!value) return localizeText(language, SUBSCRIPTION_INFO_UI.notAvailable);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return localizeText(language, SUBSCRIPTION_INFO_UI.notAvailable);
  return parsed.toLocaleString(language === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const formatUsdFromMicros = (amountUsdMicros: number): string => {
  return (amountUsdMicros / 1_000_000).toFixed(6);
};

const USD_TO_CREDITS = 100_000_000;

const creditsFromUsd = (amountUsd: number): number => {
  return Math.max(0, Math.round(amountUsd * USD_TO_CREDITS));
};

const formatCreditsAmount = (amountCredits: number, language: 'th' | 'en'): string => {
  return Math.max(0, Math.round(amountCredits)).toLocaleString(language === 'th' ? 'th-TH' : 'en-US');
};

const HISTORY_PER_PAGE = 10;

interface SubscriptionTabProps {
  forcedSubTab?: SubscriptionSubTab;
}

export function SubscriptionTab({ forcedSubTab }: SubscriptionTabProps = {}) {
  const { language } = useLanguage();
  const { entitlement, loading: isEntitlementLoading } = useUserEntitlement();
  const activeSubTab: SubscriptionSubTab = forcedSubTab ?? (new URLSearchParams(window.location.search).get('subtab') === 'usage'
    ? 'usage'
    : 'subscription');
  const [visiblePlatforms, setVisiblePlatforms] = useState<Set<string>>(new Set(ALL_PLATFORMS));
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [isResettingHistory, setIsResettingHistory] = useState(false);
  const historyResetScrollRef = useRef<{ top: number; left: number; target: HTMLElement | null; until: number } | null>(null);
  const historyResetFrameRef = useRef<number | null>(null);

  const handleOpenPortal = async () => {
    setPortalError(null);
    setIsOpeningPortal(true);
    try {
      const result = await createCustomerPortalSession();
      window.location.assign(result.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open Stripe customer portal.';
      setPortalError(message);
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const {
    chartData, chartLoading,
    period, setPeriod,
    limits, limitsLoading,
    historyItems, historyTotal, historyPage, historyLoading,
    setHistoryPage, monthlyCostUsed, monthlyTokensUsed, hourlyCostUsed, weeklyCostUsed, apiLifetimeTokensUsed,
    refetch,
  } = useTokenUsage();

  const totalPages = Math.max(1, Math.ceil(historyTotal / HISTORY_PER_PAGE));

  const currentPlanId = entitlement?.plan_id ?? 'free';
  const matchedPlan = useMemo(
    () => PRICING_PLANS.find((plan) => plan.id === currentPlanId),
    [currentPlanId]
  );
  const currentPlanName = matchedPlan?.name ?? `${currentPlanId.charAt(0).toUpperCase()}${currentPlanId.slice(1)}`;
  const currentStatusText = entitlement
    ? localizeText(language, SUBSCRIPTION_INFO_UI.statusActive)
    : localizeText(language, SUBSCRIPTION_INFO_UI.statusFree);
  const currentBillingText = entitlement
    ? localizeText(language, BILLING_CYCLE_LABELS[entitlement.billing_cycle])
    : localizeText(language, SUBSCRIPTION_INFO_UI.notAvailable);
  const activatedAtText = formatSubscriptionDate(entitlement?.activated_at ?? null, language);
  const periodEndText = formatSubscriptionDate(entitlement?.current_period_end ?? null, language);

  const loadWallet = useCallback(async () => {
    setIsWalletLoading(true);
    setWalletError(null);

    try {
      const data = await fetchCreditWallet();
      setWallet(data);
    } catch {
      setWalletError(localizeText(language, USAGE_UI.walletLoadError));
    } finally {
      setIsWalletLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const restoreHistoryResetScroll = useCallback(() => {
    const lock = historyResetScrollRef.current;
    if (!lock) return;

    if (lock.target) {
      lock.target.scrollTop = lock.top;
      lock.target.scrollLeft = lock.left;
    } else {
      window.scrollTo(lock.left, lock.top);
    }

    if (Date.now() > lock.until) {
      historyResetScrollRef.current = null;
    }
  }, []);

  const scheduleHistoryResetScrollRestore = useCallback(() => {
    if (historyResetFrameRef.current !== null) {
      window.cancelAnimationFrame(historyResetFrameRef.current);
    }

    restoreHistoryResetScroll();
    historyResetFrameRef.current = window.requestAnimationFrame(() => {
      restoreHistoryResetScroll();
      historyResetFrameRef.current = window.requestAnimationFrame(() => {
        restoreHistoryResetScroll();
        historyResetFrameRef.current = null;
      });
    });
  }, [restoreHistoryResetScroll]);

  useEffect(() => {
    if (historyResetScrollRef.current) {
      scheduleHistoryResetScrollRestore();
    }
  }, [chartLoading, historyItems.length, historyLoading, historyTotal, scheduleHistoryResetScrollRestore]);

  useEffect(() => {
    return () => {
      if (historyResetFrameRef.current !== null) {
        window.cancelAnimationFrame(historyResetFrameRef.current);
      }
    };
  }, []);

  const handleResetHistory = useCallback(async () => {
    if (isResettingHistory) return;

    const scrollTarget = document.querySelector<HTMLElement>('.dashboard-main');
    historyResetScrollRef.current = {
      top: scrollTarget?.scrollTop ?? window.scrollY,
      left: scrollTarget?.scrollLeft ?? window.scrollX,
      target: scrollTarget,
      until: Date.now() + 1800,
    };
    scheduleHistoryResetScrollRestore();
    setIsResettingHistory(true);

    try {
      await resetUsageHistory();
      if (historyPage !== 1) {
        setHistoryPage(1);
      }
      refetch();
    } catch (error) {
      console.error('[SubscriptionTab] reset usage history error:', error);
    } finally {
      setIsResettingHistory(false);
      scheduleHistoryResetScrollRestore();
    }
  }, [historyPage, isResettingHistory, refetch, scheduleHistoryResetScrollRestore, setHistoryPage]);

  // คำนวณขีดสุดของกราฟ (ผลรวมของทุกแพลตฟอร์มต่อวัน)
  const chartMax = useMemo(() => {
    let max = 1;
    for (const row of chartData) {
      let dayTotal = 0;
      for (const p of ALL_PLATFORMS) {
        if (visiblePlatforms.has(p)) {
          dayTotal += row[p];
        }
      }
      if (dayTotal > max) max = dayTotal;
    }
    return max * 1.1; // เผื่อความสูงด้านบนให้ดูไม่ตัน
  }, [chartData, visiblePlatforms]);

  const togglePlatform = (platform: string) => {
    setVisiblePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        if (next.size > 1) next.delete(platform); // ต้องเหลืออย่างน้อย 1
      } else {
        next.add(platform);
      }
      return next;
    });
  };

  // Cost limits — ดึงจากหลังบ้านก่อน ถ้าไม่มีค่อย fallback ตามราคาแผน
  const PLAN_COST_LIMITS: Record<string, { hourly: number; weekly: number; monthly: number }> = {
    starter:    { hourly: 0.36,    weekly: 2.16,    monthly: 9.00  },
    pro:        { hourly: 0.7125,  weekly: 4.75,    monthly: 19.00 },
    studio:     { hourly: 1.625,   weekly: 9.75,    monthly: 39.00 },
    enterprise: { hourly: 2.76,    weekly: 16.10,   monthly: 69.00 },
    free:       { hourly: 0.0020,  weekly: 0.0040,  monthly: 0.0060 },
  };
  const PLAN_MONTHLY_CREDITS_QUOTAS: Partial<Record<string, number>> = {
    starter: 600_000_000,
  };

  const planFallback = PLAN_COST_LIMITS[currentPlanId] ?? PLAN_COST_LIMITS.free;
  const monthlyLimitAmount  = limits?.monthly_cost_limit  ?? planFallback.monthly;
  const hourlyLimitAmount   = limits?.hourly_cost_limit   ?? planFallback.hourly;
  const weeklyLimitAmount   = limits?.weekly_cost_limit   ?? planFallback.weekly;

  // Expiry checks
  const isHourlyExpired = limits?.hourly_reset_at ? new Date(limits.hourly_reset_at).getTime() < Date.now() : false;
  const isWeeklyExpired = limits?.weekly_reset_at ? new Date(limits.weekly_reset_at).getTime() < Date.now() : false;

  // Keep personal usage cards isolated from API usage by reading only token_usage rows
  // that do not have an api_key_id. usage_limits is used only for limits/reset windows.
  const hourlyUsedAmount = isHourlyExpired ? 0 : hourlyCostUsed;
  const weeklyUsedAmount = isWeeklyExpired ? 0 : weeklyCostUsed;
  const monthlyUsedAmount = monthlyCostUsed;
  const walletBalanceMicros = wallet?.balanceUsdMicros ?? ((wallet?.balanceUsdCents ?? 0) * 10_000);
  const walletReferenceMicros = Math.max(
    wallet?.lifetimeTopupUsdMicros ?? ((wallet?.lifetimeTopupUsdCents ?? 0) * 10_000),
    walletBalanceMicros,
  );

  // Percentages
  const rawHourlyPercent = Math.round((hourlyUsedAmount / hourlyLimitAmount) * 100);
  const hourlyPercent = isNaN(rawHourlyPercent) || !isFinite(rawHourlyPercent) ? 0 : Math.min(100, Math.max(0, rawHourlyPercent));
  const hourlyRemainingPercent = Math.max(0, 100 - hourlyPercent);

  const rawWeeklyPercent = Math.round((weeklyUsedAmount / weeklyLimitAmount) * 100);
  const weeklyPercent = isNaN(rawWeeklyPercent) || !isFinite(rawWeeklyPercent) ? 0 : Math.min(100, Math.max(0, rawWeeklyPercent));
  const weeklyRemainingPercent = Math.max(0, 100 - weeklyPercent);

  const rawMonthlyPercent = Math.round((monthlyUsedAmount / monthlyLimitAmount) * 100);
  const monthlyUsedCreditsAmount = creditsFromUsd(monthlyUsedAmount);
  const monthlyLimitCreditsAmount = PLAN_MONTHLY_CREDITS_QUOTAS[currentPlanId] ?? creditsFromUsd(monthlyLimitAmount);
  const planCreditsPerUsd = monthlyLimitAmount > 0
    ? (monthlyLimitCreditsAmount / monthlyLimitAmount)
    : USD_TO_CREDITS;
  const hourlyUsedCredits = formatCreditsAmount(hourlyUsedAmount * planCreditsPerUsd, language);
  const hourlyLimitCredits = formatCreditsAmount(hourlyLimitAmount * planCreditsPerUsd, language);
  const weeklyUsedCredits = formatCreditsAmount(weeklyUsedAmount * planCreditsPerUsd, language);
  const weeklyLimitCredits = formatCreditsAmount(weeklyLimitAmount * planCreditsPerUsd, language);
  const rawMonthlyCreditsPercent = Math.round((monthlyUsedCreditsAmount / monthlyLimitCreditsAmount) * 100);
  const monthlyCreditsPercent = isNaN(rawMonthlyCreditsPercent) || !isFinite(rawMonthlyCreditsPercent)
    ? 0
    : Math.min(100, Math.max(0, rawMonthlyCreditsPercent));
  const monthlyCreditsRemainingPercent = Math.max(0, 100 - monthlyCreditsPercent);
  const monthlyUsedCredits = formatCreditsAmount(monthlyUsedCreditsAmount, language);
  const monthlyLimitCredits = formatCreditsAmount(monthlyLimitCreditsAmount, language);
  const monthlyCreditsQuotaLabel = language === 'th'
    ? '\u0e42\u0e04\u0e27\u0e15\u0e49\u0e32\u0e40\u0e04\u0e23\u0e14\u0e34\u0e15\u0e23\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19'
    : 'Monthly credits quota';
  const creditsUnitLabel = language === 'th'
    ? '\u0e40\u0e04\u0e23\u0e14\u0e34\u0e15'
    : 'Credits';

  const rawWalletPercent = walletReferenceMicros > 0
    ? Number(((walletBalanceMicros / walletReferenceMicros) * 100).toFixed(2))
    : 0;
  const walletRemainingPercent = isNaN(rawWalletPercent) || !isFinite(rawWalletPercent)
    ? 0
    : Math.min(100, Math.max(0, rawWalletPercent));

  // axis dates
  const axisStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (period - 1));
    return d.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' });
  }, [period, language]);
  const axisEnd = useMemo(() => {
    return new Date().toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' });
  }, [language]);

  return (
    <section className="api-tab-block">
      {activeSubTab === 'subscription' ? (
        <section className="api-current-subscription">
          <header className="api-current-subscription-head">
            <div>
              <h3>{localizeText(language, SUBSCRIPTION_INFO_UI.currentTitle)}</h3>
              <p>{localizeText(language, SUBSCRIPTION_INFO_UI.currentSubtitle)}</p>
            </div>
            <span className={`api-current-subscription-status ${entitlement ? 'is-active' : 'is-free'}`}>
              {currentStatusText}
            </span>
          </header>

          {isEntitlementLoading ? (
            <p className="api-current-subscription-loading">
              {localizeText(language, SUBSCRIPTION_INFO_UI.checking)}
            </p>
          ) : (
            <>
              <div className="api-balance-grid api-current-subscription-grid">
                <article className="api-balance-card">
                  <span>{localizeText(language, SUBSCRIPTION_INFO_UI.planLabel)}</span>
                  <strong>{currentPlanName}</strong>
                </article>
                <article className="api-balance-card">
                  <span>{localizeText(language, SUBSCRIPTION_INFO_UI.billingLabel)}</span>
                  <strong>{currentBillingText}</strong>
                </article>
                <article className="api-balance-card">
                  <span>{localizeText(language, SUBSCRIPTION_INFO_UI.activatedAtLabel)}</span>
                  <strong>{activatedAtText}</strong>
                </article>
                <article className="api-balance-card">
                  <span>{localizeText(language, SUBSCRIPTION_INFO_UI.renewAtLabel)}</span>
                  <strong>{periodEndText}</strong>
                </article>
                {currentPlanId !== 'free' && (
                  <article className="api-balance-card">
                    <span>{language === 'th' ? 'โควต้า API (รายเดือน)' : 'API Quota (Monthly)'}</span>
                    <strong>
                      <span style={{ color: '#0ea5e9' }}>${monthlyUsedAmount.toFixed(4)}</span>
                      <span style={{ fontSize: '0.85em', color: '#94a3b8', fontWeight: 'normal' }}> / ${monthlyLimitAmount.toFixed(4)} ({rawMonthlyPercent}%)</span>
                    </strong>
                  </article>
                )}
              </div>

              <div className="api-current-subscription-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {!entitlement ? (
                  <>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
                      {localizeText(language, SUBSCRIPTION_INFO_UI.noPaidPlanNotice)}
                    </p>
                    <a href="/pricing?from=api" className="api-action-btn is-primary" style={{ textDecoration: 'none', marginLeft: 'auto' }}>
                      {localizeText(language, API_MANAGEMENT_UI.subscription.grabOne)}
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="api-action-btn"
                      onClick={() => void handleOpenPortal()}
                      disabled={isOpeningPortal}
                    >
                      {isOpeningPortal
                        ? (language === 'th' ? 'กำลังเปิด...' : 'Opening...')
                        : (language === 'th' ? 'จัดการ Subscription ผ่าน Stripe' : 'Manage Subscription via Stripe')}
                    </button>
                    <a href="/pricing?from=api" className="api-action-btn is-primary" style={{ textDecoration: 'none' }}>
                      {language === 'th' ? 'เปลี่ยนแผนใช้งาน' : 'Change Plan'}
                    </a>
                    {portalError ? <p className="ak-error" style={{ fontSize: '0.85rem', margin: 0, color: '#f87171' }}>{portalError}</p> : null}
                  </>
                )}
              </div>
            </>
          )}
        </section>
      ) : (
        <div className="api-usage-dashboard">
          {/* ── Balance ── */}
          <section className="api-usage-section">
            <h3 className="api-usage-title">{localizeText(language, USAGE_UI.dashboardTitle)}</h3>
            <div className="api-usage-divider" />
            <h4 className="api-usage-subtitle">{localizeText(language, USAGE_UI.balanceTitle)}</h4>

            <div className="api-usage-balance-grid">
              {/* 5-hour limit */}
              <article className="api-usage-balance-card">
                <div className="api-usage-balance-head">
                  <p>{localizeText(language, USAGE_UI.hourlyLimit)}</p>
                </div>
                {limitsLoading ? (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#9eb1c8' }}>
                    {localizeText(language, USAGE_UI.loading)}
                  </p>
                ) : (
                  <>
                    <div className="api-usage-balance-value">
                      <strong>{hourlyRemainingPercent}%</strong>
                      <span>{localizeText(language, USAGE_UI.remaining)}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', marginBottom: '8px' }}>
                      {hourlyUsedCredits} {creditsUnitLabel} / {hourlyLimitCredits} {creditsUnitLabel}
                    </div>
                    <div className="api-usage-progress-track">
                      <span className="api-usage-progress-fill" style={{ width: `${hourlyRemainingPercent}%` }} />
                    </div>
                    {isHourlyExpired ? (
                      <p className="api-usage-reset-text" style={{ color: '#10b981' }}>
                        {language === 'th' ? 'พร้อมใช้งาน' : 'Ready to use'}
                      </p>
                    ) : limits?.hourly_reset_at ? (
                      <p className="api-usage-reset-text">
                        {localizeText(language, USAGE_UI.resetAt(limits.hourly_reset_at))}
                      </p>
                    ) : (
                      <p className="api-usage-reset-text is-hidden" aria-hidden="true">.</p>
                    )}
                  </>
                )}
              </article>

              {/* Weekly limit */}
              <article className="api-usage-balance-card">
                <div className="api-usage-balance-head">
                  <p>{localizeText(language, USAGE_UI.weeklyLimit)}</p>
                </div>
                {limitsLoading ? (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#9eb1c8' }}>
                    {localizeText(language, USAGE_UI.loading)}
                  </p>
                ) : (
                  <>
                    <div className="api-usage-balance-value">
                      <strong>{weeklyRemainingPercent}%</strong>
                      <span>{localizeText(language, USAGE_UI.remaining)}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', marginBottom: '8px' }}>
                      {weeklyUsedCredits} {creditsUnitLabel} / {weeklyLimitCredits} {creditsUnitLabel}
                    </div>
                    <div className="api-usage-progress-track">
                      <span className="api-usage-progress-fill" style={{ width: `${weeklyRemainingPercent}%` }} />
                    </div>
                    {isWeeklyExpired ? (
                      <p className="api-usage-reset-text" style={{ color: '#10b981' }}>
                        {language === 'th' ? 'พร้อมใช้งาน' : 'Ready to use'}
                      </p>
                    ) : limits?.weekly_reset_at ? (
                      <p className="api-usage-reset-text">
                        {localizeText(language, USAGE_UI.resetAt(limits.weekly_reset_at))}
                      </p>
                    ) : (
                      <p className="api-usage-reset-text is-hidden" aria-hidden="true">.</p>
                    )}
                  </>
                )}
              </article>
            </div>

            {/* Monthly Credits Quota (Blue Card) */}
            {currentPlanId !== 'free' && (
              <div className="api-usage-balance-grid" style={{ marginTop: '16px', gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <article className="api-usage-balance-card" style={{ background: 'rgba(14, 165, 233, 0.05)', borderColor: 'rgba(14, 165, 233, 0.2)' }}>
                  <div className="api-usage-balance-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ color: '#bae6fd', margin: 0 }}>{monthlyCreditsQuotaLabel}</p>
                    <span style={{ fontSize: '0.85rem', color: '#7dd3fc', opacity: 0.9 }}>
                      {monthlyTokensUsed.toLocaleString(language === 'th' ? 'th-TH' : 'en-US')} {localizeText(language, USAGE_UI.tokensUsedCount)}
                    </span>
                  </div>
                  {limitsLoading ? (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#9eb1c8' }}>
                      {localizeText(language, USAGE_UI.loading)}
                    </p>
                  ) : (
                    <>
                      <div className="api-usage-balance-value" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#0ea5e9', fontSize: '1.75rem' }}>
                          {monthlyUsedCredits} {creditsUnitLabel}
                        </strong>
                        <span style={{ color: '#7dd3fc', fontSize: '1rem' }}>
                          / {monthlyLimitCredits} {creditsUnitLabel}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.88rem', marginLeft: 'auto' }}>
                          {monthlyCreditsRemainingPercent}% {localizeText(language, USAGE_UI.remaining)}
                        </span>
                      </div>
                      <div className="api-usage-progress-track" style={{ background: 'rgba(14, 165, 233, 0.1)', height: '10px', marginTop: '12px' }}>
                        <span className="api-usage-progress-fill" style={{ width: `${monthlyCreditsRemainingPercent}%`, background: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)' }} />
                      </div>
                    </>
                  )}
                </article>
              </div>
            )}

            {/* API Credit Wallet (Purple Card) */}
            <div className="api-usage-balance-grid" style={{ marginTop: '16px', gridTemplateColumns: 'minmax(0, 1fr)' }}>
              <article className="api-usage-balance-card" style={{ background: 'rgba(168, 85, 247, 0.05)', borderColor: 'rgba(168, 85, 247, 0.2)' }}>
                <div className="api-usage-balance-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ color: '#e9d5ff', margin: 0 }}>{localizeText(language, USAGE_UI.apiCreditsTitle)}</p>
                  <span style={{ fontSize: '0.85rem', color: '#d8b4fe', opacity: 0.9 }}>
                    {apiLifetimeTokensUsed.toLocaleString()} {localizeText(language, USAGE_UI.tokensUsedCount)}
                  </span>
                </div>
                {isWalletLoading ? (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#9eb1c8' }}>
                    {localizeText(language, USAGE_UI.loading)}
                  </p>
                ) : walletError ? (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#fda4af' }}>
                    {walletError}
                  </p>
                ) : (
                  <>
                    <div className="api-usage-balance-value" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ color: '#a855f7', fontSize: '1.75rem' }}>${formatUsdFromMicros(walletBalanceMicros)}</strong>
                      <span style={{ color: '#d8b4fe', fontSize: '1rem' }}>/ ${formatUsdFromMicros(walletReferenceMicros)}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.88rem', marginLeft: 'auto' }}>
                        {walletRemainingPercent}% {localizeText(language, USAGE_UI.remaining)}
                      </span>
                    </div>
                    <div className="api-usage-progress-track" style={{ background: 'rgba(168, 85, 247, 0.1)', height: '10px', marginTop: '12px' }}>
                      <span className="api-usage-progress-fill" style={{ width: `${walletRemainingPercent}%`, background: 'linear-gradient(90deg, #a855f7 0%, #c084fc 100%)' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <p className="api-usage-reset-text" style={{ margin: 0 }}>
                        {localizeText(language, USAGE_UI.syncedWithBilling)}
                      </p>
                      <a
                        href="/dashboard/api?tab=billing"
                        className="api-usage-add-more"
                        style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                      >
                        {localizeText(language, USAGE_UI.openBilling)}
                      </a>
                    </div>
                  </>
                )}
              </article>
            </div>
          </section>

          {/* ── Usage Breakdown Chart ── */}
          <section className="api-usage-section">
            <h3 className="api-usage-title with-icon">
              {localizeText(language, USAGE_UI.usageBreakdownTitle)}
              <Info size={14} />
            </h3>

            <div className="api-usage-chart-card">
              <div className="api-usage-chart-head">
                <div className="api-usage-chart-head-copy">
                  <p>{localizeText(language, USAGE_UI.personalUsage)}</p>
                  <span>{localizeText(language, USAGE_UI.tokenUsageLabel)}</span>
                </div>
                {/* Period Selector */}
                <div style={{ display: 'inline-flex', gap: '4px' }}>
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="api-usage-period-btn"
                      style={{
                        cursor: 'pointer',
                        borderColor: period === opt.value ? 'rgba(125, 211, 252, 0.64)' : undefined,
                        background: period === opt.value ? 'rgba(30, 64, 175, 0.34)' : undefined,
                        color: period === opt.value ? '#f3f9ff' : undefined,
                      }}
                      onClick={() => setPeriod(opt.value as UsagePeriod)}
                    >
                      {localizeText(language, opt.label)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="api-usage-chart-plot">
                {chartLoading ? (
                  <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9eb1c8', fontSize: '0.82rem' }}>
                    {localizeText(language, USAGE_UI.loading)}
                  </div>
                ) : (
                  <div
                    className="api-usage-bars"
                    style={{ gridTemplateColumns: `repeat(${chartData.length}, minmax(4px, 1fr))` }}
                  >
                    {chartData.map((day) => {
                      // Stacked bars: แต่ละวันแสดง 3 segments ซ้อนกัน
                      const totalHeight = ALL_PLATFORMS
                        .filter((p) => visiblePlatforms.has(p))
                        .reduce((s, p) => s + day[p], 0);

                      if (totalHeight === 0) {
                        return (
                          <div
                            key={day.date}
                            style={{ width: '100%', height: '2px', alignSelf: 'end', borderRadius: '2px', background: 'rgba(148,163,184,0.3)' }}
                            title={day.date}
                          />
                        );
                      }

                      const barHeight = Math.min(100, Math.max(8, (totalHeight / chartMax) * 100));

                      return (
                        <div
                          key={day.date}
                          style={{
                            width: '100%',
                            height: `${barHeight}%`,
                            maxHeight: '100%',
                            alignSelf: 'flex-end',
                            display: 'flex',
                            flexDirection: 'column-reverse',
                            borderRadius: '3px 3px 0 0',
                            overflow: 'hidden'
                          }}
                          title={`${day.date}: IDE $${day.IDE.toFixed(4)} | CLI $${day.CLI.toFixed(4)} | PyGrassReal $${day.PYGRASSREAL.toFixed(4)}`}
                        >
                          {ALL_PLATFORMS.map((p) => {
                            if (!visiblePlatforms.has(p) || day[p] === 0) return null;
                            const segPercent = (day[p] / totalHeight) * 100;
                            return (
                              <span
                                key={p}
                                style={{
                                  display: 'block',
                                  height: `${segPercent}%`,
                                  minHeight: '2px',
                                  background: PLATFORM_CONFIG[p].color,
                                }}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="api-usage-axis">
                  <span>{axisStart}</span>
                  <span>{axisEnd}</span>
                </div>
              </div>

              {/* Legend — คลิก toggle */}
              <div style={{ display: 'inline-flex', gap: '12px', alignSelf: 'center', flexWrap: 'wrap' }}>
                {ALL_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      color: visiblePlatforms.has(p) ? '#f6f8ff' : '#6b7e99',
                      fontSize: '0.88rem',
                      opacity: visiblePlatforms.has(p) ? 1 : 0.55,
                      transition: 'opacity 0.2s ease',
                    }}
                    title={visiblePlatforms.has(p) ? 'คลิกเพื่อซ่อน' : 'คลิกเพื่อแสดง'}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '1px',
                        background: PLATFORM_CONFIG[p].color,
                        display: 'inline-block',
                      }}
                    />
                    {PLATFORM_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Credits Usage History ── */}
          <section className="api-usage-section">
            <div className="api-usage-section-head">
              <h3 className="api-usage-title with-icon">
                {localizeText(language, USAGE_UI.usageHistoryTitle)}
                <Info size={14} />
              </h3>
              <button
                type="button"
                className="api-usage-reset-btn"
                onClick={() => void handleResetHistory()}
                disabled={isResettingHistory || historyLoading || historyTotal === 0}
                aria-label={localizeText(language, USAGE_UI.resetHistory)}
              >
                <RefreshCw size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="api-usage-history-card">
              <table className="api-usage-history-table">
                <thead>
                  <tr>
                    <th>{localizeText(language, USAGE_UI.tableDate)}</th>
                    <th>{localizeText(language, USAGE_UI.tablePlatform)}</th>
                    <th>{localizeText(language, USAGE_UI.tableModel)}</th>
                    <th>{localizeText(language, USAGE_UI.tableTokens)}</th>
                    <th>{localizeText(language, USAGE_UI.tableCost)}</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan={5} className="api-usage-history-empty">
                        {localizeText(language, USAGE_UI.loading)}
                      </td>
                    </tr>
                  ) : historyItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="api-usage-history-empty">
                        {localizeText(language, USAGE_UI.noCreditUsage)}
                      </td>
                    </tr>
                  ) : (
                    historyItems.map((item) => {
                      const cfg = PLATFORM_CONFIG[item.platform];
                      return (
                        <tr key={item.id}>
                          <td>
                            {new Date(item.created_at).toLocaleDateString(
                              language === 'th' ? 'th-TH' : 'en-US',
                              { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: cfg.color,
                              }}
                            >
                              <span
                                style={{
                                  width: '6px', height: '6px',
                                  borderRadius: '1px',
                                  background: cfg.color,
                                  display: 'inline-block',
                                }}
                              />
                              {cfg.label}
                            </span>
                          </td>
                          <td style={{ color: '#9eb1c8', fontSize: '0.78rem' }}>
                            {item.model ?? '-'}
                          </td>
                          <td>{item.total_tokens.toLocaleString()}</td>
                          <td style={{ color: '#86efac' }}>
                            {item.cost > 0 ? `$${item.cost.toFixed(7)}` : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <div className="api-usage-history-footer">
                <span>
                  {historyTotal === 0
                    ? '0 รายการ'
                    : `${((historyPage - 1) * HISTORY_PER_PAGE) + 1}–${Math.min(historyPage * HISTORY_PER_PAGE, historyTotal)} จาก ${historyTotal} รายการ`}
                </span>
                <div className="api-usage-history-pagination">
                  <button
                    type="button"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage(historyPage - 1)}
                  >
                    {localizeText(language, USAGE_UI.previous)}
                  </button>
                  <button
                    type="button"
                    disabled={historyPage >= totalPages}
                    onClick={() => setHistoryPage(historyPage + 1)}
                  >
                    {localizeText(language, USAGE_UI.next)}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
