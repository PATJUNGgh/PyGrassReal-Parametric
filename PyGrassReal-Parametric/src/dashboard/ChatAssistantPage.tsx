import React from 'react';
import { ChatLayout } from './components/chat/ChatLayout';
import { ChatEmptyState } from './components/chat/ChatEmptyState';
import { ChatMessageList } from './components/chat/ChatMessageList';
import ChatComposer from './components/chat/ChatComposer';
import { useChatAssistant } from './hooks/useChatAssistant';
import { ChatAssistantHeader } from './components/chat/ChatAssistantHeader';
import { ChatHistoryDrawer } from './components/chat/ChatHistoryDrawer';
import './ChatAssistantPage.css';

interface ChatAssistantPageProps {
  onUpgradePlan: () => void;
}

export const ChatAssistantPage: React.FC<ChatAssistantPageProps> = ({ onUpgradePlan }) => {
  const {
    messages,
    isGenerating,
    isHistoryOpen,
    currentModel,
    setCurrentModel,
    handleSend,
    handleStop,
    handleNewChat,
    toggleHistory,
    isEmpty,
  } = useChatAssistant();

  return (
    <div className="chat-page-root">
      <div className="chat-header-container">
        <ChatAssistantHeader
          onNewChat={handleNewChat}
          onToggleHistory={toggleHistory}
          isHistoryOpen={isHistoryOpen}
          currentModel={currentModel}
          onModelChange={setCurrentModel}
          onUpgradePlan={onUpgradePlan}
        />
      </div>

      <ChatHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={toggleHistory}
        onNewProject={handleNewChat}
      />

      <ChatLayout>
        {isEmpty ? (
          <ChatEmptyState />
        ) : (
          <ChatMessageList messages={messages} isGenerating={isGenerating} />
        )}

        <div className={`chat-composer-sticky ${isEmpty ? 'centered' : 'bottom'}`}>
          <ChatComposer
            onSend={handleSend}
            onStop={handleStop}
            isGenerating={isGenerating}
            position={isEmpty ? 'centered' : 'bottom'}
          />
        </div>
      </ChatLayout>
    </div>
  );
};
