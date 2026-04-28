import React from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage, localizeText } from '../../../i18n/language';
import { CHAT_HISTORY_UI } from '../../data/chatData';

interface HistoryActionBtnProps {
  itemId: string;
  confirmingId: string | null;
  onDelete: (e: React.MouseEvent, id: string) => void;
  type: 'conversation' | 'project';
}

export const HistoryActionBtn = React.memo(({
  itemId,
  confirmingId,
  onDelete,
  type
}: HistoryActionBtnProps) => {
  const { language } = useLanguage();
  const isConfirming = confirmingId === itemId;
  const deleteTitle = type === 'conversation' 
    ? CHAT_HISTORY_UI.deleteConversation 
    : CHAT_HISTORY_UI.deleteProject;

  return (
    <button
      className={`action-btn delete-btn ${isConfirming ? 'confirming' : ''}`}
      onClick={(e) => onDelete(e, itemId)}
      title={localizeText(language, isConfirming 
        ? CHAT_HISTORY_UI.confirmDeleteHint 
        : deleteTitle)}
      type="button"
    >
      {isConfirming ? (
        <span className="confirm-text">{localizeText(language, CHAT_HISTORY_UI.confirmDelete)}</span>
      ) : (
        <Trash2 size={type === 'conversation' ? 14 : 12} />
      )}
    </button>
  );
});

HistoryActionBtn.displayName = 'HistoryActionBtn';
