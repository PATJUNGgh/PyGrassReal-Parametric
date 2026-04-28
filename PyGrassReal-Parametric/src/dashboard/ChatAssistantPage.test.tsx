import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatAssistantPage } from './ChatAssistantPage';
import { LanguageProvider } from '../i18n/language';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('ChatAssistantPage Integration', () => {
  const defaultProps = {
    onUpgradePlan: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/dashboard/chat');
  });

  it('renders empty state initially', () => {
    render(
      <LanguageProvider>
        <ChatAssistantPage {...defaultProps} />
      </LanguageProvider>,
    );

    expect(screen.getByAltText(/PyGrassReal-Ai Logo/i)).toBeInTheDocument();
  });

  it('sends a message and shows user bubble', () => {
    const { container } = render(
      <LanguageProvider>
        <ChatAssistantPage {...defaultProps} />
      </LanguageProvider>,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    const userMessage = container.querySelector('.message-bubble-row.user .message-text-body');
    expect(userMessage).toHaveTextContent('Test message');
    expect(screen.getByRole('button', { name: /Room actions/i })).toHaveTextContent('Test message');
  });

  it('toggles chat history drawer', () => {
    const { container } = render(
      <LanguageProvider>
        <ChatAssistantPage {...defaultProps} />
      </LanguageProvider>,
    );

    const actionButtons = container.querySelectorAll('.header-action-btn');
    fireEvent.click(actionButtons[1] as HTMLButtonElement);

    const drawer = container.querySelector('.chat-history-drawer');
    expect(drawer).toBeInTheDocument();
  });

  it('shows selected attachment in composer and keeps sent-files panel hidden before sending', async () => {
    const { container } = render(
      <LanguageProvider>
        <ChatAssistantPage {...defaultProps} />
      </LanguageProvider>,
    );

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    const videoFile = new File(['video'], 'meeting-clip.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [videoFile] } });

    expect(await screen.findByLabelText('Pending attachments')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove attachment meeting-clip.mp4/i })).toBeInTheDocument();
    expect(container.querySelector('.chat-files-toggle-btn')).not.toBeInTheDocument();
  });

  it('opens presets modal when route query focus=presets is provided', () => {
    window.history.replaceState(null, '', '/dashboard/chat?focus=presets');

    render(
      <LanguageProvider>
        <ChatAssistantPage {...defaultProps} />
      </LanguageProvider>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
