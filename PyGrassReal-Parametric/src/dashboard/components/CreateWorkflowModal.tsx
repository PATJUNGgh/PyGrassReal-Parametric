import React, { useState, useEffect, type FormEvent } from 'react';
import Modal from './Modal';
import { localizeText, useLanguage } from '../../i18n/language';
import { MODAL_UI } from '../data/dashboardData';

interface CreateWorkflowModalProps {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export const CreateWorkflowModal = React.memo(({
  open,
  isSubmitting,
  onClose,
  onCreate,
}: CreateWorkflowModalProps) => {
  const { language } = useLanguage();
  const [name, setName] = useState('');

  // Reset name when modal opens
  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    await onCreate(trimmedName);
  };

  const footer = (
    <>
      <button type="button" className="is-secondary" onClick={onClose} disabled={isSubmitting}>
        {localizeText(language, MODAL_UI.cancel)}
      </button>
      <button 
        type="submit" 
        form="create-workflow-form" 
        className="is-primary" 
        disabled={isSubmitting || !name.trim()}
      >
        {isSubmitting ? localizeText(language, MODAL_UI.creating) : localizeText(language, MODAL_UI.create)}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={localizeText(language, MODAL_UI.createTitle)}
      footer={footer}
    >
      <p>{localizeText(language, MODAL_UI.createSubtitle)}</p>
      <form id="create-workflow-form" onSubmit={handleSubmit}>
        <label htmlFor="workflow-name">{localizeText(language, MODAL_UI.workflowNameLabel)}</label>
        <input
          id="workflow-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={localizeText(language, MODAL_UI.placeholder)}
          autoFocus
          maxLength={100}
        />
      </form>
    </Modal>
  );
});

CreateWorkflowModal.displayName = 'CreateWorkflowModal';
