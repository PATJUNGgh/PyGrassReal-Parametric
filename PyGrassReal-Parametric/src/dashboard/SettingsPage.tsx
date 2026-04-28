import {
  Brain,
  Boxes,
  ChevronRight,
  CreditCard,
  FileText,
  Languages,
  LogOut,
  PanelLeftOpen,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { useProfile } from '../auth/hooks/useProfile';
import { localizeText, useLanguage } from '../i18n/language';
import { PRICING_PLANS } from '../pricing/config/plans';
import { type PresetItem } from './data/chatData';
import { PresetsModal } from './components/chat/PresetsModal';
import { MemorySpaceModal } from './components/memory/MemorySpaceModal';
import { useChatPresets } from './hooks/useChatPresets';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import { useUserEntitlement } from './hooks/useUserEntitlement';
import './SettingsPage.css';

interface SettingsPageProps {
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

const SETTINGS_UI = {
  title: { th: 'Settings', en: 'Settings' },
  loadingProfile: { th: 'Loading profile...', en: 'Loading profile...' },
  noEmail: { th: 'No email', en: 'No email' },
  general: { th: 'General', en: 'General' },
  chat: { th: 'Chat', en: 'Chat' },
  manage: { th: 'Manage', en: 'Manage' },
  personalization: { th: 'Personalization', en: 'Personalization' },
  aboutUs: { th: 'About Us', en: 'About Us' },
  theme: { th: 'Theme', en: 'Theme' },
  dark: { th: 'Dark', en: 'Dark' },
  language: { th: 'Language', en: 'Language' },
  presets: { th: 'Presets', en: 'Presets' },
  expandSidebarOnSearch: { th: 'Expand Sidebar on Search', en: 'Expand Sidebar on Search' },
  subscription: { th: 'Subscription', en: 'Subscription' },
  memorySpace: { th: 'Memory Space', en: 'Memory Space' },
  memoryDescription: {
    th: 'Allow PyGrass AI to save your preferences long-term and use your past conversations to improve future chats.',
    en: 'Allow PyGrass AI to save your preferences long-term and use your past conversations to improve future chats.',
  },
  memoryToggle: { th: 'Enable Memory', en: 'Enable Memory' },
  memoryLoading: { th: 'Loading memories...', en: 'Loading memories...' },
  memoryEmpty: { th: 'Nothing saved here yet', en: 'Nothing saved here yet' },
  memoryDelete: { th: 'Delete', en: 'Delete' },
  memoryDeleteConfirm: { th: 'Confirm delete', en: 'Confirm delete' },
  currentPlan: { th: 'ใช้งานอยู่', en: 'Current' },
  checkingPlan: { th: 'กำลังตรวจสอบ...', en: 'Checking...' },
  terms: { th: 'Terms of Service', en: 'Terms of Service' },
  privacy: { th: 'Privacy Policy', en: 'Privacy Policy' },
  features: { th: 'Features', en: 'Features' },
  signOut: { th: 'Log out', en: 'Log out' },
  openProfile: { th: 'Open profile settings', en: 'Open profile settings' },
  openItem: { th: 'Open settings item', en: 'Open settings item' },
};

const getAvatarInitial = (name: string, email: string): string => {
  const source = name.trim() || email.trim() || 'U';
  return source.charAt(0).toUpperCase();
};

interface SettingsRowProps {
  icon: ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
  withChevron?: boolean;
  children?: ReactNode;
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
  withChevron = true,
  children,
}: SettingsRowProps) {
  if (onClick) {
    return (
      <button type="button" className="settings-row is-clickable" onClick={onClick}>
        <span className="settings-row-left">
          <span className="settings-row-icon">
            <Icon size={17} />
          </span>
          <span className="settings-row-label">{label}</span>
        </span>
        <span className="settings-row-right">
          {value ? <span className="settings-row-value">{value}</span> : null}
          {children}
          {withChevron ? <ChevronRight size={16} className="settings-row-chevron" /> : null}
        </span>
      </button>
    );
  }

  return (
    <div className="settings-row">
      <span className="settings-row-left">
        <span className="settings-row-icon">
          <Icon size={17} />
        </span>
        <span className="settings-row-label">{label}</span>
      </span>
      <span className="settings-row-right">
        {value ? <span className="settings-row-value">{value}</span> : null}
        {children}
        {withChevron ? <ChevronRight size={16} className="settings-row-chevron" /> : null}
      </span>
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      <div className="settings-group">{children}</div>
    </section>
  );
}

export function SettingsPage({ onNavigate, onSignOut }: SettingsPageProps) {
  const { language, languageOptions, setLanguage } = useLanguage();
  const { displayName, email, avatarUrl, isLoading } = useProfile();
  const { entitlement, loading: isEntitlementLoading } = useUserEntitlement();
  const [expandSidebarOnSearch, setExpandSidebarOnSearch] = useState(true);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [presetModalView, setPresetModalView] = useState<'list' | 'new'>('list');

  const {
    filteredPresets,
    presetSearchText,
    setPresetSearchText,
    editingPresetId,
    pendingDeletePresetId,
    newPromptContent,
    setNewPromptContent,
    newPromptTriggerWord,
    setNewPromptTriggerWord,
    handleRandomPrompt,
    handleCreatePrompt,
    handleDeletePreset,
    startEditing,
    resetForm,
  } = useChatPresets(language);

  useBodyScrollLock(isPresetsModalOpen || isMemoryModalOpen);

  const handleOpenPresets = useCallback(() => {
    setPresetModalView('list');
    setIsPresetsModalOpen(true);
  }, []);

  const handleClosePresets = useCallback(() => {
    setIsPresetsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const handleOpenMemoryModal = useCallback(() => {
    setIsMemoryModalOpen(true);
  }, []);

  const handleCloseMemoryModal = useCallback(() => {
    setIsMemoryModalOpen(false);
  }, []);

  const handleEditPresetAction = useCallback((preset: PresetItem) => {
    startEditing(preset);
    setPresetModalView('new');
  }, [startEditing]);

  useEffect(() => {
    if (!isPresetsModalOpen && !isMemoryModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (isMemoryModalOpen) {
        handleCloseMemoryModal();
        return;
      }

      if (isPresetsModalOpen) {
        handleClosePresets();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleCloseMemoryModal, handleClosePresets, isMemoryModalOpen, isPresetsModalOpen]);

  const profileName = useMemo(() => {
    const trimmed = displayName.trim();
    if (trimmed) {
      return trimmed;
    }

    const emailPrefix = email.trim().split('@')[0] ?? '';
    return emailPrefix || 'User';
  }, [displayName, email]);

  const profileEmail = email.trim() || localizeText(language, SETTINGS_UI.noEmail);
  const avatarInitial = getAvatarInitial(profileName, profileEmail);
  const currentPlanValue = useMemo(() => {
    if (isEntitlementLoading) {
      return localizeText(language, SETTINGS_UI.checkingPlan);
    }

    const currentPlanId = entitlement?.plan_id ?? 'free';
    const matchedPlan = PRICING_PLANS.find((plan) => plan.id === currentPlanId);
    const planName = matchedPlan?.name ?? `${currentPlanId.charAt(0).toUpperCase()}${currentPlanId.slice(1)}`;
    return `${planName} ${localizeText(language, SETTINGS_UI.currentPlan)}`;
  }, [entitlement, isEntitlementLoading, language]);

  return (
    <div className="dashboard-settings-page">
      <header className="settings-headline">
        <h1>{localizeText(language, SETTINGS_UI.title)}</h1>
      </header>

      <button
        type="button"
        className="settings-profile-card"
        onClick={() => onNavigate('/dashboard/settings')}
        aria-label={localizeText(language, SETTINGS_UI.openProfile)}
      >
        <span className="settings-profile-avatar" aria-hidden="true">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : avatarInitial}
        </span>
        <span className="settings-profile-copy">
          <strong>{isLoading ? localizeText(language, SETTINGS_UI.loadingProfile) : profileName}</strong>
          <span>{profileEmail}</span>
        </span>
        <ChevronRight size={18} className="settings-profile-chevron" />
      </button>

      <SettingsSection title={localizeText(language, SETTINGS_UI.general)}>
        <SettingsRow
          icon={Sun}
          label={localizeText(language, SETTINGS_UI.theme)}
          value={localizeText(language, SETTINGS_UI.dark)}
          withChevron={false}
        />

        <SettingsRow
          icon={Languages}
          label={localizeText(language, SETTINGS_UI.language)}
          withChevron={false}
        >
          <label className="settings-select-wrap">
            <span className="sr-only">{localizeText(language, SETTINGS_UI.language)}</span>
            <select
              className="settings-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value === 'th' ? 'th' : 'en')}
            >
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={localizeText(language, SETTINGS_UI.chat)}>
        <SettingsRow
          icon={Boxes}
          label={localizeText(language, SETTINGS_UI.presets)}
          onClick={handleOpenPresets}
          withChevron
        />

        <SettingsRow
          icon={PanelLeftOpen}
          label={localizeText(language, SETTINGS_UI.expandSidebarOnSearch)}
          withChevron={false}
        >
          <label className="settings-toggle" aria-label={localizeText(language, SETTINGS_UI.expandSidebarOnSearch)}>
            <input
              type="checkbox"
              checked={expandSidebarOnSearch}
              onChange={() => setExpandSidebarOnSearch((prev) => !prev)}
            />
            <span className="settings-toggle-track">
              <span className="settings-toggle-thumb" />
            </span>
          </label>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={localizeText(language, SETTINGS_UI.manage)}>
        <SettingsRow
          icon={CreditCard}
          label={localizeText(language, SETTINGS_UI.subscription)}
          value={currentPlanValue}
          onClick={() => onNavigate('/pricing?from=settings')}
          withChevron
        />
      </SettingsSection>

      <SettingsSection title={localizeText(language, SETTINGS_UI.personalization)}>
        <SettingsRow
          icon={Brain}
          label={localizeText(language, SETTINGS_UI.memorySpace)}
          onClick={handleOpenMemoryModal}
          withChevron
        />
      </SettingsSection>

      <SettingsSection title={localizeText(language, SETTINGS_UI.aboutUs)}>
        <SettingsRow
          icon={FileText}
          label={localizeText(language, SETTINGS_UI.terms)}
          onClick={() => onNavigate('/legal/terms')}
          withChevron
        />
        <SettingsRow
          icon={ShieldCheck}
          label={localizeText(language, SETTINGS_UI.privacy)}
          onClick={() => onNavigate('/legal/privacy')}
          withChevron
        />
        <SettingsRow
          icon={Sparkles}
          label={localizeText(language, SETTINGS_UI.features)}
          onClick={() => onNavigate('/about')}
          withChevron
        />
      </SettingsSection>

      <button type="button" className="settings-signout-btn" onClick={onSignOut}>
        <LogOut size={16} />
        <span>{localizeText(language, SETTINGS_UI.signOut)}</span>
      </button>

      {isPresetsModalOpen && (
        <PresetsModal
          view={presetModalView}
          onClose={handleClosePresets}
          onSetView={setPresetModalView}
          searchText={presetSearchText}
          onSearchChange={setPresetSearchText}
          filteredPresets={filteredPresets}
          editingId={editingPresetId}
          pendingDeleteId={pendingDeletePresetId}
          onEdit={handleEditPresetAction}
          onDelete={handleDeletePreset}
          newContent={newPromptContent}
          onNewContentChange={setNewPromptContent}
          newTrigger={newPromptTriggerWord}
          onNewTriggerChange={setNewPromptTriggerWord}
          onRandom={handleRandomPrompt}
          onSave={() => handleCreatePrompt() && setPresetModalView('list')}
        />
      )}

      {isMemoryModalOpen && (
        <MemorySpaceModal
          title={localizeText(language, SETTINGS_UI.memorySpace)}
          description={localizeText(language, SETTINGS_UI.memoryDescription)}
          toggleLabel={localizeText(language, SETTINGS_UI.memoryToggle)}
          loadingLabel={localizeText(language, SETTINGS_UI.memoryLoading)}
          emptyLabel={localizeText(language, SETTINGS_UI.memoryEmpty)}
          deleteLabel={localizeText(language, SETTINGS_UI.memoryDelete)}
          deleteConfirmLabel={localizeText(language, SETTINGS_UI.memoryDeleteConfirm)}
          onClose={handleCloseMemoryModal}
        />
      )}
    </div>
  );
}
