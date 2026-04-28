import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Hourglass,
  PlusCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { localizeText, useLanguage } from '../i18n/language';
import { usePlatformAnalytics } from './hooks/usePlatformAnalytics';
import { usePlatformSubscribers } from './hooks/usePlatformSubscribers';
import {
  OPENROUTER_COST_RATE,
  PLATFORM_REVENUE_RATE,
  createStripeTestPayment,
  fetchCreditWalletByEmail,
  type PlatformAnalyticsHourlyRow,
} from './services/platformAnalytics.api';
import './PlatformRevenuePage.css';

const REVENUE_UI = {
  title: { th: 'ตารางรายได้แพลตฟอร์ม', en: 'Platform Revenue Table' },
  subtitle: {
    th: 'ดูยอดรายรับ ผู้สมัคร และผู้สมัครที่จ่ายเงิน โดยอัปเดตอัตโนมัติทุก 1 ชั่วโมง',
    en: 'Track revenue, signups, and paying users with an automatic hourly refresh.',
  },
  refresh: { th: 'รีเฟรชข้อมูล', en: 'Refresh data' },
  loading: { th: 'กำลังโหลดข้อมูลรายได้...', en: 'Loading revenue data...' },
  retry: { th: 'ลองใหม่', en: 'Retry' },
  autoRefresh: { th: 'อัปเดตอัตโนมัติทุก 1 ชั่วโมง', en: 'Auto-refreshes every 1 hour' },
  latestSnapshot: { th: 'ข้อมูลล่าสุด', en: 'Latest snapshot' },
  summary: {
    totalRevenue: { th: 'รายได้รวมทั้งหมด', en: 'Total revenue' },
    revenueWindow: { th: 'รายได้ 24 ชั่วโมงล่าสุด', en: 'Revenue last 24h' },
    signups: { th: 'ผู้สมัครทั้งหมด', en: 'Total signups' },
    paidUsers: { th: 'ผู้สมัครที่จ่ายเงิน', en: 'Paying users' },
    activeSubscribers: { th: 'ผู้จ่ายเงินที่ยัง active', en: 'Active paid subscribers' },
    conversionRate: { th: 'อัตราแปลงเป็นผู้จ่ายเงิน', en: 'Paid conversion rate' },
    openRouterReserve: { th: 'กันไว้จ่าย OpenRouter 70%', en: 'OpenRouter 70% reserve' },
    platformNet: { th: 'รายได้จริงของแพลตฟอร์ม 30%', en: 'Platform net revenue 30%' },
    unpaidOpenRouter: { th: 'ยอด OpenRouter ที่ยังไม่จ่าย', en: 'Unpaid OpenRouter due' },
  },
  labels: {
    usdRecognized: { th: 'นับเฉพาะรายการ USD ที่รับรู้ได้', en: 'Recognized USD transactions only' },
    window: { th: 'รอบข้อมูล 24 ชั่วโมง', en: '24-hour window' },
    users: { th: 'บัญชี', en: 'accounts' },
    subscribers: { th: 'สมาชิก', en: 'subscribers' },
    paidTransactions: { th: 'รายการจ่ายเงิน', en: 'paid transactions' },
    noPlanData: { th: 'ยังไม่มีผู้สมัครแพ็กเกจแบบจ่ายเงิน', en: 'No active paid plan subscribers yet' },
    nonUsdWarning: {
      th: 'มีรายการ subscription ที่ไม่ใช่ USD ซึ่งยังไม่รวมในยอดรายได้ USD ด้านบน',
      en: 'Some non-USD subscription transactions are not included in the USD revenue totals above.',
    },
    fallbackWarning: {
      th: 'กำลังแสดงรายการจ่ายเงินที่บัญชีนี้มีสิทธิ์อ่านได้ก่อน หากต้องการยอดรายรับทั้งแพลตฟอร์มให้ deploy Edge Function และ migration ที่เพิ่มไว้',
      en: 'Showing payment rows readable by this account. Deploy the added Edge Function and migration for full platform-wide revenue.',
    },
  },
  planBreakdown: { th: 'ผู้จ่ายเงินแยกตามแพ็กเกจปัจจุบัน', en: 'Current paid subscribers by plan' },
  revenueChartTitle: { th: 'กราฟรายรับของแพลตฟอร์ม', en: 'Platform revenue chart' },
  revenueChartSubtitle: {
    th: 'กราฟนี้ใช้รายการจ่ายเงินจริงจากตารางลูกค้า แยกยอดต่อชั่วโมงเป็น 70% สำหรับ OpenRouter และ 30% รายได้จริงของแพลตฟอร์ม',
    en: 'This chart uses real customer payments from the table and groups them hourly into the 70% OpenRouter reserve and the 30% platform net revenue.',
  },
  noChartData: { th: 'ยังไม่มีรายรับสำหรับแสดงกราฟ', en: 'No revenue available for the chart yet' },
  stripeTest: {
    open: { th: 'เปิดตัวทดสอบ Stripe', en: 'Open Stripe tester' },
    close: { th: 'ซ่อนตัวทดสอบ Stripe', en: 'Hide Stripe tester' },
    title: { th: 'ตารางทดสอบจ่ายเงิน Stripe', en: 'Stripe payment test board' },
    subtitle: {
      th: 'สร้างรายการจ่ายเงินปลอมหลายอีเมลเพื่อดูว่ากราฟ รายรับ 30% และยอด OpenRouter 70% แสดงผลถูกต้องหรือไม่ ข้อมูลนี้เก็บในเครื่องนี้เท่านั้นและไม่ตัดเงินจริง',
      en: 'Create fake payment rows for multiple emails to verify the chart, 30% platform revenue, and 70% OpenRouter reserve. This stays on this browser and never charges real money.',
    },
    addSlot: { th: 'เพิ่มช่องอีเมล', en: 'Add email slot' },
    removeSlot: { th: 'ลบช่องนี้', en: 'Remove slot' },
    clear: { th: 'ล้างรายการทดสอบ', en: 'Clear test payments' },
    email: { th: 'อีเมลลูกค้าทดสอบ', en: 'Test customer email' },
    amount: { th: 'ยอดจ่าย USD', en: 'USD amount' },
    balance: { th: 'เครดิตคงเหลือ', en: 'Current credits' },
    balanceLoading: { th: 'กำลังโหลดเครดิต...', en: 'Loading credits...' },
    balanceUnavailable: { th: 'ไม่พบยอดเครดิต', en: 'Credits unavailable' },
    pay: { th: 'จ่ายปลอมผ่าน Stripe TEST', en: 'Pay with Stripe TEST' },
    note: { th: 'โหมดนี้ใช้ fake Stripe session id เช่น cs_test_local และ pi_test_local เพื่อทดสอบหน้ารายรับเท่านั้น', en: 'This mode uses fake Stripe session ids such as cs_test_local and pi_test_local for revenue dashboard testing only.' },
    count: { th: 'รายการทดสอบในเครื่อง', en: 'Local test payments' },
    created: { th: 'สร้างรายการทดสอบแล้ว', en: 'Created test payment' },
    noSlots: { th: 'ยังไม่มีช่องอีเมล กดเพิ่มช่องอีเมลเพื่อเริ่มทดสอบ', en: 'No email slots yet. Add an email slot to start testing.' },
  },
  subscribersAdmin: {
    open: { th: 'จัดการผู้สมัคร', en: 'Manage subscribers' },
    close: { th: 'ซ่อนผู้สมัคร', en: 'Hide subscribers' },
    title: { th: 'ผู้สมัครสมาชิกจาก Supabase', en: 'Supabase subscribers' },
    subtitle: {
      th: 'เพิ่มอีเมลผู้สมัครเข้า Supabase Auth และ profiles แล้วดูรายชื่อจาก Supabase โดยตรง ปุ่มลบจะลบ auth user และ profile ตามไปด้วย',
      en: 'Create subscriber emails in Supabase Auth and profiles, then list them directly from Supabase. Delete removes both auth user and profile.',
    },
    email: { th: 'อีเมลผู้สมัคร', en: 'Subscriber email' },
    displayName: { th: 'ชื่อแสดงผล', en: 'Display name' },
    password: { th: 'รหัสผ่านเริ่มต้น', en: 'Initial password' },
    passwordHint: { th: 'เว้นว่างได้ ระบบจะสร้างรหัสผ่านชั่วคราวให้', en: 'Optional. Leave blank to generate a temporary password.' },
    create: { th: 'สมัครสมาชิกเข้า Supabase', en: 'Create Supabase subscriber' },
    refresh: { th: 'รีเฟรชรายชื่อ', en: 'Refresh subscribers' },
    delete: { th: 'ลบอีเมลนี้', en: 'Delete email' },
    tableEmail: { th: 'อีเมล', en: 'Email' },
    tableName: { th: 'ชื่อ', en: 'Name' },
    tableStatus: { th: 'สถานะ', en: 'Status' },
    tablePlan: { th: 'แพ็กเกจ', en: 'Plan' },
    tableCreated: { th: 'วันที่สมัคร', en: 'Created' },
    tableAction: { th: 'จัดการ', en: 'Action' },
    noRows: { th: 'ยังไม่มีผู้สมัครใน Supabase', en: 'No Supabase subscribers yet' },
    created: { th: 'สมัครสมาชิกสำเร็จ', en: 'Subscriber created' },
    existing: { th: 'อีเมลนี้มีอยู่แล้ว อัปเดต profile ให้แล้ว', en: 'Email already existed. Profile was updated.' },
    temporaryPassword: { th: 'รหัสผ่านชั่วคราว', en: 'Temporary password' },
  },
  paymentsTitle: { th: 'รายการจ่ายเงินจากลูกค้า', en: 'Customer payment revenue' },
  paymentsSubtitle: {
    th: 'ตารางนี้คือเงินที่ลูกค้าจ่ายเข้าระบบ เช่น subscription และการเติมเครดิต',
    en: 'This table lists money customers paid into the platform, including subscriptions and credit top-ups.',
  },
  noPayments: { th: 'ยังไม่มีรายการจ่ายเงินจากลูกค้า', en: 'No customer payments yet' },
  sourceLabels: {
    subscription: { th: 'Subscription', en: 'Subscription' },
    creditTopup: { th: 'เติมเครดิต', en: 'Credit top-up' },
  },
  hourlyTitle: { th: 'ตารางรายชั่วโมงล่าสุด', en: 'Latest hourly table' },
  hourlySubtitle: {
    th: 'แต่ละแถวรวม 24 ชั่วโมงล่าสุดและชั่วโมงที่มีรายการจ่ายจริงจากลูกค้า โดยสถานะ OpenRouter ต้องกดเปลี่ยนเองเท่านั้น',
    en: 'Rows include the latest 24 hours and real customer payment hours. OpenRouter payment status is changed manually only.',
  },
  table: {
    hour: { th: 'ชั่วโมง', en: 'Hour' },
    revenue: { th: 'รายได้', en: 'Revenue' },
    customerPaid: { th: 'ลูกค้าจ่ายในชม.', en: 'Customer paid' },
    openRouter70: { th: 'OpenRouter 70%', en: 'OpenRouter 70%' },
    platform30: { th: 'รายได้จริง 30%', en: 'Platform 30%' },
    openRouterStatus: { th: 'สถานะจ่าย OpenRouter', en: 'OpenRouter status' },
    settlementAction: { th: 'จัดการสถานะ', en: 'Status action' },
    signups: { th: 'ผู้สมัครใหม่', en: 'New signups' },
    paidUsers: { th: 'ผู้จ่ายเงินใหม่', en: 'New paid users' },
    paidTx: { th: 'รายการจ่ายเงิน', en: 'Paid tx' },
    cumulativeSignups: { th: 'ผู้สมัครสะสม', en: 'Cumulative signups' },
    cumulativePaid: { th: 'ผู้จ่ายเงินสะสม', en: 'Cumulative paid users' },
    paidAt: { th: 'วันที่จ่าย', en: 'Paid at' },
    source: { th: 'ประเภท', en: 'Type' },
    amount: { th: 'ยอดจ่าย', en: 'Amount' },
    detail: { th: 'รายละเอียด', en: 'Detail' },
    customer: { th: 'ลูกค้า', en: 'Customer' },
  },
  settlement: {
    paid: { th: 'จ่าย OpenRouter แล้ว', en: 'OpenRouter paid' },
    unpaid: { th: 'ยังไม่จ่าย OpenRouter', en: 'OpenRouter unpaid' },
    notRequired: { th: 'ไม่มีรายรับ ไม่ต้องจ่าย', en: 'No revenue, no payment needed' },
    markPaid: { th: 'ทำเครื่องหมายว่าจ่ายแล้ว', en: 'Mark paid' },
    markUnpaid: { th: 'กลับเป็นยังไม่จ่าย', en: 'Mark unpaid' },
  },
};

