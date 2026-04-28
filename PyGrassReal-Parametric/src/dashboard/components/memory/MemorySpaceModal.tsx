import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMemorySpace } from '../../hooks/useMemorySpace';
import './memory-space.css';

interface MemorySpaceModalProps {
  title: string;
  description: string;
  toggleLabel: string;
  loadingLabel: string;
  emptyLabel: string;
  deleteLabel: string;
  deleteConfirmLabel: string;
  onClose: () => void;
}

const formatTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toLocaleString();
};

export function MemorySpaceModal({
  title,
  description,
  toggleLabel,
  loadingLabel,
  emptyLabel,
  deleteLabel,
  deleteConfirmLabel,
  onClose,
}: MemorySpaceModalProps) {
  const { memories, isLoading, memoryEnabled, toggleMemory, deleteMemory } = useMemorySpace();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleToggleMemory = useCallback(() => {
    void toggleMemory();
  }, [toggleMemory]);

  const handleDeleteMemory = useCallback((id: string) => {
    if (pendingDeleteId === id) {
      setPendingDeleteId(null);
      void deleteMemory(id);
      return;
    }
    setPendingDeleteId(id);
  }, [deleteMemory, pendingDeleteId]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const hasMemories = memories.length > 0;
  const memoryRows = useMemo(
    () =>
      memories.map((memory) => ({
        ...memory,
        createdAtText: formatTimestamp(memory.created_at),
      })),
    [memories]
  );

  return (
    <div className="memory-space-overlay" role="presentation" onClick={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}>
      <section className="memory-space-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="memory-space-header">
          <h2>{title}</h2>
          <button type="button" className="memory-space-close" onClick={onClose} aria-label="Close memory space">
            <span className="memory-space-close-glyph" aria-hidden="true">×</span>
          </button>
        </header>

        <p className="memory-space-description">{description}</p>

        <div className="memory-space-toggle-row">
          <span>{toggleLabel}</span>
          <label className="memory-space-toggle" aria-label={toggleLabel}>
            <input type="checkbox" checked={memoryEnabled} onChange={handleToggleMemory} />
            <span className="memory-space-toggle-track">
              <span className="memory-space-toggle-thumb" />
            </span>
          </label>
        </div>

        <div className="memory-space-list">
          {isLoading ? <p className="memory-space-loading">{loadingLabel}</p> : null}

          {!isLoading && !hasMemories ? <p className="memory-space-empty">{emptyLabel}</p> : null}

          {!isLoading && hasMemories ? (
            <ul>
              {memoryRows.map((memory) => {
                const isConfirming = pendingDeleteId === memory.id;
                return (
                  <li key={memory.id} className="memory-space-item">
                    <div className="memory-space-item-copy">
                      <p>{memory.content}</p>
                      {memory.createdAtText ? <time dateTime={memory.created_at}>{memory.createdAtText}</time> : null}
                    </div>
                    <button
                      type="button"
                      className={`memory-space-delete ${isConfirming ? 'is-confirming' : ''}`}
                      onClick={() => handleDeleteMemory(memory.id)}
                    >
                      {isConfirming ? deleteConfirmLabel : deleteLabel}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}
