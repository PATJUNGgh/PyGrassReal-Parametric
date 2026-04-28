import React from 'react';
import { Modal } from '../Modal';
import { localizeText, useLanguage } from '../../../i18n/language';
import { CHAT_HISTORY_UI, CHAT_LIMITS } from '../../data/chatData';
import { MODAL_UI } from '../../data/dashboardData';

interface ProjectPromptModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  newProjectName: string;
  setNewProjectName: (name: string) => void;
}

export const ProjectPromptModal: React.FC<ProjectPromptModalProps> = ({
  isOpen,
  onCancel,
  onSubmit,
  newProjectName,
  setNewProjectName,
}) => {
  const { language } = useLanguage();

  const footer = (
    <>
      <button className="project-prompt-btn proj-cancel" onClick={onCancel} type="button">
        {localizeText(language, MODAL_UI.cancel)}
      </button>
      <button 
        className="project-prompt-btn proj-create" 
        onClick={onSubmit} 
        type="button"
        disabled={!newProjectName.trim()}
      >
        {localizeText(language, MODAL_UI.create)}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={localizeText(language, CHAT_HISTORY_UI.newProjectTitle)}
      footer={footer}
    >
      <input
        type="text"
        autoFocus
        className="project-prompt-input"
        placeholder={localizeText(language, CHAT_HISTORY_UI.newProjectPlaceholder)}
        value={newProjectName}
        onChange={(e) => setNewProjectName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && newProjectName.trim()) onSubmit();
          if (e.key === 'Escape') onCancel();
        }}
        maxLength={CHAT_LIMITS.PROJECT_NAME_MAX_LENGTH}
      />
    </Modal>
  );
};
