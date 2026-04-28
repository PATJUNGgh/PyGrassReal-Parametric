import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MoreVertical, Circle, Activity, Edit2, MinusCircle, Trash2, X, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { createPortal } from 'react-dom';
import { localizeText, useLanguage } from '../../i18n/language';
import { supabase } from '../../lib/supabaseClient';
import { API_MANAGEMENT_UI } from '../data/dashboardData';
import {
  createApiKey,
  deleteApiKey,
  disableApiKey,
  enableApiKey,
  fetchApiKeys,
  type ApiKeyRecord,
  type ApiSubscriptionRecord,
  getOrInitApiSubscription,
  generateApiSubscriptionKey,
} from '../services/apiKeys.service';
import { useUserEntitlement } from '../hooks/useUserEntitlement';

// ─── helpers ────────────────────────────────────────────────────────────────

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
};

const formatRelative = (iso: string | null, language: 'th' | 'en'): string => {
  if (!iso) return language === 'th' ? 'ไม่มีกำหนด' : 'Never';
  const diff = new Date(iso).getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const isPast = diff < 0;
  const mins = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  if (language === 'th') {
    if (days > 0) return isPast ? `${days} วันที่แล้ว` : `ใน ${days} วัน`;
    if (hours > 0) return isPast ? `${hours} ชั่วโมงที่แล้ว` : `ใน ${hours} ชั่วโมง`;
    return isPast ? `${mins} นาทีที่แล้ว` : `ใน ${mins} นาที`;
  }
  if (days > 0) return isPast ? `${days} days ago` : `In ${days} days`;
  if (hours > 0) return isPast ? `${hours} hours ago` : `In ${hours} hours`;
  return isPast ? `${mins} minutes ago` : `In ${mins} minutes`;
};

const formatAbsoluteDate = (iso: string | null): string => {
  if (!iso) return '-';
  const date = new Date(iso);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'shortOffset',
    hour12: false
  });
  return formatter.format(date).replace(',', '');
};

// ─── UI strings ──────────────────────────────────────────────────────────────