const toNumber = (value: number | string | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMoney = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Number(value.toFixed(2));
};

const formatCurrency = (value: number | string, locale: string): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(toNumber(value));
};

const formatNumber = (value: number | string, locale: string): string => {
  return new Intl.NumberFormat(locale).format(toNumber(value));
};

const formatPercent = (value: number, locale: string): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
};

const formatDateTime = (value: string, locale: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatChartHour = (value: string, locale: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const toChartBucketStart = (value: string): string | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setMinutes(0, 0, 0);
  return date.toISOString();
};

const truncateId = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
};

const sumHourlyValue = (
  rows: PlatformAnalyticsHourlyRow[],
  getValue: (row: PlatformAnalyticsHourlyRow) => number,
  predicate?: (row: PlatformAnalyticsHourlyRow) => boolean
): number => {
  return rows.reduce((sum, row) => {
    if (predicate && !predicate(row)) {
      return sum;
    }

    return sum + toNumber(getValue(row));
  }, 0);
};

const isPaidSubscriber = (subscriber: { subscriptionStatus: string; subscriptionTier: string }): boolean => {
  return subscriber.subscriptionStatus === 'active' && subscriber.subscriptionTier !== 'free';
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
}) => (
  <article className="platform-revenue-card">
    <div className="platform-revenue-card-icon">
      <Icon size={22} />
    </div>
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  </article>
);

interface StripeTestSlot {
  id: string;
  email: string;
  amountUsd: string;
}

