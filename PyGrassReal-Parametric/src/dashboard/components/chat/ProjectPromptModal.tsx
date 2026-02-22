import React from 'react';
import { Modal } from '../Modal';

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
  const footer = (
    <>
      <button className="project-prompt-btn proj-cancel" onClick={onCancel} type="button">
        Cancel
      </button>
      <button className="project-prompt-btn proj-create" onClick={onSubmit} type="button">
        Create
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="New Project Name"
      footer={footer}
    >
      <input
        type="text"
        autoFocus
        className="project-prompt-input"
        placeholder="e.g. My Awesome Project"
        value={newProjectName}
        onChange={(e) => setNewProjectName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
          if (e.key === 'Escape') onCancel();
        }}
      />
    </Modal>
  );
};
