import React from 'react';
import { X } from 'lucide-react';
import { ChatHistoryMainView } from './ChatHistoryMainView';
import { ChatHistoryProjectView } from './ChatHistoryProjectView';
import { ProjectPromptModal } from './ProjectPromptModal';
import { useChatHistory } from '../../hooks/useChatHistory';
import './ChatHistoryDrawer.css';

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNewProject: () => void;
}

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    confirmingDeleteId,
    confirmingDeleteProjectId,
    activeProjectId,
    isPromptOpen,
    newProjectName,
    setNewProjectName,
    projects,
    historyItems,
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
  } = useChatHistory();

  if (!isOpen) return null;

  const activeProject = projects.find(p => p.id === activeProjectId);
  const projectItems = historyItems.filter(item => item.projectId === activeProjectId);

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
            {!activeProjectId ? (
              <ChatHistoryMainView
                projects={projects}
                historyItems={historyItems}
                confirmingDeleteProjectId={confirmingDeleteProjectId}
                confirmingDeleteId={confirmingDeleteId}
                handleCreateNewProject={handleCreateNewProject}
                handleOpenProject={handleOpenProject}
                handleDeleteProject={handleDeleteProject}
                handleDrop={handleDrop}
                handleNewFile={handleNewFile}
                handleDelete={handleDelete}
                handleDragStart={handleDragStart}
              />
            ) : activeProject ? (
              <ChatHistoryProjectView
                activeProject={activeProject}
                projectItems={projectItems}
                confirmingDeleteId={confirmingDeleteId}
                handleBackToMain={handleBackToMain}
                handleNewFile={handleNewFile}
                handleDrop={handleDrop}
                handleDelete={handleDelete}
                handleDragStart={handleDragStart}
              />
            ) : null}
          </div>

          <div className="drawer-footer">
            <div className="footer-status">
              Connected to PyGrass Real-Time Engine
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
};