interface StripeTestCreditState {
  email: string;
  balanceUsd: number | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_STRIPE_TEST_AMOUNT_USD = '5.00';
const DEFAULT_STRIPE_TEST_SLOT_COUNT = 3;
const LEGACY_STRIPE_TEST_EMAILS = ['test01@gmail.com', 'test02@gmail.com', 'admin@example.com'];
const STRIPE_TEST_FOLLOW_UP_REFRESH_MS = 1200;
const STRIPE_TEST_SECOND_FOLLOW_UP_REFRESH_MS = 3200;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeTestEmail = (value: string | null | undefined): string => (
  (value ?? '').trim().toLowerCase()
);

const createStripeTestSlotFromEmail = (email: string, index: number, amountUsd = DEFAULT_STRIPE_TEST_AMOUNT_USD): StripeTestSlot => ({
  id: `subscriber-slot-${index + 1}-${email}`,
  email,
  amountUsd,
});

export const PlatformRevenuePage: React.FC = () => {
  const { language } = useLanguage();
  const locale = language === 'th' ? 'th-TH' : 'en-US';
  const [showStripeTestBoard, setShowStripeTestBoard] = useState(false);
  const [showSubscribersBoard, setShowSubscribersBoard] = useState(false);
  const [stripeTestSlots, setStripeTestSlots] = useState<StripeTestSlot[]>([]);
  const stripeTestSlotsRef = useRef<StripeTestSlot[]>([]);
  const [stripeTestEmailDrafts, setStripeTestEmailDrafts] = useState<Record<string, string>>({});
  const [stripeTestCreditBySlot, setStripeTestCreditBySlot] = useState<Record<string, StripeTestCreditState>>({});
  const [stripeTestMessage, setStripeTestMessage] = useState<string | null>(null);
  const [stripeTestError, setStripeTestError] = useState<string | null>(null);
  const [stripeTestPendingSlotId, setStripeTestPendingSlotId] = useState<string | null>(null);
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [subscriberDisplayName, setSubscriberDisplayName] = useState('');
  const [subscriberPassword, setSubscriberPassword] = useState('');
  const [subscriberMessage, setSubscriberMessage] = useState<string | null>(null);
  const [copiedSubscriberEmail, setCopiedSubscriberEmail] = useState<string | null>(null);
  const {
    snapshot,
    loading,
    refreshing,
    settlementUpdatingBucket,
    error,
    refetch,
    setOpenRouterSettlementStatus,
  } = usePlatformAnalytics(24);
  const {
    subscribers,
    loading: subscribersLoading,
    saving: subscriberSaving,
    deletingId: subscriberDeletingId,
    error: subscriberError,
    refetch: refetchSubscribers,
    createSubscriber,
    removeSubscriber,
  } = usePlatformSubscribers(true);
  const subscriberTestEmails = useMemo(() => {
    const seen = new Set<string>();
    const emails: string[] = [];

    for (const subscriber of subscribers) {
      const email = normalizeTestEmail(subscriber.email);
      if (!email || seen.has(email)) {
        continue;
      }

      seen.add(email);
      emails.push(email);
    }

    return emails;
  }, [subscribers]);

  useEffect(() => {
    stripeTestSlotsRef.current = stripeTestSlots;
  }, [stripeTestSlots]);

  useEffect(() => {
    setStripeTestEmailDrafts((current) => {
      const next: Record<string, string> = {};
      for (const slot of stripeTestSlots) {
        next[slot.id] = current[slot.id] ?? slot.email;
      }
      return next;
    });
  }, [stripeTestSlots]);

  useEffect(() => {
    setStripeTestCreditBySlot((current) => {
      const next: Record<string, StripeTestCreditState> = {};
      for (const slot of stripeTestSlots) {
        if (current[slot.id]) {
          next[slot.id] = current[slot.id];
        }
      }
      return next;
    });
  }, [stripeTestSlots]);

  useEffect(() => {
    if (subscriberTestEmails.length === 0) {
      return;
    }

    setStripeTestSlots((current) => {
      const currentEmails = current.map((slot) => normalizeTestEmail(slot.email));
      const isLegacyDefault =
        currentEmails.length === LEGACY_STRIPE_TEST_EMAILS.length &&
        currentEmails.every((email, index) => email === LEGACY_STRIPE_TEST_EMAILS[index]);

      // ถ้า slot ปัจจุบันมีอีเมลครบแล้ว (ตรงกับ subscriberTestEmails) ไม่ต้อง reset
      // ป้องกัน amountUsd ที่ user กรอกเองถูก reset ทับด้วย DEFAULT
      const subscriberEmailSet = new Set(subscriberTestEmails);
      const allSlotsMatchSubscribers = current.length > 0 && currentEmails.every((email) => subscriberEmailSet.has(email));

      const shouldResetToSubscriberDefaults =
        current.length === 0 ||
        isLegacyDefault;

      // ถ้า slot ปัจจุบันตรงกับ subscriber emails อยู่แล้ว ให้คืน current เลย (ไม่ reset amountUsd)
      if (!shouldResetToSubscriberDefaults && allSlotsMatchSubscribers) {
        stripeTestSlotsRef.current = current;
        return current;
      }

      const defaultEmails = subscriberTestEmails.slice(0, DEFAULT_STRIPE_TEST_SLOT_COUNT);
      const subscriberSlots = defaultEmails.map((email, index) => {
        const existing = current.find((slot) => normalizeTestEmail(slot.email) === email);
        // ใช้ค่า amountUsd ที่มีอยู่ถ้า user เคยแก้ไข (ไม่ fallback กลับ DEFAULT เมื่อมีค่าอยู่แล้ว)
        return createStripeTestSlotFromEmail(email, index, existing?.amountUsd ?? DEFAULT_STRIPE_TEST_AMOUNT_USD);
      });

      stripeTestSlotsRef.current = subscriberSlots;
      return subscriberSlots;
    });
  }, [subscriberTestEmails]);

  const hourlyRows = useMemo(() => {
    return [...(snapshot?.hourly ?? [])].sort(
      (a, b) => Date.parse(b.bucketStart) - Date.parse(a.bucketStart)
    );
  }, [snapshot?.hourly]);
  const chartRows = useMemo(() => {
    const paymentBuckets = new Map<string, { bucketStart: string; customerPaid: number; paidTransactions: number }>();

    for (const payment of snapshot?.recentPayments ?? []) {
      if (payment.currencyCode !== 'USD') {
        continue;
      }

      const amountUsd = toNumber(payment.amountUsd);
      const bucketStart = toChartBucketStart(payment.paidAt);
      if (!bucketStart || amountUsd <= 0) {
        continue;
      }

      const current = paymentBuckets.get(bucketStart) ?? {
        bucketStart,
        customerPaid: 0,
        paidTransactions: 0,
      };

      current.customerPaid = toMoney(current.customerPaid + amountUsd);
      current.paidTransactions += 1;
      paymentBuckets.set(bucketStart, current);
    }

    const paymentRows = Array.from(paymentBuckets.values()).sort(
      (a, b) => Date.parse(a.bucketStart) - Date.parse(b.bucketStart)
    );
    const sourceRows =
      paymentRows.length > 0
        ? paymentRows
        : [...(snapshot?.hourly ?? [])]
            .sort((a, b) => Date.parse(a.bucketStart) - Date.parse(b.bucketStart))
            .map((row) => ({
              bucketStart: row.bucketStart,
              customerPaid: toNumber(row.customerPaidUsd),
              paidTransactions: toNumber(row.paidTransactions),
            }));

    return sourceRows
      .sort((a, b) => Date.parse(a.bucketStart) - Date.parse(b.bucketStart))
      .map((row) => ({
        hour: formatChartHour(row.bucketStart, locale),
        customerPaid: toMoney(row.customerPaid),
        openRouter70: toMoney(row.customerPaid * OPENROUTER_COST_RATE),
        platform30: toMoney(row.customerPaid * PLATFORM_REVENUE_RATE),
        paidTransactions: row.paidTransactions,
      }));
  }, [snapshot?.hourly, snapshot?.recentPayments, locale]);
  const hasChartRevenue = chartRows.some((row) => row.customerPaid > 0);
  const subscriberSummary = useMemo(() => {
    const now = Date.now();
    const windowStart = now - 24 * 60 * 60 * 1000;
    const planMap = new Map<string, number>();
    let signupsLastWindow = 0;
    let paidSubscribers = 0;

    for (const subscriber of subscribers) {
      const createdAtMs = Date.parse(subscriber.createdAt ?? '');
      if (Number.isFinite(createdAtMs) && createdAtMs >= windowStart && createdAtMs <= now) {
        signupsLastWindow += 1;
      }

      if (isPaidSubscriber(subscriber)) {
        paidSubscribers += 1;
        planMap.set(subscriber.subscriptionTier, (planMap.get(subscriber.subscriptionTier) ?? 0) + 1);
      }
    }

    return {
      totalSignups: subscribers.length,
      signupsLastWindow,
      paidSubscribers,
      planBreakdown: Array.from(planMap.entries()).map(([planId, activeSubscribers]) => ({
        planId,
        activeSubscribers,
      })),
    };
  }, [subscribers]);

  const updateStripeTestSlot = (slotId: string, patch: Partial<StripeTestSlot>) => {
    const next = stripeTestSlotsRef.current.map((slot) => (
      slot.id === slotId ? { ...slot, ...patch } : slot
    ));
    stripeTestSlotsRef.current = next;
    setStripeTestSlots(next);
  };

  const addStripeTestSlot = () => {
    setStripeTestSlots((current) => {
      const next = [
        ...current,
        createStripeTestSlotFromEmail(
          subscriberTestEmails.find((email) => !current.some((slot) => normalizeTestEmail(slot.email) === email)) ??
            `test${String(current.length + 1).padStart(2, '0')}@gmail.com`,
          current.length
        ),
      ];
      stripeTestSlotsRef.current = next;
      return next;
    });
  };

  const removeStripeTestSlot = (slotId: string) => {
    setStripeTestSlots((current) => {
      const next = current.filter((slot) => slot.id !== slotId);
      stripeTestSlotsRef.current = next;
      return next;
    });
  };

  const loadStripeTestCreditBalance = useCallback(async (slotId: string, emailValue: string) => {
    const email = normalizeTestEmail(emailValue);
    if (!EMAIL_PATTERN.test(email)) {
      setStripeTestCreditBySlot((current) => ({
        ...current,
        [slotId]: {
          email,
          balanceUsd: null,
          loading: false,
          error: language === 'th' ? 'อีเมลไม่ถูกต้อง' : 'Invalid email',
        },
      }));
      return;
    }

    setStripeTestCreditBySlot((current) => ({
      ...current,
      [slotId]: {
        email,
        balanceUsd: current[slotId]?.balanceUsd ?? null,
        loading: true,
        error: null,
      },
    }));

    try {
      const wallet = await fetchCreditWalletByEmail(email);
      const balanceUsd = toMoney(toNumber(wallet.balanceUsdMicros) / 1_000_000);
      setStripeTestCreditBySlot((current) => ({
        ...current,
        [slotId]: {
          email: normalizeTestEmail(wallet.email || email),
          balanceUsd,
          loading: false,
          error: null,
        },
      }));
    } catch (err) {
      setStripeTestCreditBySlot((current) => ({
        ...current,
        [slotId]: {
          email,
          balanceUsd: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Unable to load credit balance.',
        },
      }));
    }
  }, [language]);

  useEffect(() => {
    for (const slot of stripeTestSlots) {
      const normalizedEmail = normalizeTestEmail(slot.email);
      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        continue;
      }

      const current = stripeTestCreditBySlot[slot.id];
      const shouldLoad = !current || (!current.loading && current.email !== normalizedEmail);
      if (shouldLoad) {
        void loadStripeTestCreditBalance(slot.id, normalizedEmail);
      }
    }
  }, [stripeTestSlots, stripeTestCreditBySlot, loadStripeTestCreditBalance]);

