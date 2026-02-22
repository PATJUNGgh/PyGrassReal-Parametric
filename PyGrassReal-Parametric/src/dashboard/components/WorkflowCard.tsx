import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import React, { useEffect, useState, type KeyboardEvent } from 'react';
import type { Workflow, WorkflowStatus } from '../types/workflow.types';
import { formatTimestamp } from '../utils';
import { useClickOutside } from '../hooks/useClickOutside';
import { WorkflowInlineEdit } from './WorkflowInlineEdit';

interface WorkflowCardProps {
  workflow: Workflow;
  onOpen: (workflow: Workflow) => void;
  onToggleStatus: (workflow: Workflow, nextStatus: WorkflowStatus) => void;
  onUpdateName: (workflow: Workflow, nextName: string) => Promise<void>;
  onDuplicate: (workflow: Workflow) => void;
  onDeleteRequest: (workflow: Workflow) => void;
}

export const WorkflowCard = React.memo(({
  workflow,
  onOpen,
  onUpdateName,
  onDuplicate,
  onDeleteRequest,
}: WorkflowCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(workflow.name);
  const [isSavingName, setIsSavingName] = useState(false);

  // Use hook to handle closing menu when clicking outside
  const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false));

  useEffect(() => {
    if (!isEditing) {
      setDraftName(workflow.name);
    }
  }, [workflow.name, isEditing]);

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(workflow);
    }
  };

  const saveName = async () => {
    const nextName = draftName.trim();
    if (!nextName || nextName === workflow.name) {
      setIsEditing(false);
      return;
    }

    setIsSavingName(true);
    try {
      await onUpdateName(workflow, nextName);
      setIsEditing(false);
      setMenuOpen(false);
    } finally {
      setIsSavingName(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraftName(workflow.name);
  };

  return (
    <article
      className="workflow-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(workflow)}
      onKeyDown={handleCardKeyDown}
      aria-label={`Open ${workflow.name}`}
    >
      <div className="workflow-card-preview">
        {workflow.definition?.thumbnail ? (
          <img
            src={workflow.definition.thumbnail}
            className="preview-thumbnail"
            alt="Captured 3D Preview"
          />
        ) : (
          <div className="preview-placeholder">
            <span className="preview-placeholder-text">3D-Edit Viewport</span>
          </div>
        )}
      </div>

      <div className="workflow-card-body">
        <header className="workflow-card-header">
          <div className="workflow-card-title-block">
            {isEditing ? (
              <WorkflowInlineEdit
                draftName={draftName}
                isSaving={isSavingName}
                onNameChange={setDraftName}
                onSave={saveName}
                onCancel={cancelEdit}
              />
            ) : (
              <>
                <h3>{workflow.name}</h3>
                <div className="workflow-card-meta">
                  <span>Edited {formatTimestamp(workflow.updated_at)}</span>
                </div>
              </>
            )}
          </div>

          <div className="workflow-card-actions">
            <div className="workflow-menu" ref={menuRef}>
              <button
                type="button"
                className="workflow-menu-trigger"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                aria-label={`Open workflow actions for ${workflow.name}`}
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div className="workflow-menu-popover" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Pencil size={14} />
                    Edit name
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicate(workflow);
                      setMenuOpen(false);
                    }}
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() => {
                      onDeleteRequest(workflow);
                      setMenuOpen(false);
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="workflow-card-badges">
          <span className="workflow-badge">Owner</span>
          <span className="workflow-badge is-muted">
            {workflow.owner_id ? 'Personal' : 'Unassigned'}
          </span>
        </div>
      </div>
    </article>
  );
});

WorkflowCard.displayName = 'WorkflowCard';
