import React from 'react';
import type { Workflow } from '../types/workflow.types';
import Modal from './Modal';
import { localizeText, useLanguage } from '../../i18n/language';
import { MODAL_UI } from '../data/dashboardData';

interface ConfirmDeleteModalProps {
  workflow: Workflow | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ConfirmDeleteModal = React.memo(({
  workflow,
  isDeleting,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) => {
  const { language } = useLanguage();
  if (!workflow) return null;

  const footer = (
    <>
      <button type="button" className="is-secondary" onClick={onClose} disabled={isDeleting}>
        {localizeText(language, MODAL_UI.cancel)}
      </button>
      <button type="button" className="is-danger" onClick={onConfirm} disabled={isDeleting}>
        {localizeText(language, isDeleting ? MODAL_UI.deleting : MODAL_UI.delete)}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={!!workflow}
      onClose={onClose}
      title={localizeText(language, MODAL_UI.deleteTitle)}
      footer={footer}
    >
      <p>
        {localizeText(language, MODAL_UI.deleteConfirm(workflow.name))}
      </p>
    </Modal>
  );
});

ConfirmDeleteModal.displayName = 'ConfirmDeleteModal';