  const createSlotTestPayment = async (slotId: string) => {
    if (stripeTestPendingSlotId) {
      return;
    }

    const latestSlot = stripeTestSlotsRef.current.find((item) => item.id === slotId);
    if (!latestSlot) {
      setStripeTestError(
        language === 'th'
          ? 'ไม่พบช่องทดสอบนี้แล้ว กรุณารีเฟรชข้อมูลแล้วลองใหม่'
          : 'Selected test slot was not found. Please refresh and try again.'
      );
      return;
    }

    const latestDraftEmail = normalizeTestEmail(stripeTestEmailDrafts[slotId] ?? latestSlot.email);
    if (!EMAIL_PATTERN.test(latestDraftEmail)) {
      setStripeTestMessage(null);
      setStripeTestError(
        language === 'th'
          ? 'กรุณากรอกอีเมลให้ถูกต้องก่อนกดจ่าย'
          : 'Please enter a valid email before paying.'
      );
      return;
    }

    if (latestDraftEmail !== normalizeTestEmail(latestSlot.email)) {
      updateStripeTestSlot(slotId, { email: latestDraftEmail });
      setStripeTestEmailDrafts((current) => ({
        ...current,
        [slotId]: latestDraftEmail,
      }));
    }

    setStripeTestPendingSlotId(slotId);
    try {
      const requestedAmountUsd = toMoney(toNumber(latestSlot.amountUsd));
      const requestedEmail = latestDraftEmail;
      const payment = await createStripeTestPayment({
        email: requestedEmail,
        amountUsd: requestedAmountUsd,
        source: 'credit_topup',
      });
      const customerLabel = payment.customerId ?? requestedEmail;
      const resolvedEmail = normalizeTestEmail(customerLabel);
      const hasEmailMismatch = resolvedEmail !== requestedEmail;

      setStripeTestSlots((current) => {
        const next = current.map((item) => (
          item.id === slotId
            ? {
                ...item,
                amountUsd: toMoney(payment.amountUsd).toFixed(2),
                email: customerLabel,
              }
            : item
        ));
        stripeTestSlotsRef.current = next;
        return next;
      });
      setStripeTestError(null);
      setStripeTestMessage(
        hasEmailMismatch
          ? language === 'th'
            ? `${localizeText(language, REVENUE_UI.stripeTest.created)}: กรอก ${requestedEmail} แต่ระบบบันทึกเป็น ${customerLabel} ${formatCurrency(payment.amountUsd, locale)}`
            : `${localizeText(language, REVENUE_UI.stripeTest.created)}: requested ${requestedEmail}, stored ${customerLabel} ${formatCurrency(payment.amountUsd, locale)}`
          : `${localizeText(language, REVENUE_UI.stripeTest.created)}: ${customerLabel} ${formatCurrency(payment.amountUsd, locale)}`
      );
      void loadStripeTestCreditBalance(slotId, customerLabel);
      await refetch();
      window.setTimeout(() => {
        void refetch();
      }, STRIPE_TEST_FOLLOW_UP_REFRESH_MS);
      window.setTimeout(() => {
        void refetch();
      }, STRIPE_TEST_SECOND_FOLLOW_UP_REFRESH_MS);
    } catch (err) {
      setStripeTestMessage(null);
      setStripeTestError(err instanceof Error ? err.message : 'Unable to create Stripe test payment.');
    } finally {
      setStripeTestPendingSlotId(null);
    }
  };

