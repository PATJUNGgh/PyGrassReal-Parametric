import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateWorkflowModal } from './CreateWorkflowModal';
import { LanguageProvider } from '../../i18n/language';
import React from 'react';

describe('CreateWorkflowModal', () => {
  const defaultProps = {
    open: true,
    isSubmitting: false,
    onClose: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(undefined),
  };

  it('renders correctly when open', () => {
    render(
      <LanguageProvider>
        <CreateWorkflowModal {...defaultProps} />
      </LanguageProvider>
    );

    expect(screen.getByText(/สร้างเวิร์กโฟลว์ใหม่|Create workflow/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/เช่น การออกแบบโครงสร้างใหม่|e.g. New structure design/i)).toBeInTheDocument();
  });

  it('disables create button when name is empty or only whitespace', () => {
    render(
      <LanguageProvider>
        <CreateWorkflowModal {...defaultProps} />
      </LanguageProvider>
    );

    const input = screen.getByLabelText(/ชื่อเวิร์กโฟลว์|Workflow name/i);
    const submitBtn = screen.getByRole('button', { name: /สร้างงาน|Create/i });

    expect(submitBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: '   ' } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: 'New Workflow' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onCreate with trimmed name on submit', async () => {
    const { container } = render(
      <LanguageProvider>
        <CreateWorkflowModal {...defaultProps} />
      </LanguageProvider>
    );

    const input = screen.getByLabelText(/ชื่อเวิร์กโฟลว์|Workflow name/i);
    const form = container.querySelector('form');

    fireEvent.change(input, { target: { value: '  My New Project  ' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(defaultProps.onCreate).toHaveBeenCalledWith('My New Project');
    });
  });

  it('shows creating status when isSubmitting is true', () => {
    render(
      <LanguageProvider>
        <CreateWorkflowModal {...defaultProps} isSubmitting={true} />
      </LanguageProvider>
    );

    expect(screen.getByText(/กำลังสร้าง|Creating/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ยกเลิก|Cancel/i })).toBeDisabled();
  });
});
