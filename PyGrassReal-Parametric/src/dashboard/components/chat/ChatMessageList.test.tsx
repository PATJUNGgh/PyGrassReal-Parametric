import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatMessageList } from './ChatMessageList';
import { LanguageProvider } from '../../../i18n/language';
import type { Message } from '../../types/chat.types';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('ChatMessageList', () => {
  const mockMessages: Message[] = [
    { id: '1', role: 'user', content: 'Hello AI', timestamp: Date.now() },
    { id: '2', role: 'assistant', content: 'Hello human', timestamp: Date.now(), model: 'hanuman' },
  ];

  it('renders messages correctly with roles', () => {
    const { container } = render(
      <LanguageProvider>
        <ChatMessageList messages={mockMessages} isGenerating={false} />
      </LanguageProvider>,
    );

    expect(screen.getByText('Hello AI')).toBeInTheDocument();
    expect(screen.getByText('Hello human')).toBeInTheDocument();
    expect(screen.getByText('Hanuman-Ai')).toBeInTheDocument();
    expect(container.querySelector('.message-bubble-row.user .message-icon-wrapper')).not.toBeInTheDocument();
  });

  it('shows thinking state when isGenerating is true', () => {
    render(
      <LanguageProvider>
        <ChatMessageList messages={[]} isGenerating currentModel="phraram" />
      </LanguageProvider>,
    );

    expect(screen.getByText(/Thinking|กำลังคิด/i)).toBeInTheDocument();
    expect(screen.getByText('Phraram-Ai')).toBeInTheDocument();
  });

  it('handles empty message list gracefully', () => {
    const { container } = render(
      <LanguageProvider>
        <ChatMessageList messages={[]} isGenerating={false} />
      </LanguageProvider>,
    );

    const messagesInner = container.querySelector('.chat-messages-inner');
    expect(messagesInner?.children.length).toBe(1);
  });

  it('renders bunny image markdown links as preview thumbnails', () => {
    const mediaMessage: Message[] = [
      {
        id: 'img-1',
        role: 'user',
        content: '[reference](https://pygrass-chat-media.b-cdn.net/u1/1700_render.webp)',
        timestamp: Date.now(),
      },
    ];

    render(
      <LanguageProvider>
        <ChatMessageList messages={mediaMessage} isGenerating={false} />
      </LanguageProvider>,
    );

    expect(screen.getByRole('button', { name: /Preview image/i })).toBeInTheDocument();
    expect(document.querySelector('img.chat-media-image-thumb')).toBeInTheDocument();
  });

  it('opens and closes image lightbox when thumbnail is clicked', () => {
    const mediaMessage: Message[] = [
      {
        id: 'img-2',
        role: 'user',
        content: '[preview](https://pygrass-chat-media.b-cdn.net/u2/1701_scene.png)',
        timestamp: Date.now(),
      },
    ];

    render(
      <LanguageProvider>
        <ChatMessageList messages={mediaMessage} isGenerating={false} />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Preview image/i }));
    expect(screen.getByRole('dialog', { name: /Image preview/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Close image preview/i }));
    expect(screen.queryByRole('dialog', { name: /Image preview/i })).not.toBeInTheDocument();
  });

  it('renders bunny video markdown links as playable video', () => {
    const mediaMessage: Message[] = [
      {
        id: 'vid-1',
        role: 'user',
        content: '[clip](https://pygrass-chat-media.b-cdn.net/u3/1702_walkthrough.mp4)',
        timestamp: Date.now(),
      },
    ];

    const { container } = render(
      <LanguageProvider>
        <ChatMessageList messages={mediaMessage} isGenerating={false} />
      </LanguageProvider>,
    );

    expect(container.querySelector('video.chat-media-video')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open video/i })).toBeInTheDocument();
  });

  it('shows copy button for assistant messages and copies message content', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <LanguageProvider>
        <ChatMessageList messages={mockMessages} isGenerating={false} />
      </LanguageProvider>,
    );

    const copyButton = screen.getByRole('button', { name: /Copy|คัดลอก/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('Hello human');
    });
  });
});
