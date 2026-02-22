import React from 'react';

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
  return (
    <div className="workflow-inline-edit" onClick={(event) => event.stopPropagation()}>
      <input
        type="text"
        value={draftName}
        onChange={(event) => onNameChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSave();
          if (event.key === 'Escape') onCancel();
        }}
        aria-label="Workflow name"
        autoFocus
        disabled={isSaving}
      />
      <button 
        type="button" 
        onClick={(e) => { e.stopPropagation(); onSave(); }} 
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCancel();
        }}
        disabled={isSaving}
      >
        Cancel
      </button>
    </div>
  );
};
