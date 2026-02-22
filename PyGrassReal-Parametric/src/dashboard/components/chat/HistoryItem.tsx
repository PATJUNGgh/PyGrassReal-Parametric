import React from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import type { HistoryItemData } from '../../types/chat.types';

interface HistoryItemProps {
  item: HistoryItemData;
  confirmingDeleteId: string | null;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({
  item,
  confirmingDeleteId,
  onDelete,
  onDragStart,
}) => {
  return (
    <div
      className="history-item"
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
    >
      <div className="history-item-main">
        <div className="history-item-icon">
          <MessageSquare size={12} />
        </div>
        <div className="history-item-info">
          <div className="history-item-title">{item.title}</div>
          <div className="history-item-date">{item.date}</div>
        </div>
      </div>

      <div className="history-item-actions">
        <button
          className={`action-btn delete-btn ${confirmingDeleteId === item.id ? 'confirming' : ''}`}
          onClick={(e) => onDelete(e, item.id)}
          title={confirmingDeleteId === item.id ? 'Click again to confirm' : 'Delete conversation'}
          type="button"
        >
          {confirmingDeleteId === item.id ? (
            <span className="confirm-text">Confirm</span>
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      </div>
    </div>
  );
};
