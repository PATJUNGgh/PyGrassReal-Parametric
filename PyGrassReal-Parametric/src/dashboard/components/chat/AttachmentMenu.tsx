import React from 'react';
import { Paperclip, Box, Globe, ChevronRight, Check } from 'lucide-react';
import { useLanguage, localizeText, type LocalizedText } from '../../../i18n/language';
import { CHAT_COMPOSER_UI } from '../../data/chatData';

interface AttachmentMenuProps {
  position: 'centered' | 'bottom';
  webSearchMode: 'auto' | 'off';
  isWebSearchHovered: boolean;
  lockWebSearchOff?: boolean;
  onAttachClick: () => void;
  onOpenQuickPresets: () => void;
  onWebSearchHover: (isHovered: boolean) => void;
  onSetWebSearchMode: (mode: 'auto' | 'off') => void;
}

interface WebSearchOption {
  mode: 'auto' | 'off';
  title: LocalizedText;
  desc: LocalizedText;
}

const WEB_SEARCH_OPTIONS: WebSearchOption[] = [
  { mode: 'auto', title: CHAT_COMPOSER_UI.auto, desc: CHAT_COMPOSER_UI.autoDesc },
  { mode: 'off', title: CHAT_COMPOSER_UI.off, desc: CHAT_COMPOSER_UI.offDesc },
];

export const AttachmentMenu = React.memo(({
  position,
  webSearchMode,
  isWebSearchHovered,
  lockWebSearchOff = false,
  onAttachClick,
  onOpenQuickPresets,
  onWebSearchHover,
  onSetWebSearchMode,
}: AttachmentMenuProps) => {
  const { language } = useLanguage();

  return (
    <div className={`attach-dropdown-menu ${position === 'centered' ? 'is-bottom' : 'is-top'}`}>
      <button className="attach-menu-item" onClick={onAttachClick} type="button">
        <Paperclip size={16} strokeWidth={2} />
        <span>{localizeText(language, CHAT_COMPOSER_UI.addFiles)}</span>
      </button>
      <button className="attach-menu-item" onClick={onOpenQuickPresets} type="button">
        <Box size={16} strokeWidth={2} />
        <span>{localizeText(language, CHAT_COMPOSER_UI.presets)}</span>
      </button>

      <div
        className="attach-menu-item has-submenu"
        onMouseEnter={() => onWebSearchHover(true)}
        onMouseLeave={() => onWebSearchHover(false)}
      >
        <div className="menu-item-content">
          <Globe size={16} strokeWidth={2} />
          <span>{localizeText(language, CHAT_COMPOSER_UI.webSearch)}</span>
        </div>
        <ChevronRight size={16} className="submenu-arrow" />

        {isWebSearchHovered && (
          <div className="attach-submenu">
            {WEB_SEARCH_OPTIONS.map(({ mode, title, desc }) => {
              const isDisabled = lockWebSearchOff && mode === 'auto';
              return (
                <button
                  key={mode}
                  className="submenu-item"
                  onClick={() => onSetWebSearchMode(mode)}
                  type="button"
                  disabled={isDisabled}
                  title={isDisabled ? 'Free plan keeps internet off mode' : undefined}
                >
                  <div className="submenu-text">
                    <span className="submenu-title">{localizeText(language, title)}</span>
                    <span className="submenu-desc">{localizeText(language, desc)}</span>
                  </div>
                  {webSearchMode === mode && <Check size={16} className="submenu-check" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

AttachmentMenu.displayName = 'AttachmentMenu';