const UI = {
  pageTitle: { th: 'API Keys', en: 'API Keys' },
  pageDesc: { th: 'จัดการ key เพื่อเข้าถึง PyGrass AI', en: 'Manage your keys to access PyGrass AI' },
  loading: { th: 'กำลังโหลด...', en: 'Loading...' },
  error: { th: 'โหลดไม่สำเร็จ', en: 'Failed to load' },
  notLoggedIn: { th: 'กรุณาเข้าสู่ระบบก่อน', en: 'Please sign in first' },
  colKey: { th: 'Key', en: 'Key' },
  colExpires: { th: 'หมดอายุ', en: 'Expires' },
  colLastUsed: { th: 'ใช้ล่าสุด', en: 'Last Used' },
  colUsage: { th: 'การใช้งาน', en: 'Usage' },
  colLimit: { th: 'ลิมิต', en: 'Limit' },
  noLimit: { th: 'ไม่จำกัด', en: 'Unlimited' },
  noExpiry: { th: 'ไม่มีกำหนด', en: 'No expiration' },
  neverUsed: { th: 'ยังไม่เคยใช้', en: 'Never' },
  empty: { th: 'ยังไม่มี API Key — กดปุ่ม Create เพื่อเริ่มต้น', en: 'No API keys yet — click Create to get started' },
  deleteConfirm: { th: 'ต้องการลบ API Key นี้?', en: 'Delete this API key?' },
  creating: { th: 'กำลังสร้าง...', en: 'Creating...' },
  keyCreatedTitle: { th: '🎉 สร้าง API Key สำเร็จ!', en: '🎉 API Key Created!' },
  keyCreatedWarn: { th: 'คัดลอก key ทันที — จะไม่สามารถแสดงได้อีก', en: 'Copy your key now — it will not be shown again.' },
  copyKey: { th: 'คัดลอก Key', en: 'Copy Key' },
  copied: { th: '✓ คัดลอกแล้ว!', en: '✓ Copied!' },
  done: { th: 'เสร็จสิ้น', en: 'Done' },
  // 3-dot menu
  menuOverview: { th: 'Overview', en: 'Overview' },
  menuActivity: { th: 'Activity', en: 'Activity' },
  menuEdit: { th: 'Edit', en: 'Edit' },
  menuEnable: { th: 'Enable', en: 'Enable' },
  menuDisable: { th: 'Disable', en: 'Disable' },
  menuDelete: { th: 'Delete', en: 'Delete' },
  // edit modal
  editTitle: { th: 'แก้ไข API Key', en: 'Edit API Key' },
  editLabel: { th: 'ชื่อ Key', en: 'Key Name' },
  // overview modal
  ovwName: { th: 'Name', en: 'Name' },
  ovwKey: { th: 'Key', en: 'Key' },
  ovwStatus: { th: 'Status', en: 'Status' },
  ovwEnabled: { th: 'Enabled', en: 'Enabled' },
  ovwDisabled: { th: 'Disabled', en: 'Disabled' },
  ovwCreatedAt: { th: 'Created At', en: 'Created At' },
  ovwExpires: { th: 'Expires', en: 'Expires' },
  ovwLastUsed: { th: 'Last Used', en: 'Last Used' },
  ovwCreditUsage: { th: 'Credit Usage', en: 'Credit Usage' },
  ovwTotal: { th: 'Total', en: 'Total' },
  ovwToday: { th: 'Today', en: 'Today' },
  ovwThisWeek: { th: 'This Week', en: 'This Week' },
  ovwThisMonth: { th: 'This Month', en: 'This Month' },
  ovwCreditLimits: { th: 'Credit Limits', en: 'Credit Limits' },
  ovwIncludeBYOK: { th: 'Include BYOK', en: 'Include BYOK' },
  ovwLimit: { th: 'Limit', en: 'Limit' },
  ovwUsed: { th: 'Used', en: 'Used' },
  // API Subscription UI
  apiSubTitle: { th: 'API Subscription', en: 'API Subscription' },
  apiSubDesc: { th: 'แพ็กเกจการใช้งาน API และรหัสสำหรับแพ็กเกจของคุณ', en: 'Your API usage package and the key for your package.' },
  apiSubNoKey: { th: 'ยังไม่มี Subscription Key', en: 'No Subscription Key yet' },
  apiSubGenerate: { th: 'สร้าง Subscription Key', en: 'Generate Subscription Key' },
  apiSubKeyHeader: { th: 'Subscription Key', en: 'Subscription Key' },
  apiSubPlanHeader: { th: 'Plan', en: 'Plan' },
  apiSubStatusHeader: { th: 'Status', en: 'Status' },
  apiSubNoPlan: { th: 'คุณยังไม่มีแพ็กเกจ API อยู่ในระบบ', en: 'You do not have an active API subscription.' },
  apiSubSubscribe: { th: 'สมัครใช้งาน API', en: 'Subscribe to API' },
  apiSubRegenerateConfirm: { th: 'คุณแน่ใจหรือไม่ว่าต้องการสร้าง Subscription Key ใหม่? Key เดิมจะไม่สามารถใช้งานได้อีกต่อไป', en: 'Are you sure you want to regenerate your Subscription Key? The old key will no longer work.' },
};

// ─── 3-dot dropdown ──────────────────────────────────────────────────────────

interface DropdownMenuProps {
  keyId: string;
  keyName: string;
  isActive: boolean;
  language: 'th' | 'en';
  onOverview: () => void;
  onEdit: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onDelete: () => void;
}

interface MenuPosition {
  top: number;
  left: number;
}

