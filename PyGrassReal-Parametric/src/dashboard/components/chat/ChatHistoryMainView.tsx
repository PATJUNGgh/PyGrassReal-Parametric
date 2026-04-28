import React from 'react';
import { Plus, History, FilePlus } from 'lucide-react';
import { HistoryItem } from './HistoryItem';
import { ProjectFolder } from './ProjectFolder';
import type { ChatProject, HistoryItemData } from '../../types/chat.types';
import { localizeText, useLanguage } from '../../../i18n/language';
import { CHAT_HISTORY_UI } from '../../data/chatData';

interface ChatHistoryMainViewProps {
  projects: ChatProject[];
  historyItems: HistoryItemData[];
  recentItems: HistoryItemData[];
  projectItemCounts: Record<string, number>;
  confirmingDeleteProjectId: string | null;
  confirmingDeleteId: string | null;
  handleCreateNewProject: (e: React.MouseEvent) => void;
  handleOpenProject: (id: string) => void;
  handleDeleteProject: (e: React.MouseEvent, id: string) => void;
  handleDrop: (e: React.DragEvent, projectId: string | null) => void;
  handleNewFile: (e: React.MouseEvent | null, projectId: string | null) => void;
  handleDelete: (e: React.MouseEvent, id: string) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  onSelectChat: (id: string) => void;
}

export const ChatHistoryMainView = React.memo(({
  projects,
  historyItems,
  recentItems,
  projectItemCounts,
  confirmingDeleteProjectId,
  confirmingDeleteId,
  handleCreateNewProject,
  handleOpenProject,
  handleDeleteProject,
  handleDrop,
  handleNewFile,
  handleDelete,
  handleDragStart,
  onSelectChat,
}: ChatHistoryMainViewProps) => {
  const { language } = useLanguage();

  return (
    <>
      <div className="action-section">
        <div className="drawer-title drawer-title-spacer">
          <History size={16} />
          <span>{localizeText(language, CHAT_HISTORY_UI.title)}</span>
        </div>
        <div className="history-section-label">{localizeText(language, CHAT_HISTORY_UI.projectSection)}</div>
        <button className="new-project-btn" onClick={handleCreateNewProject} type="button">
          <Plus size={12} />
          <span>{localizeText(language, CHAT_HISTORY_UI.newProject)}</span>
        </button>

        {projects.length > 0 && (
          <div className="projects-list projects-list-spacer">
            {projects.map(project => (
              <ProjectFolder
                key={project.id}
                project={project}
                itemCount={projectItemCounts[project.id] || 0}
                confirmingDeleteProjectId={confirmingDeleteProjectId}
                onOpen={handleOpenProject}
                onDelete={handleDeleteProject}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>

      <div className="action-section">
        <div className="history-section-label">{localizeText(language, CHAT_HISTORY_UI.fileSection)}</div>
        <button className="new-project-btn new-file-top-btn" onClick={(e) => handleNewFile(e, null)} type="button">
          <FilePlus size={12} />
          <span>{localizeText(language, CHAT_HISTORY_UI.newFile)}</span>
        </button>
      </div>

      <div className="history-list">
        <div
          className="recent-conversations-area recent-conversations-area-main"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, null)}
        >
          <div className="history-section-label">{localizeText(language, CHAT_HISTORY_UI.recentConversations)}</div>
          {recentItems.map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              confirmingDeleteId={confirmingDeleteId}
              onDelete={handleDelete}
              onDragStart={handleDragStart}
              onSelectChat={onSelectChat}
            />
          ))}
        </div>
      </div>
    </>
  );
});

ChatHistoryMainView.displayName = 'ChatHistoryMainView';
