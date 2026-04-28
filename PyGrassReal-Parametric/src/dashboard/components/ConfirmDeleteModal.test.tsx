import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { LanguageProvider } from '../../i18n/language';
import React from 'react';

describe('ConfirmDeleteModal', () => {
  const mockWorkflow = { id: '1', name: 'Delete Me', status: 'active' as const, owner_id: null, created_at: null, updated_at: null, definition: null };
  const defaultProps = {
    workflow: mockWorkflow,
    isDeleting: false,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
  };

  it('renders nothing if no workflow provided', () => {
    const { container } = render(
      <LanguageProvider>
        <ConfirmDeleteModal {...defaultProps} workflow={null} />
      </LanguageProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders confirmation text with workflow name', () => {
    render(
      <LanguageProvider>
        <ConfirmDeleteModal {...defaultProps} />
      </LanguageProvider>
    );

    expect(screen.getByText(/Delete Me/)).toBeInTheDocument();
    expect(screen.getByText(/ลบเวิร์กโฟลว์|Delete workflow/i)).toBeInTheDocument();
  });

  it('calls onConfirm when delete button is clicked', () => {
    render(
      <LanguageProvider>
        <ConfirmDeleteModal {...defaultProps} />
      </LanguageProvider>
    );

    const deleteBtn = screen.getByRole('button', { name: /ลบข้อมูล|Delete/i });
    fireEvent.click(deleteBtn);
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('shows deleting status and disables buttons', () => {
    render(
      <LanguageProvider>
        <ConfirmDeleteModal {...defaultProps} isDeleting={true} />
      </LanguageProvider>
    );

    expect(screen.getByText(/กำลังลบ|Deleting/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ยกเลิก|Cancel/i })).toBeDisabled();
  });
});
