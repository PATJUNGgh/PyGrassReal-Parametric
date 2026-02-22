import React from 'react';
import { Folder, Trash2 } from 'lucide-react';
import type { ChatProject } from '../../types/chat.types';

interface ProjectFolderProps {
  project: ChatProject;
  itemCount: number;
  confirmingDeleteProjectId: string | null;
  onOpen: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}

export const ProjectFolder: React.FC<ProjectFolderProps> = ({
  project,
  itemCount,
  confirmingDeleteProjectId,
  onOpen,
  onDelete,
  onDrop,
}) => {
  return (
    <div
      className="project-folder"
      onClick={() => onOpen(project.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, project.id)}
    >
      <div className="project-folder-header">
        <div className="project-folder-title">
          <Folder size={12} style={{ color: '#bae6fd' }} />
          <span>{project.name}</span>
          <span className="project-item-count">{itemCount} files</span>
        </div>
        <div className="project-folder-actions">
          <button
            className={`action-btn delete-btn project-delete-btn ${confirmingDeleteProjectId === project.id ? 'confirming' : ''}`}
            onClick={(e) => onDelete(e, project.id)}
            title={confirmingDeleteProjectId === project.id ? 'Click again to confirm' : 'Delete project'}
            type="button"
          >
            {confirmingDeleteProjectId === project.id ? (
              <span className="confirm-text">Confirm</span>
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