function DropdownMenu({ keyId, keyName: _keyName, isActive, language, onOverview, onEdit, onEnable, onDisable, onDelete }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0 });

  const syncMenuPosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuWidth = menuEl?.offsetWidth ?? 164;
    const menuHeight = menuEl?.offsetHeight ?? 220;

    const viewportPadding = 8;
    const horizontalOffset = 8;
    const verticalOffset = 6;

    let left = triggerRect.right - menuWidth + horizontalOffset;
    left = Math.min(left, window.innerWidth - menuWidth - viewportPadding);
    left = Math.max(viewportPadding, left);

    let top = triggerRect.bottom + verticalOffset;
    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, triggerRect.top - menuHeight - verticalOffset);
    }

    setMenuPosition((prev) => {
      if (Math.abs(prev.top - top) < 0.5 && Math.abs(prev.left - left) < 0.5) return prev;
      return { top, left };
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    syncMenuPosition();
    const rafId = window.requestAnimationFrame(syncMenuPosition);
    return () => window.cancelAnimationFrame(rafId);
  }, [open, syncMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const reposition = () => syncMenuPosition();

    document.addEventListener('mousedown', close);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, syncMenuPosition]);

  const handle = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div className="ak-menu-wrap" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ak-menu-trigger"
        aria-label="Options"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={`ak-menu-${keyId}`}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={15} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="ak-dropdown"
          id={`ak-menu-${keyId}`}
          role="menu"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
        >
          <button type="button" className="ak-menu-item" role="menuitem" onClick={() => handle(onOverview)}>
            <Circle size={13} />
            {localizeText(language, UI.menuOverview)}
          </button>
          <button type="button" className="ak-menu-item" role="menuitem" onClick={() => handle(() => { })}>
            <Activity size={13} />
            {localizeText(language, UI.menuActivity)}
          </button>
          <button type="button" className="ak-menu-item" role="menuitem" onClick={() => handle(onEdit)}>
            <Edit2 size={13} />
            {localizeText(language, UI.menuEdit)}
          </button>
          {isActive ? (
            <button type="button" className="ak-menu-item" role="menuitem" onClick={() => handle(onDisable)}>
              <MinusCircle size={13} />
              {localizeText(language, UI.menuDisable)}
            </button>
          ) : (
            <button type="button" className="ak-menu-item" role="menuitem" onClick={() => handle(onEnable)}>
              <Circle size={13} />
              {localizeText(language, UI.menuEnable)}
            </button>
          )}
          <div className="ak-menu-divider" />
          <button type="button" className="ak-menu-item is-danger" role="menuitem" onClick={() => handle(onDelete)}>
            <Trash2 size={13} />
            {localizeText(language, UI.menuDelete)}
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function ApiKeysTab() {
  const { language } = useLanguage();
  const { entitlement } = useUserEntitlement();
  const currentPlanId = entitlement?.plan_id ?? 'free';

  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // api subscription
  const [apiSub, setApiSub] = useState<ApiSubscriptionRecord | null>(null);
  const [isSubLoading, setIsSubLoading] = useState(true);
  const [isGeneratingSubKey, setIsGeneratingSubKey] = useState(false);
  const [isSubKeyVisible, setIsSubKeyVisible] = useState(false);

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  // regenerate modal
  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // edit modal
  const [editKey, setEditKey] = useState<ApiKeyRecord | null>(null);
  const [editName, setEditName] = useState('');

  // overview modal
  const [overviewKey, setOverviewKey] = useState<ApiKeyRecord | null>(null);

  // reveal modal
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [isRevealCopied, setIsRevealCopied] = useState(false);

  // get current user
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  // fetch keys
  const loadKeys = useCallback(async (uid: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await fetchApiKeys(uid);
      setKeys(result);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) { setIsLoading(false); setIsSubLoading(false); return; }
    void loadKeys(userId);
    
    // load API Subscription
    const loadApiSub = async () => {
      try {
        const sub = await getOrInitApiSubscription(userId);
        setApiSub(sub);
      } catch (err) {
        console.error('Failed to load api subscription:', err);
      } finally {
        setIsSubLoading(false);
      }
    };
    void loadApiSub();
  }, [userId, loadKeys]);

  // ─── selection helpers ────────────────────────────────────────────────────

  const allChecked = keys.length > 0 && selectedIds.size === keys.length;
  const toggleAll = () =>
    setSelectedIds(allChecked ? new Set() : new Set(keys.map((k) => k.id)));
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ─── actions ─────────────────────────────────────────────────────────────

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyName.trim();
    if (!trimmed || !userId) return;
    setIsCreating(true);
    try {
      const { record, plainKey } = await createApiKey(userId, trimmed);
      setKeys((prev) => [record, ...prev]);
      setNewKeyName('');
      setIsCreateOpen(false);
      setRevealedKey(plainKey);
      setIsRevealCopied(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(localizeText(language, UI.deleteConfirm))) return;
    await deleteApiKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const promptRegenerateSubKey = () => {
    if (!userId) return;
    if (apiSub?.subscription_key) {
      setIsRegenerateConfirmOpen(true);
    } else {
      void executeGenerateSubKey();
    }
  };

  const executeGenerateSubKey = async () => {
    if (!userId) return;
    setIsGeneratingSubKey(true);
    setIsRegenerateConfirmOpen(false);
    try {
      const newKey = await generateApiSubscriptionKey(userId);
      setApiSub((prev) => prev ? { ...prev, subscription_key: newKey } : null);
      setRevealedKey(newKey);
      setIsRevealCopied(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSubKey(false);
    }
  };

  const handleDisable = async (id: string) => {
    await disableApiKey(id);
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, is_active: false } : k)));
  };

  const handleEnable = async (id: string) => {
    await enableApiKey(id);
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, is_active: true } : k)));
  };

  const openEdit = (key: ApiKeyRecord) => {
    setEditKey(key);
    setEditName(key.name);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editKey) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    const { error } = await supabase
      .from('api_keys')
      .update({ name: trimmed })
      .eq('id', editKey.id);
    if (!error) {
      setKeys((prev) => prev.map((k) => (k.id === editKey.id ? { ...k, name: trimmed } : k)));
    }
    setEditKey(null);
  };

  // ─── render ───────────────────────────────────────────────────────────────

  if (!userId && !isLoading) {
    return (
      <section className="api-tab-block">
        <p className="ak-status-msg">{localizeText(language, UI.notLoggedIn)}</p>
      </section>
    );
  }

  return (
    <section className="api-tab-block">
      {/* ── API Subscription Box ── */}
      <div className="api-subscription-widget" style={{ marginBottom: '32px', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '12px', padding: '24px' }}>
        <h3 className="ak-title" style={{ marginTop: 0 }}>{localizeText(language, UI.apiSubTitle)}</h3>
        <p className="ak-desc" style={{ marginBottom: '20px' }}>{localizeText(language, UI.apiSubDesc)}</p>
        
        {isSubLoading ? (
          <p className="ak-status-msg" style={{ margin: 0, padding: 0 }}>{localizeText(language, UI.loading)}</p>
        ) : (apiSub && apiSub.status === 'active') || (currentPlanId !== 'free') ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ flex: '1 1 auto', minWidth: '250px' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>{localizeText(language, UI.apiSubKeyHeader)}</div>
              {apiSub?.subscription_key ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsSubKeyVisible(!isSubKeyVisible)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                    title={isSubKeyVisible ? localizeText(language, { th: 'ซ่อนรหัส', en: 'Hide key' }) : localizeText(language, { th: 'แสดงรหัส', en: 'Reveal key' })}
                  >
                    {isSubKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <code style={{ background: 'transparent', padding: 0, fontSize: '1rem', color: '#f8fafc', border: 'none', minWidth: '320px' }}>
                    {isSubKeyVisible 
                      ? apiSub.subscription_key 
                      : (apiSub.subscription_key.substring(0, 9) + '•'.repeat(Math.max(0, apiSub.subscription_key.length - 9)))
                    }
                  </code>
                  <button 
                    type="button" 
                    onClick={() => promptRegenerateSubKey()} 
                    disabled={isGeneratingSubKey}
                    title="Regenerate Subscription Key"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                  >
                    <RefreshCw size={14} className={isGeneratingSubKey ? 'spinner' : ''} />
                  </button>
                  <button type="button" onClick={() => void copyText(apiSub.subscription_key!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38bdf8', fontSize: '0.85rem' }}>
                    Copy
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{localizeText(language, UI.apiSubNoKey)}</span>
                  <button 
                    type="button" 
                    className="api-action-btn is-primary" 
                    style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                    onClick={() => promptRegenerateSubKey()}
                    disabled={isGeneratingSubKey}
                  >
                    {isGeneratingSubKey ? localizeText(language, UI.loading) : localizeText(language, UI.apiSubGenerate)}
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>{localizeText(language, UI.apiSubPlanHeader)}</div>
                <strong style={{ fontSize: '1rem', color: '#f8fafc', textTransform: 'capitalize' }}>
                  {currentPlanId !== 'free' ? currentPlanId : apiSub?.plan_id}
                </strong>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>{localizeText(language, UI.apiSubStatusHeader)}</div>
                <span className="ak-overview-status is-enabled">
                  active
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ color: '#bae6fd', margin: 0, fontSize: '0.95rem' }}>
              {localizeText(language, UI.apiSubNoPlan)}
            </p>
            <a href="/pricing?from=api" className="api-action-btn is-primary" style={{ textDecoration: 'none' }}>
              {localizeText(language, UI.apiSubSubscribe)}
            </a>
          </div>
        )}
      </div>

      {/* header */}
      <div className="ak-header">
        <div>
          <h2 className="ak-title">{localizeText(language, UI.pageTitle)}</h2>
          <p className="ak-desc">{localizeText(language, UI.pageDesc)}</p>
        </div>
        <button
          type="button"
          className="api-action-btn is-primary ak-create-btn"
          onClick={() => setIsCreateOpen(true)}
          disabled={!userId}
        >
          {localizeText(language, API_MANAGEMENT_UI.apiKeys.createButton)}
        </button>
      </div>

      {/* table */}
      <div className="api-table-wrap">
        {isLoading ? (
          <p className="ak-status-msg">{localizeText(language, UI.loading)}</p>
        ) : loadError ? (
          <p className="ak-status-msg ak-error">{localizeText(language, UI.error)}: {loadError}</p>
        ) : (
          <table className="api-data-table ak-table">
            <thead>
              <tr>
                <th className="ak-col-check">
                  <input
                    type="checkbox"
                    className="ak-checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="ak-col-key">{localizeText(language, UI.colKey)}</th>
                <th className="ak-col-expires">{localizeText(language, UI.colExpires)}</th>
                <th className="ak-col-lastused">{localizeText(language, UI.colLastUsed)}</th>
                <th className="ak-col-usage">{localizeText(language, UI.colUsage)}</th>
                <th className="ak-col-limit">{localizeText(language, UI.colLimit)}</th>
                <th className="ak-col-menu" aria-label="Actions">⋮</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="api-empty-row">
                    {localizeText(language, UI.empty)}
                  </td>
                </tr>
              ) : (
                keys.map((item) => {
                  const expiresText = item.expires_at
                    ? formatRelative(item.expires_at, language)
                    : localizeText(language, UI.noExpiry);
                  const lastUsedText = item.last_used_at
                    ? formatRelative(item.last_used_at, language)
                    : localizeText(language, UI.neverUsed);
                  const limitText = item.credit_limit != null
                    ? `$${item.credit_limit}`
                    : localizeText(language, UI.noLimit);

                  return (
                    <tr
                      key={item.id}
                      className={selectedIds.has(item.id) ? 'ak-row-selected' : ''}
                      style={{ opacity: item.is_active ? 1 : 0.55 }}
                    >
                      <td className="ak-col-check">
                        <input
                          type="checkbox"
                          className="ak-checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleOne(item.id)}
                          aria-label={`Select ${item.name}`}
                        />
                      </td>

                      {/* Key column: bold name + masked prefix */}
                      <td className="ak-col-key">
                        <span className="ak-key-name" style={{ textDecoration: item.is_active ? 'none' : 'line-through' }}>
                          {item.name}
                        </span>
                        <code className="ak-key-prefix">{item.key_prefix}</code>
                      </td>

                      {/* Expires */}
                      <td className="ak-col-expires ak-text-muted">{expiresText}</td>

                      {/* Last Used */}
                      <td className="ak-col-lastused ak-text-muted">{lastUsedText}</td>

                      {/* Usage — placeholder $0.00 for now */}
                      <td className="ak-col-usage">
                        <span className="ak-usage-amount">$0.00</span>
                      </td>

                      {/* Limit + TOTAL badge + progress bar */}
                      <td className="ak-col-limit">
                        <div className="ak-limit-wrap">
                          <span className="ak-limit-amount">{limitText}</span>
                          {item.credit_limit != null && (
                            <span className="ak-limit-badge">TOTAL</span>
                          )}
                        </div>
                        {item.credit_limit != null && (
                          <div className="ak-limit-bar">
                            <div className="ak-limit-bar-fill" style={{ width: '5%' }} />
                          </div>
                        )}
                      </td>

                      {/* 3-dot menu */}
                      <td className="ak-col-menu">
                        <DropdownMenu
                          keyId={item.id}
                          keyName={item.name}
                          isActive={item.is_active}
                          language={language}
                          onOverview={() => setOverviewKey(item)}
                          onEdit={() => openEdit(item)}
                          onEnable={() => void handleEnable(item.id)}
                          onDisable={() => void handleDisable(item.id)}
                          onDelete={() => void handleDelete(item.id)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create Modal ───────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="api-modal-backdrop">
          <div className="api-modal-card" role="dialog" aria-modal="true" aria-labelledby="ak-create-title">
            <h3 id="ak-create-title">
              {localizeText(language, API_MANAGEMENT_UI.apiKeys.createModalTitle)}
            </h3>
            <form onSubmit={(e) => void handleCreateSubmit(e)}>
              <label className="api-modal-field" htmlFor="ak-key-name">
                <span>{localizeText(language, API_MANAGEMENT_UI.apiKeys.createModalNameLabel)}</span>
                <input
                  id="ak-key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={localizeText(language, API_MANAGEMENT_UI.apiKeys.createModalNamePlaceholder)}
                  disabled={isCreating}
                  autoFocus
                />
              </label>
              <div className="api-modal-actions">
                <button type="button" className="api-action-btn" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                  {localizeText(language, API_MANAGEMENT_UI.common.cancel)}
                </button>
                <button type="submit" className="api-action-btn is-primary" disabled={!newKeyName.trim() || isCreating}>
                  {isCreating
                    ? localizeText(language, UI.creating)
                    : localizeText(language, API_MANAGEMENT_UI.common.create)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Regenerate Confirm Modal ───────────────────────────────────────── */}
      {isRegenerateConfirmOpen && (
        <div className="api-modal-backdrop">
          <div className="api-modal-card" role="dialog" aria-modal="true" aria-labelledby="ak-regen-title">
            <h3 id="ak-regen-title">
              {localizeText(language, { th: 'สร้าง Subscription Key ใหม่', en: 'Regenerate Subscription Key' })}
            </h3>
            <p style={{ marginTop: '8px', marginBottom: '20px', color: '#94a3b8', fontSize: '0.95rem' }}>
              {localizeText(language, UI.apiSubRegenerateConfirm)}
            </p>
            <div className="api-modal-actions">
              <button type="button" className="api-action-btn" onClick={() => setIsRegenerateConfirmOpen(false)} disabled={isGeneratingSubKey}>
                {localizeText(language, API_MANAGEMENT_UI.common.cancel)}
              </button>
              <button type="button" className="api-action-btn is-primary" onClick={() => void executeGenerateSubKey()} disabled={isGeneratingSubKey}>
                {isGeneratingSubKey
                  ? localizeText(language, UI.loading)
                  : localizeText(language, { th: 'ยืนยัน', en: 'Confirm' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      {editKey && (
        <div className="api-modal-backdrop">
          <div className="api-modal-card" role="dialog" aria-modal="true" aria-labelledby="ak-edit-title">
            <h3 id="ak-edit-title">{localizeText(language, UI.editTitle)}</h3>
            <form onSubmit={(e) => void handleEditSubmit(e)}>
              <label className="api-modal-field" htmlFor="ak-edit-name">
                <span>{localizeText(language, UI.editLabel)}</span>
                <input
                  id="ak-edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              </label>
              <div className="api-modal-actions">
                <button type="button" className="api-action-btn" onClick={() => setEditKey(null)}>
                  {localizeText(language, API_MANAGEMENT_UI.common.cancel)}
                </button>
                <button type="submit" className="api-action-btn is-primary" disabled={!editName.trim()}>
                  {localizeText(language, { th: 'บันทึก', en: 'Save' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reveal Key Modal ──────────────────────────────────────────────── */}
      {revealedKey && (
        <div className="api-modal-backdrop">
          <div className="api-modal-card ak-reveal-card" role="dialog" aria-modal="true" aria-labelledby="ak-reveal-title">
            <h3 id="ak-reveal-title">{localizeText(language, UI.keyCreatedTitle)}</h3>
            <p className="ak-reveal-warn">{localizeText(language, UI.keyCreatedWarn)}</p>
            <div className="ak-reveal-box">{revealedKey}</div>
            <div className="api-modal-actions">
              <button
                type="button"
                className="api-action-btn is-primary"
                onClick={() => void copyText(revealedKey).then(() => setIsRevealCopied(true))}
              >
                {isRevealCopied
                  ? localizeText(language, UI.copied)
                  : localizeText(language, UI.copyKey)}
              </button>
              <button type="button" className="api-action-btn" onClick={() => setRevealedKey(null)}>
                {localizeText(language, UI.done)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overview Modal ──────────────────────────────────────────────── */}
      {overviewKey && (
        <div className="api-modal-backdrop" onClick={() => setOverviewKey(null)}>
          <div className="api-modal-card ak-overview-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ak-overview-close" onClick={() => setOverviewKey(null)}>
              <X size={16} />
            </button>
            <div className="ak-overview-content">
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwName)}</span>
                <span className="ak-overview-value">{overviewKey.name}</span>
              </div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwKey)}</span>
                <code className="ak-overview-value-code">{overviewKey.key_prefix}</code>
              </div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwStatus)}</span>
                <span className={`ak-overview-status ${overviewKey.is_active ? 'is-enabled' : 'is-disabled'}`}>
                  {overviewKey.is_active ? localizeText(language, UI.ovwEnabled) : localizeText(language, UI.ovwDisabled)}
                </span>
              </div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwCreatedAt)}</span>
                <span className="ak-overview-value">{formatAbsoluteDate(overviewKey.created_at)}</span>
              </div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwExpires)}</span>
                <span className="ak-overview-value">{formatAbsoluteDate(overviewKey.expires_at)}</span>
              </div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwLastUsed)}</span>
                <span className="ak-overview-value">{formatAbsoluteDate(overviewKey.last_used_at)}</span>
              </div>

              <div className="ak-overview-section-title">{localizeText(language, UI.ovwCreditUsage)}</div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwTotal)}</span>
                <span className="ak-overview-value">$0.0668</span>
              </div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwToday)}</span>
                <span className="ak-overview-value">$0.0000</span>
              </div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwThisWeek)}</span>
                <span className="ak-overview-value">$0.0624</span>
              </div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwThisMonth)}</span>
                <span className="ak-overview-value">$0.0668</span>
              </div>

              <div className="ak-overview-section-title">{localizeText(language, UI.ovwCreditLimits)}</div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwIncludeBYOK)}</span>
                <span className="ak-overview-badge-gray">No</span>
              </div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwLimit)}</span>
                <span className="ak-overview-value">
                  ${overviewKey.credit_limit || '2'} <span className="ak-limit-badge" style={{ verticalAlign: 'middle', marginLeft: 4 }}>TOTAL</span>
                </span>
              </div>
              <div className="ak-overview-row">
                <span className="ak-overview-label">{localizeText(language, UI.ovwUsed)}</span>
                <span className="ak-overview-value">$0.0668 (3.3%)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
