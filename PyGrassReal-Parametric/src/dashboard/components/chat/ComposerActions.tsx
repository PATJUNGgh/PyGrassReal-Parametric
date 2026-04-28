import React from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { useLanguage, localizeText } from '../../../i18n/language';
import { CHAT_COMPOSER_UI } from '../../data/chatData';

interface ComposerActionsProps {
  isGenerating: boolean;
  input: string;
  canSend?: boolean;
  onSend: () => void;
  onStop?: () => void;
}

export const ComposerActions = React.memo(({
  isGenerating,
  input,
  canSend,
  onSend,
  onStop,
}: ComposerActionsProps) => {
  const { language } = useLanguage();
  const isSendEnabled = canSend ?? Boolean((input || '').trim());

  return (
    <div className="toolbar-right">
      {isGenerating ? (
        <button
          className="composer-stop-btn"
          onClick={onStop}
          title={localizeText(language, CHAT_COMPOSER_UI.stop)}
          type="button"
        >
          <Square
            size={14}
            strokeWidth={2.2}
            fill="var(--dash-danger)"
            color="var(--dash-danger)"
          />
        </button>
      ) : (
        <button
          className={`composer-send-btn ${isSendEnabled ? 'active' : ''}`}
          onClick={onSend}
          disabled={!isSendEnabled}
          title={localizeText(language, CHAT_COMPOSER_UI.sendMessage)}
          type="button"
        >
          <span className="composer-icon-span">
            <ArrowUp size={20} strokeWidth={2.5} />
          </span>
        </button>
      )}
    </div>
  );
});

ComposerActions.displayName = 'ComposerActions';
