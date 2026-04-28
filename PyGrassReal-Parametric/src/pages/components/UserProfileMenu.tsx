import { LogOut, LayoutDashboard, ChevronDown, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile } from '../../auth/hooks/useProfile';
import { signOut } from '../../auth/services/auth.api';
import { localizeText, useLanguage } from '../../i18n/language';
import { usePageNavigation } from '../navigation/PageNavigationContext';

export function UserProfileMenu() {
  const { language } = useLanguage();
  const { navigate } = usePageNavigation();
  const profile = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        toggleRef.current &&
        !toggleRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        toggleRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, close]);

  const handleSignOut = async () => {
    close();
    await signOut();
    navigate('/', { source: 'profile-menu.sign-out' });
  };

  const handleDashboard = () => {
    close();
    navigate('/dashboard', { source: 'profile-menu.dashboard' });
  };

  const initials = profile.displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="pg-profile-menu-wrapper">
      <button
        ref={toggleRef}
        type="button"
        className="pg-profile-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={localizeText(language, {
          th: 'เมนูโปรไฟล์',
          en: 'Profile menu',
        })}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="pg-profile-avatar"
            width={32}
            height={32}
          />
        ) : (
          <span className="pg-profile-avatar pg-profile-avatar--initials">
            {initials || <User size={16} />}
          </span>
        )}
        <span className="pg-profile-name">{profile.displayName}</span>
        <ChevronDown
          size={14}
          className={`pg-profile-chevron ${isOpen ? 'is-open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div ref={menuRef} className="pg-profile-dropdown" role="menu">
          <div className="pg-profile-dropdown-header">
            <span className="pg-profile-dropdown-name">{profile.displayName}</span>
            <span className="pg-profile-dropdown-email">{profile.email}</span>
          </div>
          <div className="pg-profile-dropdown-divider" />

          <button
            type="button"
            className="pg-profile-dropdown-item"
            role="menuitem"
            onClick={handleDashboard}
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            {localizeText(language, { th: 'แดชบอร์ด', en: 'Dashboard' })}
          </button>

          <div className="pg-profile-dropdown-divider" />

          <button
            type="button"
            className="pg-profile-dropdown-item pg-profile-dropdown-item--danger"
            role="menuitem"
            onClick={handleSignOut}
          >
            <LogOut size={16} aria-hidden="true" />
            {localizeText(language, { th: 'ออกจากระบบ', en: 'Sign out' })}
          </button>
        </div>
      )}
    </div>
  );
}
