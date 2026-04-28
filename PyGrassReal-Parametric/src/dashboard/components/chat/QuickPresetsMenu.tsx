import React from 'react';
import { useLanguage, localizeText } from '../../../i18n/language';
import { CHAT_COMPOSER_UI, type PresetItem } from '../../data/chatData';

interface QuickPresetsMenuProps {
  presetItems: PresetItem[];
  position: string;
  onApply: (preset: PresetItem) => void;
  onOpenModal: () => void;
}

export const QuickPresetsMenu = React.memo(({ 
  presetItems, position, onApply, onOpenModal 
}: QuickPresetsMenuProps) => {
  const { language } = useLanguage();

  return (
    <div
      className={`quick-presets-menu ${position === 'centered' ? 'is-bottom' : 'is-top'}`}
      role="dialog"
      aria-label="Quick presets menu"
    >
      <div className="quick-presets-header">
        <span>{localizeText(language, CHAT_COMPOSER_UI.presets)}</span>
        <button className="quick-presets-setting-btn" onClick={onOpenModal} type="button">
          {localizeText(language, CHAT_COMPOSER_UI.setting)}
        </button>
      </div>

      <div className="quick-presets-list">
        {presetItems.length > 0 ? (
          presetItems.map((preset) => (
            <button
              className="quick-preset-item"
              key={preset.id}
              onClick={() => onApply(preset)}
              type="button"
            >
              <span className="quick-preset-trigger">{preset.triggerWord}</span>
              <span className="quick-preset-preview">{localizeText(language, preset.content)}</span>
            </button>
          ))
        ) : (
          <div className="quick-preset-empty">{localizeText(language, CHAT_COMPOSER_UI.noPresets)}</div>
        )}
      </div>
    </div>
  );
});

QuickPresetsMenu.displayName = 'QuickPresetsMenu';
