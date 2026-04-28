import React from 'react';
import { localizeText, useLanguage } from '../../i18n/language';
import { MODAL_UI } from '../data/dashboardData';

interface WorkflowInlineEditProps {
  draftName: string;
  isSaving: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const WorkflowInlineEdit: React.FC<WorkflowInlineEditProps> = ({
  draftName,
  isSaving,
  onNameChange,
  onSave,
  onCancel,
}) => {
  const { language } = useLanguage();

  const handleAction = (e: React.MouseEvent | React.KeyboardEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className="workflow-inline-edit" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={draftName}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAction(e, onSave);
          if (e.key === 'Escape') handleAction(e, onCancel);
        }}
        aria-label="Workflow name"
        autoFocus
        disabled={isSaving}
        maxLength={100}
      />
      <button 
        type="button" 
        onClick={(e) => handleAction(e, onSave)} 
        disabled={isSaving}
      >
        {isSaving ? localizeText(language, MODAL_UI.saving) : localizeText(language, MODAL_UI.save)}
      </button>
      <button
        type="button"
        onClick={(e) => handleAction(e, onCancel)}
        disabled={isSaving}
      >
        {localizeText(language, MODAL_UI.cancel)}
      </button>
    </div>
  );
};
