import { Check, ChevronDown, ChevronUp, Languages, LogOut, Settings, Sparkles } from 'lucide-react';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { localizeText, useLanguage } from '../../../i18n/language';
import './UserProfileButton.css';

interface UserProfileButtonProps {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  isLoading: boolean;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
  activeRoute?: string;
}

const USER_PROFILE_UI = {
  loading: { th: 'Loading profile...', en: 'Loading profile...' },
  fallbackName: { th: 'User', en: 'User' },
  fallbackEmail: { th: 'No email', en: 'No email' },
  openMenu: { th: 'Open profile menu', en: 'Open profile menu' },
  upgradePlan: { th: 'Upgrade plan', en: 'Upgrade plan' },
  language: { th: 'Language', en: 'Language' },
  languageThai: { th: 'Thai', en: 'Thai' },
  languageEnglish: { th: 'English', en: 'English' },
  settings: { th: 'Settings', en: 'Settings' },
  signOut: { th: 'Sign out', en: 'Sign out' },
};

const getAvatarInitial = (name: string, email: string): string => {
  const source = name.trim() || email.trim() || '?';
  return source.charAt(0).toUpperCase();
};

const resolvePricingSource = (activeRoute?: string): 'dashboard' | 'chat' | 'api' | 'settings' => {
  if (activeRoute === '/dashboard/chat') {
    return 'chat';
  }
  if (activeRoute === '/dashboard/api' || activeRoute === '/dashboard/usage') {
    return 'api';
  }
  if (activeRoute === '/dashboard/settings') {
    return 'settings';
  }
  return 'dashboard';
};

export const UserProfileButton = React.memo(({
  displayName,
  email,
  avatarUrl,
  isLoading,
  onSignOut,
  onNavigate,
  activeRoute,
}: UserProfileButtonProps) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const pricingSource = useMemo(() => resolvePricingSource(activeRoute), [activeRoute]);

  const resolvedName = useMemo(() => {
    const trimmedName = displayName.trim();
    if (trimmedName) {
      return trimmedName;
    }

    const emailPrefix = email.trim().split('@')[0] ?? '';
    return emailPrefix || localizeText(language, USER_PROFILE_UI.fallbackName);
  }, [displayName, email, language]);

  const resolvedEmail = useMemo(() => {
    const trimmedEmail = email.trim();
    return trimmedEmail || localizeText(language, USER_PROFILE_UI.fallbackEmail);
  }, [email, language]);

  const avatarInitial = useMemo(() => getAvatarInitial(resolvedName, resolvedEmail), [resolvedName, resolvedEmail]);
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setIsLanguageOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!rootRef.current?.contains(target)) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [closeMenu, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeMenu, isOpen]);

  const handleSettingsClick = () => {
    closeMenu();
    onNavigate('/dashboard/settings');
  };

  const handleUpgradePlanClick = () => {
    closeMenu();
    onNavigate(`/pricing?from=${pricingSource}`);
  };

  const handleSignOutClick = () => {
    closeMenu();
    onSignOut();
  };

  const handleToggleLanguageDropdown = () => {
    setIsLanguageOpen((prev) => !prev);
  };

  const handleSelectLanguage = (nextLanguage: 'th' | 'en') => {
    setLanguage(nextLanguage);
    setIsLanguageOpen(false);
  };

  const currentLanguageCode = language === 'th' ? 'TH' : 'EN';

  const renderAvatar = (sizeClass?: string) => (
    <span className={`user-profile-avatar ${sizeClass ?? ''}`.trim()} aria-hidden="true">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="user-profile-avatar-image" />
      ) : (
        avatarInitial
      )}
    </span>
  );

  return (
    <div className={`user-profile-root ${isOpen ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="user-profile-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={localizeText(language, USER_PROFILE_UI.openMenu)}
        title={localizeText(language, USER_PROFILE_UI.openMenu)}
      >
        {renderAvatar()}
        <span className="user-profile-copy">
          <span className="user-profile-name">
            {isLoading ? localizeText(language, USER_PROFILE_UI.loading) : resolvedName}
          </span>
          <span className="user-profile-email">{resolvedEmail}</span>
        </span>
        <ChevronUp size={16} className="user-profile-chevron" />
      </button>

      <div
        id={menuId}
        className="user-profile-menu"
        role="menu"
        aria-hidden={!isOpen}
      >
        <div className="user-profile-menu-head">
          {renderAvatar('is-large')}
          <div className="user-profile-menu-copy">
            <strong>{resolvedName}</strong>
            <span>{resolvedEmail}</span>
          </div>
        </div>
        <div className="user-profile-menu-divider" />
        <button
          type="button"
          className="user-profile-menu-item is-upgrade"
          onClick={handleUpgradePlanClick}
          role="menuitem"
        >
          <Sparkles size={16} />
          <span>{localizeText(language, USER_PROFILE_UI.upgradePlan)}</span>
        </button>
        <button type="button" className="user-profile-menu-item" onClick={handleSettingsClick} role="menuitem">
          <Settings size={16} />
          <span>{localizeText(language, USER_PROFILE_UI.settings)}</span>
        </button>
        <div className="user-profile-language-wrap">
          <button
            type="button"
            className={`user-profile-menu-item user-profile-language-trigger ${isLanguageOpen ? 'is-open' : ''}`}
            onClick={handleToggleLanguageDropdown}
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={isLanguageOpen}
            aria-label={localizeText(language, USER_PROFILE_UI.language)}
          >
            <span className="user-profile-language-copy">
              <Languages size={16} />
              <span>{localizeText(language, USER_PROFILE_UI.language)}</span>
            </span>
            <span className="user-profile-language-current">{currentLanguageCode}</span>
            <ChevronDown size={14} className="user-profile-language-chevron" />
          </button>
          <div
            className={`user-profile-language-dropdown ${isLanguageOpen ? 'is-open' : ''}`}
            role="menu"
            aria-hidden={!isLanguageOpen}
          >
            <button
              type="button"
              className={`user-profile-language-option ${language === 'th' ? 'is-active' : ''}`}
              role="menuitem"
              onClick={() => handleSelectLanguage('th')}
            >
              <span>{localizeText(language, USER_PROFILE_UI.languageThai)}</span>
              {language === 'th' ? <Check size={14} /> : null}
            </button>
            <button
              type="button"
              className={`user-profile-language-option ${language === 'en' ? 'is-active' : ''}`}
              role="menuitem"
              onClick={() => handleSelectLanguage('en')}
            >
              <span>{localizeText(language, USER_PROFILE_UI.languageEnglish)}</span>
              {language === 'en' ? <Check size={14} /> : null}
            </button>
          </div>
        </div>
        <div className="user-profile-menu-divider" />
        <button
          type="button"
          className="user-profile-menu-item is-danger"
          onClick={handleSignOutClick}
          role="menuitem"
        >
          <LogOut size={16} />
          <span>{localizeText(language, USER_PROFILE_UI.signOut)}</span>
        </button>
      </div>
    </div>
  );
});

UserProfileButton.displayName = 'UserProfileButton';