  const confirmStripeTestSlotEmail = (slotId: string) => {
    const draft = normalizeTestEmail(stripeTestEmailDrafts[slotId]);
    if (!EMAIL_PATTERN.test(draft)) {
      setStripeTestMessage(null);
      setStripeTestError(
        language === 'th'
          ? 'กรุณากรอกอีเมลให้ถูกต้องก่อนกด OK'
          : 'Please enter a valid email before clicking OK.'
      );
      return;
    }

    updateStripeTestSlot(slotId, { email: draft });
    setStripeTestEmailDrafts((current) => ({
      ...current,
      [slotId]: draft,
    }));
    setStripeTestError(null);
    setStripeTestMessage(
      language === 'th'
        ? `อัปเดตอีเมลแล้ว: ${draft}`
        : `Email updated: ${draft}`
    );
    void loadStripeTestCreditBalance(slotId, draft);
  };

  const handleCreateSubscriber = async () => {
    setSubscriberMessage(null);
    const result = await createSubscriber({
      email: subscriberEmail,
      displayName: subscriberDisplayName,
      password: subscriberPassword,
    });

    if (!result) {
      return;
    }

    setSubscriberEmail('');
    setSubscriberDisplayName('');
    setSubscriberPassword('');
    setSubscriberMessage(
      [
        localizeText(language, result.created ? REVENUE_UI.subscribersAdmin.created : REVENUE_UI.subscribersAdmin.existing),
        result.subscriber.email ?? '',
        result.temporaryPassword
          ? `${localizeText(language, REVENUE_UI.subscribersAdmin.temporaryPassword)}: ${result.temporaryPassword}`
          : '',
      ].filter(Boolean).join(' - ')
    );
    void refetch();
  };

  const handleDeleteSubscriber = async (subscriberId: string) => {
    const subscriber = subscribers.find((item) => item.id === subscriberId);
    if (!subscriber) {
      return;
    }

    setSubscriberMessage(null);
    const deleted = await removeSubscriber(subscriber);
    if (deleted) {
      void refetch();
    }
  };

