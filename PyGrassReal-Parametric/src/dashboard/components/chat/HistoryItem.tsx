import React from 'react';
import { MessageSquare } from 'lucide-react';
import type { HistoryItemData } from '../../types/chat.types';
import { useLanguage, localizeText } from '../../../i18n/language';
import { HistoryActionBtn } from './HistoryActionBtn';

interface HistoryItemProps {
  item: HistoryItemData;
  confirmingDeleteId: string | null;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onSelectChat: (id: string) => void;
}

const renderHistoryText = (
  language: 'th' | 'en',
  value: HistoryItemData['title'] | HistoryItemData['date'],
): string => {
  if (typeof value === 'string') {
    return value;
  }
  return localizeText(language, value);
};

export const HistoryItem = React.memo(({
  item,
  confirmingDeleteId,
  onDelete,
  onDragStart,
  onSelectChat,
}: HistoryItemProps) => {
  const { language } = useLanguage();

  return (
    <div
      className="history-item"
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
    >
      <div className="history-item-main" onClick={() => onSelectChat(item.id)} style={{ cursor: 'pointer' }}>
        <div className="history-item-icon">
          <MessageSquare size={12} />
        </div>
        <div className="history-item-info">
          <div className="history-item-title">{renderHistoryText(language, item.title)}</div>
          <div className="history-item-date">{renderHistoryText(language, item.date)}</div>
        </div>
      </div>

      <div className="history-item-actions">
        <HistoryActionBtn 
          itemId={item.id}
          confirmingId={confirmingDeleteId}
          onDelete={onDelete}
          type="conversation"
        />
      </div>
    </div>
  );
});

HistoryItem.displayName = 'HistoryItem';
