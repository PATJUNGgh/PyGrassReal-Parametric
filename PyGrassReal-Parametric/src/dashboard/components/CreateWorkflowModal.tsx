import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';

interface CreateWorkflowModalProps {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateWorkflowModal({
  open,
  isSubmitting,
  onClose,
  onCreate,
}: CreateWorkflowModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    await onCreate(trimmedName);
  };

  const footer = (
    <>
      <button type="button" className="is-secondary" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </button>
      <button 
        type="submit" 
        form="create-workflow-form" 
        className="is-primary" 
        disabled={isSubmitting || !name.trim()}
      >
        {isSubmitting ? 'Creating...' : 'Create workflow'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Create workflow"
      footer={footer}
    >
      <p>Set a clear name, then open it in the editor.</p>
      <form id="create-workflow-form" onSubmit={handleSubmit}>
        <label htmlFor="workflow-name">Workflow name</label>
        <input
          id="workflow-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Summer campaign automation"
          autoFocus
        />
      </form>
    </Modal>
  );
}
