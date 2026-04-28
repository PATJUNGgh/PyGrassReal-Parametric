import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatComposer from './ChatComposer';
import { LanguageProvider } from '../../../i18n/language';

describe('ChatComposer', () => {
  const mockOnSend = vi.fn();
  const mockOnStop = vi.fn();
  const mockOnFilesSelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComposer = (props = {}) =>
    render(
      <LanguageProvider>
        <ChatComposer
          onSend={mockOnSend}
          onStop={mockOnStop}
          onFilesSelected={mockOnFilesSelected}
          {...props}
        />
      </LanguageProvider>,
    );

  it('updates input value on change', () => {
    renderComposer();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello AI' } });
    expect(textarea).toHaveValue('Hello AI');
  });

  it('calls onSend when Enter is pressed without Shift', () => {
    renderComposer();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Send this' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false });

    expect(mockOnSend).toHaveBeenCalledWith('Send this', 'auto');
    expect(textarea).toHaveValue('');
  });

  it('does not call onSend when Shift+Enter is pressed', () => {
    renderComposer();
    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: true });
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('shows stop button when isGenerating is true', () => {
    const { container } = renderComposer({ isGenerating: true });
    const stopBtn = container.querySelector('.composer-stop-btn');
    expect(stopBtn).toBeInTheDocument();

    fireEvent.click(stopBtn as HTMLButtonElement);
    expect(mockOnStop).toHaveBeenCalled();
  });

  it('disables send button when input is empty and no attachments', () => {
    const { container } = renderComposer();
    const sendBtn = container.querySelector('.composer-send-btn');
    expect(sendBtn).toBeDisabled();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(sendBtn).toBeDisabled();
  });

  it('enables send button when there are pending attachments even without text', () => {
    const { container } = renderComposer({ pendingAttachmentCount: 1 });
    const sendBtn = container.querySelector('.composer-send-btn');
    expect(sendBtn).toBeEnabled();
  });

  it('sends attachment-only message when Enter is pressed with empty input', () => {
    renderComposer({ pendingAttachmentCount: 2 });
    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false });

    expect(mockOnSend).toHaveBeenCalledWith('', 'auto');
  });

  it('forces off internet mode for free tier', () => {
    renderComposer({ forceInternetOff: true });
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Send in free tier' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false });

    expect(mockOnSend).toHaveBeenCalledWith('Send in free tier', 'off');
  });

  it('restores auto mode when free-tier lock is removed', () => {
    const { rerender } = render(
      <LanguageProvider>
        <ChatComposer
          onSend={mockOnSend}
          onStop={mockOnStop}
          onFilesSelected={mockOnFilesSelected}
          forceInternetOff
        />
      </LanguageProvider>,
    );

    rerender(
      <LanguageProvider>
        <ChatComposer
          onSend={mockOnSend}
          onStop={mockOnStop}
          onFilesSelected={mockOnFilesSelected}
          forceInternetOff={false}
        />
      </LanguageProvider>,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Starter mode message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false });

    expect(mockOnSend).toHaveBeenCalledWith('Starter mode message', 'auto');
  });

  it('accepts clipboard image paste as file attachment', () => {
    renderComposer();
    const textarea = screen.getByRole('textbox');
    const imageFile = new File(['img'], 'pasted.png', { type: 'image/png' });

    fireEvent.paste(textarea, {
      clipboardData: {
        files: [imageFile],
      },
    });

    expect(mockOnFilesSelected).toHaveBeenCalledTimes(1);
    expect(mockOnFilesSelected).toHaveBeenCalledWith([imageFile]);
  });

  it('accepts dropped files in composer without navigating away', () => {
    const { container } = renderComposer();
    const dropZone = container.querySelector('.chat-composer-pill-container');
    const droppedFile = new File(['img'], 'dropped.png', { type: 'image/png' });

    fireEvent.drop(dropZone as HTMLElement, {
      dataTransfer: {
        files: [droppedFile],
        types: ['Files'],
      },
    });

    expect(mockOnFilesSelected).toHaveBeenCalledTimes(1);
    expect(mockOnFilesSelected).toHaveBeenCalledWith([droppedFile]);
  });

  it('renders pending attachments in composer area', () => {
    renderComposer({
      pendingAttachments: [
        {
          id: 'a1',
          name: 'scene.png',
          kind: 'image',
          size: 1350,
          previewUrl: 'blob:test-preview',
        },
      ],
    });

    expect(screen.getByAltText('scene.png')).toBeInTheDocument();
  });

  it('removes pending attachment from composer area', () => {
    const onRemovePendingAttachment = vi.fn();
    renderComposer({
      pendingAttachments: [
        {
          id: 'a1',
          name: 'scene.png',
          kind: 'image',
          size: 1350,
          previewUrl: 'blob:test-preview',
        },
      ],
      onRemovePendingAttachment,
    });

    fireEvent.click(screen.getByRole('button', { name: /Remove attachment scene.png/i }));
    expect(onRemovePendingAttachment).toHaveBeenCalledWith('a1');
  });

  it('enforces maxLength on textarea', () => {
    renderComposer();
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('maxLength', '4000');
  });
});
