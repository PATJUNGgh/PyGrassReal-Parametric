import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import React, { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Workflow } from '../types/workflow.types';
import { formatTimestamp } from '../utils';
import { WorkflowInlineEdit } from './WorkflowInlineEdit';
import { localizeText, useLanguage } from '../../i18n/language';
import { DASHBOARD_UI, MODAL_UI, TOOLBAR_UI, WORKFLOW_CARD_UI } from '../data/dashboardData';

interface WorkflowCardProps {
  workflow: Workflow;
  onOpen: (workflow: Workflow) => void;
  onUpdateName: (workflow: Workflow, nextName: string) => Promise<void>;
  onDuplicate: (workflow: Workflow) => void;
  onDeleteRequest: (workflow: Workflow) => void;
}

const WorkflowCardPreview = ({ thumbnail }: { thumbnail?: string }) => (
  <div className="workflow-card-preview">
    {thumbnail ? (
      <img src={thumbnail} className="preview-thumbnail" alt="Captured 3D Preview" />
    ) : (
      <div className="preview-placeholder">
        <span className="preview-placeholder-text">3D-Edit Viewport</span>
      </div>
    )}
  </div>
);

export const WorkflowCard = React.memo(({
  workflow,
  onOpen,
  onUpdateName,
  onDuplicate,
  onDeleteRequest,
}: WorkflowCardProps) => {
  const { language } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(workflow.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuPopoverRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const updateMenuPosition = useCallback(() => {
    const triggerEl = menuTriggerRef.current;
    if (!triggerEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const popoverEl = menuPopoverRef.current;
    const popoverWidth = popoverEl?.offsetWidth ?? 178;
    const popoverHeight = popoverEl?.offsetHeight ?? 140;
    const gap = 8;
    const viewportPadding = 8;

    let left = triggerRect.right - popoverWidth;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - popoverWidth - viewportPadding));

    let top = triggerRect.bottom + gap;
    if (top + popoverHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, triggerRect.top - popoverHeight - gap);
    }

    setMenuPosition((prev) => {
      if (Math.abs(prev.top - top) < 0.5 && Math.abs(prev.left - left) < 0.5) return prev;
      return { top, left };
    });
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) return;
    updateMenuPosition();
    const rafId = window.requestAnimationFrame(updateMenuPosition);
    return () => window.cancelAnimationFrame(rafId);
  }, [menuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuWrapRef.current?.contains(target)) return;
      if (menuPopoverRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    const reposition = () => updateMenuPosition();

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [menuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isEditing) setDraftName(workflow.name);
  }, [workflow.name, isEditing]);

  const handleCardClick = useCallback(() => {
    if (!isEditing) onOpen(workflow);
  }, [isEditing, onOpen, workflow]);

  const handleCardKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (!isEditing && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onOpen(workflow);
    }
  }, [isEditing, onOpen, workflow]);

  const handleSaveName = useCallback(async () => {
    const nextName = draftName.trim();
    if (!nextName || nextName === workflow.name) {
      setIsEditing(false);
      return;
    }

    setIsSavingName(true);
    try {
      await onUpdateName(workflow, nextName);
      setIsEditing(false);
    } finally {
      setIsSavingName(false);
    }
  }, [draftName, workflow, onUpdateName]);

  const handleMenuAction = useCallback((action: () => void) => {
    setMenuOpen(false);
    action();
  }, []);

  const menuActions = useMemo(() => [
    {
      label: localizeText(language, WORKFLOW_CARD_UI.editName),
      icon: Pencil,
      onClick: () => setIsEditing(true),
    },
    {
      label: localizeText(language, WORKFLOW_CARD_UI.duplicate),
      icon: Copy,
      onClick: () => onDuplicate(workflow),
    },
    {
      label: localizeText(language, MODAL_UI.delete),
      icon: Trash2,
      onClick: () => onDeleteRequest(workflow),
      className: 'is-danger'
    },
  ], [language, workflow, onDuplicate, onDeleteRequest]);

  return (
    <article
      className={`workflow-card ${menuOpen ? 'is-menu-open' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-label={`Open ${workflow.name}`}
    >
      <WorkflowCardPreview thumbnail={workflow.definition?.thumbnail} />

      <div className="workflow-card-body">
        <header className="workflow-card-header">
          <div className="workflow-card-title-block">
            {isEditing ? (
              <WorkflowInlineEdit
                draftName={draftName}
                isSaving={isSavingName}
                onNameChange={setDraftName}
                onSave={handleSaveName}
                onCancel={() => { setIsEditing(false); setDraftName(workflow.name); }}
              />
            ) : (
              <>
                <h3>{workflow.name}</h3>
                <div className="workflow-card-meta">
                  <span>
                    {localizeText(language, DASHBOARD_UI.editedPrefix)} {formatTimestamp(workflow.updated_at, language)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="workflow-card-actions">
            <div className="workflow-menu" ref={menuWrapRef}>
              <button
                ref={menuTriggerRef}
                type="button"
                className="workflow-menu-trigger"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
                aria-label={`Open workflow actions for ${workflow.name}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={`workflow-actions-${workflow.id}`}
              >
                <MoreHorizontal size={16} />
              </button>
              
              {menuOpen && createPortal(
                <div
                  ref={menuPopoverRef}
                  id={`workflow-actions-${workflow.id}`}
                  role="menu"
                  className="workflow-menu-popover"
                  style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {menuActions.map((action, index) => (
                    <button
                      key={index}
                      type="button"
                      role="menuitem"
                      className={action.className}
                      onClick={() => handleMenuAction(action.onClick)}
                    >
                      <action.icon size={14} />
                      {action.label}
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
          </div>
        </header>

        <div className="workflow-card-badges">
          <span className="workflow-badge">{localizeText(language, TOOLBAR_UI.owner)}</span>
          <span className="workflow-badge is-muted">
            {workflow.owner_id ? localizeText(language, TOOLBAR_UI.ownerPersonal) : localizeText(language, TOOLBAR_UI.ownerUnassigned)}
          </span>
        </div>
      </div>
    </article>
  );
});

WorkflowCard.displayName = 'WorkflowCard';
