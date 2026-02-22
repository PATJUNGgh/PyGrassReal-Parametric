import React from 'react';
import { Plus, History, FilePlus } from 'lucide-react';
import { HistoryItem } from './HistoryItem';
import { ProjectFolder } from './ProjectFolder';
import type { ChatProject, HistoryItemData } from '../../types/chat.types';

interface ChatHistoryMainViewProps {
  projects: ChatProject[];
  historyItems: HistoryItemData[];
  confirmingDeleteProjectId: string | null;
  confirmingDeleteId: string | null;
  handleCreateNewProject: (e: React.MouseEvent) => void;
  handleOpenProject: (id: string) => void;
  handleDeleteProject: (e: React.MouseEvent, id: string) => void;
  handleDrop: (e: React.DragEvent, projectId: string | null) => void;
  handleNewFile: (e: React.MouseEvent | null, projectId: string | null) => void;
  handleDelete: (e: React.MouseEvent, id: string) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
}

export const ChatHistoryMainView: React.FC<ChatHistoryMainViewProps> = ({
  projects,
  historyItems,
  confirmingDeleteProjectId,
  confirmingDeleteId,
  handleCreateNewProject,
  handleOpenProject,
  handleDeleteProject,
  handleDrop,
  handleNewFile,
  handleDelete,
  handleDragStart,
}) => {
  return (
    <>
      <div className="action-section">
        <div className="drawer-title" style={{ marginBottom: '16px' }}>
          <History size={16} />
          <span>Chat History</span>
        </div>
        <div className="history-section-label">Project</div>
        <button className="new-project-btn" onClick={handleCreateNewProject} type="button">
          <Plus size={12} />
          <span>New Project</span>
        </button>

        {projects.length > 0 && (
          <div className="projects-list" style={{ marginTop: '8px' }}>
            {projects.map(project => {
              const itemCount = historyItems.filter(item => item.projectId === project.id).length;
              return (
                <ProjectFolder
                  key={project.id}
                  project={project}
                  itemCount={itemCount}
                  confirmingDeleteProjectId={confirmingDeleteProjectId}
                  onOpen={handleOpenProject}
                  onDelete={handleDeleteProject}
                  onDrop={handleDrop}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="action-section">
        <div className="history-section-label">File</div>
        <button className="new-project-btn new-file-top-btn" onClick={(e) => handleNewFile(e, null)} type="button">
          <FilePlus size={12} />
          <span>New File</span>
        </button>
      </div>

      <div className="history-list">
        <div
          className="recent-conversations-area"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, null)}
          style={{ minHeight: '50px' }}
        >
          <div className="history-section-label">Recent Conversations</div>
          {historyItems.filter(item => !item.projectId).map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              confirmingDeleteId={confirmingDeleteId}
              onDelete={handleDelete}
              onDragStart={handleDragStart}
            />
          ))}
        </div>
      </div>
    </>
  );
};
