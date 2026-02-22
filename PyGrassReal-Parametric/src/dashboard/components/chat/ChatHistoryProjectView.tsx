import React from 'react';
import { ChevronLeft, FilePlus } from 'lucide-react';
import { HistoryItem } from './HistoryItem';
import { ProjectFolder } from './ProjectFolder';
import type { ChatProject, HistoryItemData } from '../../types/chat.types';

interface ChatHistoryProjectViewProps {
  activeProject: ChatProject;
  projectItems: HistoryItemData[];
  confirmingDeleteId: string | null;
  handleBackToMain: () => void;
  handleNewFile: (e: React.MouseEvent | null, projectId: string | null) => void;
  handleDrop: (e: React.DragEvent, projectId: string | null) => void;
  handleDelete: (e: React.MouseEvent, id: string) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
}

export const ChatHistoryProjectView: React.FC<ChatHistoryProjectViewProps> = ({
  activeProject,
  projectItems,
  confirmingDeleteId,
  handleBackToMain,
  handleNewFile,
  handleDrop,
  handleDelete,
  handleDragStart,
}) => {
  return (
    <>
      <div className="project-view-header">
        <button className="back-btn" onClick={handleBackToMain} type="button">
          <ChevronLeft size={16} />
        </button>
        <div className="project-view-title">
          <ProjectFolder
            project={activeProject}
            itemCount={projectItems.length}
            confirmingDeleteProjectId={null}
            onOpen={() => {}}
            onDelete={() => {}}
            onDrop={() => {}}
          />
        </div>
      </div>

      <div className="action-section">
        <button 
          className="new-project-btn new-file-top-btn" 
          onClick={(e) => handleNewFile(e, activeProject.id)} 
          type="button"
        >
          <FilePlus size={12} />
          <span>New File</span>
        </button>
      </div>

      <div className="history-list">
        <div
          className="recent-conversations-area"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, activeProject.id)}
          style={{ minHeight: '80px' }}
        >
          {projectItems.length === 0 ? (
            <div className="project-empty-state">
              <p>No files yet.</p>
              <p className="project-empty-hint">Create a new file or drag conversations here.</p>
            </div>
          ) : (
            projectItems.map(item => (
              <HistoryItem
                key={item.id}
                item={item}
                confirmingDeleteId={confirmingDeleteId}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};
