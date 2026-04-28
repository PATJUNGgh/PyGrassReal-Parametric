import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkflowInlineEdit } from './WorkflowInlineEdit';
import { LanguageProvider } from '../../i18n/language';
import React from 'react';

describe('WorkflowInlineEdit', () => {
  const defaultProps = {
    draftName: 'Initial Name',
    isSaving: false,
    onNameChange: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders input with draft name', () => {
    render(
      <LanguageProvider>
        <WorkflowInlineEdit {...defaultProps} />
      </LanguageProvider>
    );

    const input = screen.getByLabelText(/Workflow name/i);
    expect(input).toHaveValue('Initial Name');
  });

  it('calls onSave when Enter is pressed', () => {
    render(
      <LanguageProvider>
        <WorkflowInlineEdit {...defaultProps} />
      </LanguageProvider>
    );

    const input = screen.getByLabelText(/Workflow name/i);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  it('calls onCancel when Escape is pressed', () => {
    render(
      <LanguageProvider>
        <WorkflowInlineEdit {...defaultProps} />
      </LanguageProvider>
    );

    const input = screen.getByLabelText(/Workflow name/i);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('disables interactions while saving', () => {
    render(
      <LanguageProvider>
        <WorkflowInlineEdit {...defaultProps} isSaving={true} />
      </LanguageProvider>
    );

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByText(/กำลังบันทึก|Saving/i)).toBeInTheDocument();
  });
});
