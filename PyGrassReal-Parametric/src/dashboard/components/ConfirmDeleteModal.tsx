import type { Workflow } from '../types/workflow.types';
import { Modal } from './Modal';

interface ConfirmDeleteModalProps {
  workflow: Workflow | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmDeleteModal({
  workflow,
  isDeleting,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!workflow) return null;

  const footer = (
    <>
      <button type="button" className="is-secondary" onClick={onClose} disabled={isDeleting}>
        Cancel
      </button>
      <button type="button" className="is-danger" onClick={onConfirm} disabled={isDeleting}>
        {isDeleting ? 'Deleting...' : 'Delete workflow'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={!!workflow}
      onClose={onClose}
      title="Delete workflow"
      footer={footer}
    >
      <p>
        Delete <strong>{workflow.name}</strong>? This action cannot be undone.
      </p>
    </Modal>
  );
}
