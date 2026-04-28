import React from 'react';
import { X } from 'lucide-react';
import { ChatHistoryMainView } from './ChatHistoryMainView';
import { ChatHistoryProjectView } from './ChatHistoryProjectView';
import { ProjectPromptModal } from './ProjectPromptModal';
import { useChatHistory } from '../../hooks/useChatHistory';
import { localizeText, useLanguage } from '../../../i18n/language';
import { CHAT_HISTORY_UI } from '../../data/chatData';
import './ChatHistoryDrawer.css';

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNewProject: () => void;
  onSelectChat: (id: string) => void;
  pushToast?: (message: string, tone?: 'success' | 'error') => void;
  getErrorMessage?: (error: unknown) => string;
}

export const ChatHistoryDrawer = React.memo(({
  isOpen,
  onClose,
  onNewProject,
  onSelectChat,
  pushToast,
  getErrorMessage
}: ChatHistoryDrawerProps) => {
  const { language } = useLanguage();
  const {
    confirmingDeleteId,
    confirmingDeleteProjectId,
    activeProjectId,
    activeProject,
    projectItems,
    recentItems,
    isPromptOpen,
    newProjectName,
    setNewProjectName,
    projects,
    historyItems,
    projectItemCounts,
    handleDelete,
    handleDeleteProject,
    handleNewFile,
    handleCreateNewProject,
    submitNewProject,
    cancelNewProject,
    handleDragStart,
    handleDrop,
    handleOpenProject,
    handleBackToMain,
  } = useChatHistory({ pushToast, getErrorMessage, isOpen });

  if (!isOpen) return null;

  const isProjectView = !!(activeProjectId && activeProject);

  return (
    <>
      <div className="chat-history-overlay" onClick={onClose}>
        <div className="chat-history-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <button className="drawer-close" onClick={onClose} type="button">
              <X size={20} />
            </button>
          </div>

          <div className="drawer-content">
            {isProjectView ? (
              <ChatHistoryProjectView
                activeProject={activeProject}
                projectItems={projectItems}
                confirmingDeleteId={confirmingDeleteId}
                handleBackToMain={handleBackToMain}
                handleNewFile={handleNewFile}
                handleDrop={handleDrop}
                handleDelete={handleDelete}
                handleDragStart={handleDragStart}
                onSelectChat={onSelectChat}
              />
            ) : (
              <ChatHistoryMainView
                projects={projects}
                historyItems={historyItems}
                recentItems={recentItems}
                projectItemCounts={projectItemCounts}
                confirmingDeleteProjectId={confirmingDeleteProjectId}
                confirmingDeleteId={confirmingDeleteId}
                handleCreateNewProject={handleCreateNewProject}
                handleOpenProject={handleOpenProject}
                handleDeleteProject={handleDeleteProject}
                handleDrop={handleDrop}
                handleNewFile={handleNewFile}
                handleDelete={handleDelete}
                handleDragStart={handleDragStart}
                onSelectChat={onSelectChat}
              />
            )}
          </div>

          <div className="drawer-footer">
            <div className="footer-status">
              {localizeText(language, CHAT_HISTORY_UI.footerStatus)}
            </div>
          </div>
        </div>
      </div>

      <ProjectPromptModal
        isOpen={isPromptOpen}
        onCancel={cancelNewProject}
        onSubmit={submitNewProject}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
      />
    </>
  );
});

ChatHistoryDrawer.displayName = 'ChatHistoryDrawer';