  const handleCopySubscriberEmail = async (email: string | null | undefined) => {
    const value = email?.trim();
    if (!value) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedSubscriberEmail(value);
      setSubscriberMessage(`${language === 'th' ? 'คัดลอกอีเมลแล้ว' : 'Copied email'}: ${value}`);
      window.setTimeout(() => {
        setCopiedSubscriberEmail((current) => (current === value ? null : current));
      }, 1600);
    } catch {
      setSubscriberMessage(language === 'th' ? 'คัดลอกอีเมลไม่สำเร็จ' : 'Unable to copy email');
    }
  };

  const handleRefreshAll = async () => {
    await refetch();

    for (const slot of stripeTestSlotsRef.current) {
      const email = normalizeTestEmail(slot.email);
      if (!EMAIL_PATTERN.test(email)) {
        continue;
      }

      void loadStripeTestCreditBalance(slot.id, email);
    }
  };

  if (loading) {
    return (
      <div className="platform-revenue-page">
        <div className="platform-revenue-state">
          <RefreshCw className="platform-revenue-spin" size={28} />
          <span>{localizeText(language, REVENUE_UI.loading)}</span>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="platform-revenue-page">
        <section className="platform-revenue-state is-error">
          <AlertTriangle size={28} />
          <h1>{localizeText(language, REVENUE_UI.title)}</h1>
          <p>{error ?? 'Unable to load platform revenue.'}</p>
          <button type="button" className="dashboard-primary-button" onClick={() => void handleRefreshAll()}>
            <RefreshCw size={16} />
            {localizeText(language, REVENUE_UI.retry)}
          </button>
        </section>
      </div>
    );
  }

  const canUseSubscriberSummary = !subscriberError && (!subscribersLoading || subscribers.length > 0);
  const totals = canUseSubscriberSummary
    ? {
        ...snapshot.totals,
        totalSignups: subscriberSummary.totalSignups,
        signupsLastWindow: subscriberSummary.signupsLastWindow,
        totalPaidUsers: Math.max(toNumber(snapshot.totals.totalPaidUsers), subscriberSummary.paidSubscribers),
        activePaidSubscribers: subscriberSummary.paidSubscribers,
      }
    : snapshot.totals;
  const planBreakdown = canUseSubscriberSummary ? subscriberSummary.planBreakdown : snapshot.planBreakdown;
  const recentPayments = snapshot.recentPayments ?? [];
  const openRouterReserveWindow = toMoney(toNumber(totals.revenueLastWindowUsd) * OPENROUTER_COST_RATE);
  const platformNetWindow = toMoney(toNumber(totals.revenueLastWindowUsd) * PLATFORM_REVENUE_RATE);
  const unpaidOpenRouterWindow = sumHourlyValue(
    hourlyRows,
    (row) => row.openRouterCostUsd,
    (row) => row.openRouterStatus === 'unpaid'
  );
  const conversionRate =
    toNumber(totals.totalSignups) > 0 ? toNumber(totals.totalPaidUsers) / toNumber(totals.totalSignups) : 0;

  return (
    <div className="platform-revenue-page">
      <header className="platform-revenue-header">
        <div>
          <p className="platform-revenue-eyebrow">
            <BadgeDollarSign size={16} />
            Revenue analytics
          </p>
          <h1>{localizeText(language, REVENUE_UI.title)}</h1>
          <p>{localizeText(language, REVENUE_UI.subtitle)}</p>
        </div>
        <div className="platform-revenue-header-actions">
          <button
            type="button"
            className="platform-revenue-refresh"
            onClick={() => setShowSubscribersBoard((current) => !current)}
          >
            <UserPlus size={16} />
            {localizeText(language, showSubscribersBoard ? REVENUE_UI.subscribersAdmin.close : REVENUE_UI.subscribersAdmin.open)}
          </button>
          <button
            type="button"
            className="platform-revenue-refresh"
            onClick={() => setShowStripeTestBoard((current) => !current)}
          >
            <Sparkles size={16} />
            {localizeText(language, showStripeTestBoard ? REVENUE_UI.stripeTest.close : REVENUE_UI.stripeTest.open)}
          </button>
          <button
            type="button"
            className="platform-revenue-refresh"
            onClick={() => void handleRefreshAll()}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'platform-revenue-spin' : undefined} />
            {localizeText(language, REVENUE_UI.refresh)}
          </button>
        </div>
      </header>

      <div className="platform-revenue-meta">
        <span>
          <Clock3 size={15} />
          {localizeText(language, REVENUE_UI.autoRefresh)}
        </span>
        <span>
          {localizeText(language, REVENUE_UI.latestSnapshot)}: {formatDateTime(snapshot.generatedAt, locale)}
        </span>
      </div>

      {snapshot.isFallback ? (
        <div className="platform-revenue-warning">
          <AlertTriangle size={18} />
          <span>{localizeText(language, REVENUE_UI.labels.fallbackWarning)}</span>
        </div>
      ) : null}

      {toNumber(totals.nonUsdTransactionCount) > 0 ? (
        <div className="platform-revenue-warning">
          <AlertTriangle size={18} />
          <span>
            {localizeText(language, REVENUE_UI.labels.nonUsdWarning)} (
            {formatNumber(totals.nonUsdTransactionCount, locale)}).
          </span>
        </div>
      ) : null}

      {showSubscribersBoard ? (
        <section className="platform-revenue-panel platform-revenue-subscribers-panel">
          <div className="platform-revenue-panel-head">
            <div>
              <h2>{localizeText(language, REVENUE_UI.subscribersAdmin.title)}</h2>
              <p>{localizeText(language, REVENUE_UI.subscribersAdmin.subtitle)}</p>
            </div>
            <button
              type="button"
              className="platform-revenue-test-secondary"
              onClick={() => void refetchSubscribers()}
              disabled={subscribersLoading}
            >
              <RefreshCw size={15} className={subscribersLoading ? 'platform-revenue-spin' : undefined} />
              {localizeText(language, REVENUE_UI.subscribersAdmin.refresh)}
            </button>
          </div>

          <div className="platform-revenue-subscriber-form">
            <label>
              <span>{localizeText(language, REVENUE_UI.subscribersAdmin.email)}</span>
              <input
                value={subscriberEmail}
                onChange={(event) => setSubscriberEmail(event.target.value)}
                placeholder="customer@example.com"
                type="email"
                autoComplete="off"
                name="platform-subscriber-email"
              />
            </label>
            <label>
              <span>{localizeText(language, REVENUE_UI.subscribersAdmin.displayName)}</span>
              <input
                value={subscriberDisplayName}
                onChange={(event) => setSubscriberDisplayName(event.target.value)}
                placeholder="Test User"
                autoComplete="off"
                name="platform-subscriber-display-name"
              />
            </label>
            <label>
              <span>{localizeText(language, REVENUE_UI.subscribersAdmin.password)}</span>
              <input
                value={subscriberPassword}
                onChange={(event) => setSubscriberPassword(event.target.value)}
                placeholder={localizeText(language, REVENUE_UI.subscribersAdmin.passwordHint)}
                type="text"
                autoComplete="new-password"
                name="platform-subscriber-password"
              />
            </label>
            <button
              type="button"
              className="platform-revenue-test-pay"
              onClick={() => void handleCreateSubscriber()}
              disabled={subscriberSaving}
            >
              <UserPlus size={15} />
              {subscriberSaving ? localizeText(language, REVENUE_UI.loading) : localizeText(language, REVENUE_UI.subscribersAdmin.create)}
            </button>
          </div>

          {subscriberMessage ? <p className="platform-revenue-test-message">{subscriberMessage}</p> : null}
          {subscriberError ? <p className="platform-revenue-test-error">{subscriberError}</p> : null}

          <div className="platform-revenue-table-wrap">
            <table className="platform-revenue-table platform-revenue-subscribers-table">
              <thead>
                <tr>
                  <th>{localizeText(language, REVENUE_UI.subscribersAdmin.tableEmail)}</th>
                  <th>{localizeText(language, REVENUE_UI.subscribersAdmin.tableName)}</th>
                  <th>{localizeText(language, REVENUE_UI.subscribersAdmin.tableStatus)}</th>
                  <th>{localizeText(language, REVENUE_UI.subscribersAdmin.tablePlan)}</th>
                  <th>{localizeText(language, REVENUE_UI.subscribersAdmin.tableCreated)}</th>
                  <th>{localizeText(language, REVENUE_UI.subscribersAdmin.tableAction)}</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="platform-revenue-empty-row">
                      {subscribersLoading ? localizeText(language, REVENUE_UI.loading) : localizeText(language, REVENUE_UI.subscribersAdmin.noRows)}
                    </td>
                  </tr>
                ) : (
                  subscribers.map((subscriber) => (
                    <tr key={subscriber.id}>
                      <td>
                        <div className="platform-revenue-email-cell">
                          <span>{subscriber.email ?? '-'}</span>
                          {subscriber.email ? (
                            <button
                              type="button"
                              className="platform-revenue-copy-button"
                              onClick={() => void handleCopySubscriberEmail(subscriber.email)}
                              title={language === 'th' ? 'คัดลอกอีเมล' : 'Copy email'}
                              aria-label={language === 'th' ? `คัดลอกอีเมล ${subscriber.email}` : `Copy email ${subscriber.email}`}
                            >
                              {copiedSubscriberEmail === subscriber.email ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                              <span>{copiedSubscriberEmail === subscriber.email ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอก' : 'Copy')}</span>
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td>{subscriber.displayName ?? '-'}</td>
                      <td>{subscriber.subscriptionStatus}</td>
                      <td>{subscriber.subscriptionTier}</td>
                      <td>{subscriber.createdAt ? formatDateTime(subscriber.createdAt, locale) : '-'}</td>
                      <td>
                        <div className="platform-revenue-row-actions">
                          <button
                            type="button"
                            className="platform-revenue-test-danger"
                            onClick={() => void handleDeleteSubscriber(subscriber.id)}
                            disabled={subscriberDeletingId === subscriber.id}
                          >
                            <Trash2 size={15} />
                            {subscriberDeletingId === subscriber.id
                              ? localizeText(language, REVENUE_UI.loading)
                              : localizeText(language, REVENUE_UI.subscribersAdmin.delete)}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {showStripeTestBoard ? (
        <section className="platform-revenue-panel platform-revenue-test-panel">
          <div className="platform-revenue-panel-head">
            <div>
              <h2>{localizeText(language, REVENUE_UI.stripeTest.title)}</h2>
              <p>{localizeText(language, REVENUE_UI.stripeTest.subtitle)}</p>
            </div>
            <div className="platform-revenue-test-actions">
              <button type="button" className="platform-revenue-test-secondary" onClick={addStripeTestSlot}>
                <PlusCircle size={15} />
                {localizeText(language, REVENUE_UI.stripeTest.addSlot)}
              </button>
            </div>
          </div>

          <div className="platform-revenue-test-note">
            <AlertTriangle size={16} />
            <span>{localizeText(language, REVENUE_UI.stripeTest.note)}</span>
          </div>

          {stripeTestMessage ? <p className="platform-revenue-test-message">{stripeTestMessage}</p> : null}
          {stripeTestError ? <p className="platform-revenue-test-error">{stripeTestError}</p> : null}

          <div className="platform-revenue-test-grid">
            {stripeTestSlots.length === 0 ? (
              <div className="platform-revenue-test-empty">
                {localizeText(language, REVENUE_UI.stripeTest.noSlots)}
              </div>
            ) : null}
            {stripeTestSlots.map((slot) => {
              const amountUsd = toNumber(slot.amountUsd);
              const openRouterUsd = toMoney(amountUsd * OPENROUTER_COST_RATE);
              const platformUsd = toMoney(amountUsd * PLATFORM_REVENUE_RATE);
              const isPayingSlot = stripeTestPendingSlotId === slot.id;
              const creditState = stripeTestCreditBySlot[slot.id];
              const creditBalanceLabel = creditState?.loading
                ? localizeText(language, REVENUE_UI.stripeTest.balanceLoading)
                : creditState && creditState.balanceUsd !== null
                  ? formatCurrency(creditState.balanceUsd, locale)
                  : creditState?.error
                    ? localizeText(language, REVENUE_UI.stripeTest.balanceUnavailable)
                    : '-';

              return (
                <article key={slot.id} className="platform-revenue-test-card">
                  <div className="platform-revenue-test-card-head">
                    <strong>{slot.email || localizeText(language, REVENUE_UI.stripeTest.email)}</strong>
                    <button
                      type="button"
                      className="platform-revenue-test-remove"
                      onClick={() => removeStripeTestSlot(slot.id)}
                    >
                      <Trash2 size={14} />
                      {localizeText(language, REVENUE_UI.stripeTest.removeSlot)}
                    </button>
                  </div>
                  <label>
                    <span>{localizeText(language, REVENUE_UI.stripeTest.email)}</span>
                    <div className="platform-revenue-test-email-row">
                      <input
                        value={stripeTestEmailDrafts[slot.id] ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setStripeTestEmailDrafts((current) => ({
                            ...current,
                            [slot.id]: value,
                          }));
                        }}
                        placeholder="customer@example.com"
                      />
                      <button
                        type="button"
                        className="platform-revenue-test-secondary platform-revenue-test-email-ok"
                        onClick={() => confirmStripeTestSlotEmail(slot.id)}
                        disabled={stripeTestPendingSlotId !== null}
                      >
                        OK
                      </button>
                    </div>
                  </label>

                  <label>
                    <span>{localizeText(language, REVENUE_UI.stripeTest.amount)}</span>
                    <input
                      value={slot.amountUsd}
                      inputMode="decimal"
                      onChange={(event) => updateStripeTestSlot(slot.id, { amountUsd: event.target.value })}
                    />
                  </label>

                  <div className={`platform-revenue-test-credit${creditState?.error ? ' is-error' : ''}`}>
                    <span>{localizeText(language, REVENUE_UI.stripeTest.balance)}</span>
                    <strong>{creditBalanceLabel}</strong>
                  </div>
                  {creditState?.error ? (
                    <small className="platform-revenue-test-credit-error">{creditState.error}</small>
                  ) : null}

                  <div className="platform-revenue-test-split">
                    <span>OpenRouter 70% <strong>{formatCurrency(openRouterUsd, locale)}</strong></span>
                    <span>{localizeText(language, REVENUE_UI.table.platform30)} <strong>{formatCurrency(platformUsd, locale)}</strong></span>
                  </div>

                  <button
                    type="button"
                    className="platform-revenue-test-pay"
                    disabled={stripeTestPendingSlotId !== null}
                    onClick={() => void createSlotTestPayment(slot.id)}
                  >
                    <Sparkles size={15} className={isPayingSlot ? 'platform-revenue-spin' : undefined} />
                    {localizeText(language, REVENUE_UI.stripeTest.pay)}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="platform-revenue-grid" aria-label="Platform revenue summary">
        <SummaryCard
          icon={BadgeDollarSign}
          label={localizeText(language, REVENUE_UI.summary.totalRevenue)}
          value={formatCurrency(totals.totalRevenueUsd, locale)}
          detail={localizeText(language, REVENUE_UI.labels.usdRecognized)}
        />
        <SummaryCard
          icon={TrendingUp}
          label={localizeText(language, REVENUE_UI.summary.revenueWindow)}
          value={formatCurrency(totals.revenueLastWindowUsd, locale)}
          detail={`${formatNumber(totals.paidTransactionsLastWindow, locale)} ${localizeText(language, REVENUE_UI.labels.paidTransactions)}`}
        />
        <SummaryCard
          icon={Hourglass}
          label={localizeText(language, REVENUE_UI.summary.openRouterReserve)}
          value={formatCurrency(openRouterReserveWindow, locale)}
          detail={localizeText(language, REVENUE_UI.labels.window)}
        />
        <SummaryCard
          icon={CheckCircle2}
          label={localizeText(language, REVENUE_UI.summary.platformNet)}
          value={formatCurrency(platformNetWindow, locale)}
          detail={localizeText(language, REVENUE_UI.labels.window)}
        />
        <SummaryCard
          icon={AlertTriangle}
          label={localizeText(language, REVENUE_UI.summary.unpaidOpenRouter)}
          value={formatCurrency(unpaidOpenRouterWindow, locale)}
          detail={localizeText(language, REVENUE_UI.settlement.unpaid)}
        />
        <SummaryCard
          icon={Users}
          label={localizeText(language, REVENUE_UI.summary.signups)}
          value={formatNumber(totals.totalSignups, locale)}
          detail={`+${formatNumber(totals.signupsLastWindow, locale)} ${localizeText(language, REVENUE_UI.labels.window)}`}
        />
        <SummaryCard
          icon={UserCheck}
          label={localizeText(language, REVENUE_UI.summary.paidUsers)}
          value={formatNumber(totals.totalPaidUsers, locale)}
          detail={`+${formatNumber(totals.newPaidUsersLastWindow, locale)} ${localizeText(language, REVENUE_UI.labels.window)}`}
        />
        <SummaryCard
          icon={CreditCard}
          label={localizeText(language, REVENUE_UI.summary.activeSubscribers)}
          value={formatNumber(totals.activePaidSubscribers, locale)}
          detail={localizeText(language, REVENUE_UI.labels.subscribers)}
        />
        <SummaryCard
          icon={TrendingUp}
          label={localizeText(language, REVENUE_UI.summary.conversionRate)}
          value={formatPercent(conversionRate, locale)}
          detail={`${formatNumber(totals.totalPaidUsers, locale)} / ${formatNumber(totals.totalSignups, locale)} ${localizeText(language, REVENUE_UI.labels.users)}`}
        />
      </section>

      <section className="platform-revenue-panel platform-revenue-chart-panel">
        <div className="platform-revenue-panel-head">
          <div>
            <h2>{localizeText(language, REVENUE_UI.revenueChartTitle)}</h2>
            <p>{localizeText(language, REVENUE_UI.revenueChartSubtitle)}</p>
          </div>
        </div>
        {hasChartRevenue ? (
          <div className="platform-revenue-chart-wrap">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <LineChart data={chartRows} margin={{ top: 12, right: 18, left: 4, bottom: 8 }}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#9fb9d0', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.18)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9fb9d0', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${toNumber(value).toFixed(0)}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(14, 165, 233, 0.08)' }}
                  contentStyle={{
                    border: '1px solid rgba(125, 211, 252, 0.24)',
                    borderRadius: 14,
                    background: 'rgba(8, 13, 22, 0.96)',
                    color: '#e5f2ff',
                    boxShadow: '0 16px 34px rgba(2, 8, 23, 0.38)',
                  }}
                  labelStyle={{ color: '#bae6fd', fontWeight: 800 }}
                  formatter={(value) => formatCurrency(toNumber(Array.isArray(value) ? value[0] : value), locale)}
                />
                <Legend wrapperStyle={{ color: '#cfe7f7', fontSize: 13, paddingTop: 8 }} />
                <Line
                  dataKey="openRouter70"
                  name={localizeText(language, REVENUE_UI.table.openRouter70)}
                  type="monotone"
                  stroke="#fbbf24"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#fbbf24', stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  dataKey="platform30"
                  name={localizeText(language, REVENUE_UI.table.platform30)}
                  type="monotone"
                  stroke="#67e8f9"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#67e8f9', stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="platform-revenue-chart-empty">
            <TrendingUp size={24} />
            <span>{localizeText(language, REVENUE_UI.noChartData)}</span>
          </div>
        )}
      </section>

      <section className="platform-revenue-panel">
        <div className="platform-revenue-panel-head">
          <div>
            <h2>{localizeText(language, REVENUE_UI.paymentsTitle)}</h2>
            <p>{localizeText(language, REVENUE_UI.paymentsSubtitle)}</p>
          </div>
        </div>
        <div className="platform-revenue-table-wrap">
          <table className="platform-revenue-table platform-revenue-payments-table">
            <thead>
              <tr>
                <th>{localizeText(language, REVENUE_UI.table.paidAt)}</th>
                <th>{localizeText(language, REVENUE_UI.table.source)}</th>
                <th>{localizeText(language, REVENUE_UI.table.amount)}</th>
                <th>{localizeText(language, REVENUE_UI.table.detail)}</th>
                <th>{localizeText(language, REVENUE_UI.table.customer)}</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="platform-revenue-empty-row">
                    {localizeText(language, REVENUE_UI.noPayments)}
                  </td>
                </tr>
              ) : (
                recentPayments.map((payment) => {
                  const sourceLabel =
                    payment.source === 'subscription'
                      ? localizeText(language, REVENUE_UI.sourceLabels.subscription)
                      : localizeText(language, REVENUE_UI.sourceLabels.creditTopup);
                  const detail =
                    payment.planId
                      ? `${payment.planId}${payment.billingCycle ? ` / ${payment.billingCycle}` : ''}`
                      : payment.description || '-';
                  const amountLabel =
                    payment.currencyCode === 'USD'
                      ? formatCurrency(payment.amountUsd, locale)
                      : `${formatNumber(payment.amount, locale)} ${payment.currencyCode}`;

                  return (
                    <tr key={`${payment.source}-${payment.id}`}>
                      <td>{formatDateTime(payment.paidAt, locale)}</td>
                      <td>
                        <span className={`platform-revenue-source-badge is-${payment.source}`}>
                          {sourceLabel}
                        </span>
                      </td>
                      <td className="is-money">{amountLabel}</td>
                      <td>{detail}</td>
                      <td>{truncateId(payment.customerId)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="platform-revenue-panel">
        <div className="platform-revenue-panel-head">
          <h2>{localizeText(language, REVENUE_UI.planBreakdown)}</h2>
        </div>
        {planBreakdown.length > 0 ? (
          <div className="platform-revenue-plan-grid">
            {planBreakdown.map((plan) => (
              <div key={plan.planId} className="platform-revenue-plan-chip">
                <span>{plan.planId}</span>
                <strong>{formatNumber(plan.activeSubscribers, locale)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="platform-revenue-muted">{localizeText(language, REVENUE_UI.labels.noPlanData)}</p>
        )}
      </section>

      <section className="platform-revenue-panel">
        <div className="platform-revenue-panel-head">
          <div>
            <h2>{localizeText(language, REVENUE_UI.hourlyTitle)}</h2>
            <p>{localizeText(language, REVENUE_UI.hourlySubtitle)}</p>
          </div>
        </div>
        <div className="platform-revenue-table-wrap">
          <table className="platform-revenue-table">
            <thead>
              <tr>
                <th>{localizeText(language, REVENUE_UI.table.hour)}</th>
                <th>{localizeText(language, REVENUE_UI.table.customerPaid)}</th>
                <th>{localizeText(language, REVENUE_UI.table.openRouter70)}</th>
                <th>{localizeText(language, REVENUE_UI.table.platform30)}</th>
                <th>{localizeText(language, REVENUE_UI.table.openRouterStatus)}</th>
                <th>{localizeText(language, REVENUE_UI.table.settlementAction)}</th>
                <th>{localizeText(language, REVENUE_UI.table.signups)}</th>
                <th>{localizeText(language, REVENUE_UI.table.paidUsers)}</th>
                <th>{localizeText(language, REVENUE_UI.table.paidTx)}</th>
              </tr>
            </thead>
            <tbody>
              {hourlyRows.map((row) => {
                const statusLabel =
                  row.openRouterStatus === 'paid'
                    ? localizeText(language, REVENUE_UI.settlement.paid)
                    : row.openRouterStatus === 'unpaid'
                      ? localizeText(language, REVENUE_UI.settlement.unpaid)
                      : localizeText(language, REVENUE_UI.settlement.notRequired);
                const nextStatus = row.openRouterStatus === 'paid' ? 'unpaid' : 'paid';
                const actionLabel =
                  row.openRouterStatus === 'paid'
                    ? localizeText(language, REVENUE_UI.settlement.markUnpaid)
                    : localizeText(language, REVENUE_UI.settlement.markPaid);
                const isUpdating = settlementUpdatingBucket === row.bucketStart;

                return (
                  <tr key={row.bucketStart}>
                    <td>{formatDateTime(row.bucketStart, locale)}</td>
                    <td className="is-money">{formatCurrency(row.customerPaidUsd, locale)}</td>
                    <td className="is-openrouter-cost">{formatCurrency(row.openRouterCostUsd, locale)}</td>
                    <td className="is-platform-net">{formatCurrency(row.platformRevenueUsd, locale)}</td>
                    <td>
                      <span className={`platform-revenue-settlement-badge is-${row.openRouterStatus}`}>
                        {statusLabel}
                      </span>
                      {row.openRouterPaidAt ? (
                        <small className="platform-revenue-paid-at">
                          {formatDateTime(row.openRouterPaidAt, locale)}
                        </small>
                      ) : null}
                    </td>
                    <td>
                      {row.openRouterStatus === 'not_required' ? (
                        <span className="platform-revenue-action-fallback">-</span>
                      ) : (
                        <button
                          type="button"
                          className={`platform-revenue-settlement-btn ${row.openRouterStatus === 'paid' ? 'is-paid' : 'is-unpaid'}`}
                          disabled={isUpdating}
                          onClick={() => void setOpenRouterSettlementStatus(row, nextStatus)}
                        >
                          {isUpdating ? localizeText(language, REVENUE_UI.loading) : actionLabel}
                        </button>
                      )}
                    </td>
                    <td>{formatNumber(row.signups, locale)}</td>
                    <td>{formatNumber(row.paidUsers, locale)}</td>
                    <td>{formatNumber(row.paidTransactions, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
