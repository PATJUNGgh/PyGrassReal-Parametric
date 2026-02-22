import React from 'react';
import { FilePlus, MessageSquare } from 'lucide-react';
import { DashboardHeader } from '../DashboardHeader';
import { ModelDropdown } from './ModelDropdown';
import type { ChatModel } from './ModelDropdown';

interface ChatAssistantHeaderProps {
  onNewChat: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  currentModel: ChatModel;
  onModelChange: (model: ChatModel) => void;
  onUpgradePlan: () => void;
}

export const ChatAssistantHeader: React.FC<ChatAssistantHeaderProps> = ({
  onNewChat,
  onToggleHistory,
  isHistoryOpen,
  currentModel,
  onModelChange,
  onUpgradePlan,
}) => {
  return (
    <DashboardHeader
      rightMeta={(
        <div className="dashboard-plan-meta">
          <button type="button" className="dashboard-upgrade-button" onClick={onUpgradePlan}>
            Upgrade plan
          </button>
        </div>
      )}
    >
      <button
        className="header-action-btn"
        onClick={onNewChat}
        title="Start a new conversation"
        type="button"
      >
        <div className="btn-icon-wrapper is-new">
          <FilePlus size={14} />
        </div>
        <span className="btn-label">New File</span>
      </button>

      <button
        className={`header-action-btn ${isHistoryOpen ? 'is-active' : ''}`}
        onClick={onToggleHistory}
        title="Toggle Chat History"
        type="button"
      >
        <div className="btn-icon-wrapper is-chat">
          <MessageSquare size={14} />
        </div>
        <span className="btn-label">Project Chat</span>
      </button>

      <div className="header-model-selector">
        <ModelDropdown
          currentModel={currentModel}
          onModelChange={onModelChange}
          direction="down"
        />
      </div>
    </DashboardHeader>
  );
};
