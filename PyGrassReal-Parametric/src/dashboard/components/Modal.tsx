import React from 'react';
import { useClickOutside } from '../hooks/useClickOutside';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  const modalRef = useClickOutside<HTMLDivElement>(onClose);

  if (!isOpen) return null;

  return (
    <div className="dashboard-modal-overlay" role="presentation">
      <div className="dashboard-modal" ref={modalRef}>
        <h2>{title}</h2>
        <div className="dashboard-modal-content">
          {children}
        </div>
        {footer && <div className="dashboard-modal-actions">{footer}</div>}
      </div>
    </div>
  );
}
