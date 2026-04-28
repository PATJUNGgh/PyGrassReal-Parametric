import React from 'react';
import { Folder } from 'lucide-react';
import type { ChatProject } from '../../types/chat.types';
import { localizeText, useLanguage } from '../../../i18n/language';
import { CHAT_HISTORY_UI } from '../../data/chatData';
import { HistoryActionBtn } from './HistoryActionBtn';

interface ProjectFolderProps {
  project: ChatProject;
  itemCount: number;
  confirmingDeleteProjectId: string | null;
  onOpen: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}

export const ProjectFolder = React.memo(({
  project,
  itemCount,
  confirmingDeleteProjectId,
  onOpen,
  onDelete,
  onDrop,
}: ProjectFolderProps) => {
  const { language } = useLanguage();

  return (
    <div
      className="project-folder"
      onClick={() => onOpen(project.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, project.id)}
    >
      <div className="project-folder-header">
        <div className="project-folder-title">
          <Folder size={12} className="folder-icon-accent" />
          <span>{project.name}</span>
          <span className="project-item-count">{localizeText(language, CHAT_HISTORY_UI.filesCount(itemCount))}</span>
        </div>
        <div className="project-folder-actions">
          <HistoryActionBtn 
            itemId={project.id}
            confirmingId={confirmingDeleteProjectId}
            onDelete={onDelete}
            type="project"
          />
        </div>
      </div>
    </div>
  );
});

ProjectFolder.displayName = 'ProjectFolder';
