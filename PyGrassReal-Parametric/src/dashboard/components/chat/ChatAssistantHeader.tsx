import React from 'react';
import { FilePlus, MessageSquare } from 'lucide-react';
import { DashboardHeader } from '../DashboardHeader';
import { ModelDropdown } from './ModelDropdown';
import type { ChatModel } from './ModelDropdown';
import { localizeText, useLanguage } from '../../../i18n/language';
import { CHAT_HEADER_UI } from '../../data/chatData';
import { DASHBOARD_UI } from '../../data/dashboardData';

interface ChatAssistantHeaderProps {
  onNewChat: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  currentModel: ChatModel;
  onModelChange: (model: ChatModel) => void;
  onUpgradePlan: () => void;
}

export const ChatAssistantHeader = React.memo(({
  onNewChat,
  onToggleHistory,
  isHistoryOpen,
  currentModel,
  onModelChange,
  onUpgradePlan,
}: ChatAssistantHeaderProps) => {
  const { language } = useLanguage();

  return (
    <DashboardHeader
      rightMeta={
        <div className="dashboard-plan-meta">
          <button type="button" className="dashboard-upgrade-button" onClick={onUpgradePlan}>
            {localizeText(language, DASHBOARD_UI.upgradePlan)}
          </button>
        </div>
      }
    >
      <button
        className="header-action-btn"
        onClick={onNewChat}
        title={localizeText(language, CHAT_HEADER_UI.newChat)}
        type="button"
      >
        <div className="btn-icon-wrapper is-new">
          <FilePlus size={14} />
        </div>
        <span className="btn-label">{localizeText(language, CHAT_HEADER_UI.newFile)}</span>
      </button>

      <button
        className={`header-action-btn ${isHistoryOpen ? 'is-active' : ''}`}
        onClick={onToggleHistory}
        title={localizeText(language, CHAT_HEADER_UI.toggleHistory)}
        type="button"
      >
        <div className="btn-icon-wrapper is-chat">
          <MessageSquare size={14} />
        </div>
        <span className="btn-label">{localizeText(language, CHAT_HEADER_UI.projectChat)}</span>
      </button>

      <div className="header-model-selector">
        <ModelDropdown
          currentModel={currentModel}
          onModelChange={onModelChange}
          direction="down"
        />
      </div>
    </DashboardHeader >
  );
});

ChatAssistantHeader.displayName = 'ChatAssistantHeader';
