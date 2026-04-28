import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatAssistantPage } from './ChatAssistantPage';
import { LanguageProvider } from '../i18n/language';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mockAssistant = vi.hoisted(() => ({
  messages: Array.from({ length: 250 }, (_, index) => ({
    id: `message-${index + 1}`,
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `message ${index + 1}`,
    timestamp: index + 1,
    model: 'hanuman' as const,
  })),
  isGenerating: false,
  isHistoryOpen: false,
  currentModel: 'hanuman' as const,
  setCurrentModel: vi.fn(),
  handleSend: vi.fn(async () => undefined),
  handleStop: vi.fn(),
  handleNewChat: vi.fn(() => 'session-2'),
  loadSession: vi.fn(),
  toggleHistory: vi.fn(),
  isEmpty: false,
  agentSteps: [],
  isFreeTier: false,
}));

const mockUpsert = vi.hoisted(() => vi.fn(() => Promise.resolve({ error: null })));

vi.mock('./hooks/useChatAssistant', () => ({
  useChatAssistant: () => mockAssistant,
}));

vi.mock('./hooks/useBunnyUpload', () => ({
  useBunnyUpload: () => ({
    uploadFile: vi.fn(),
    isUploading: false,
  }),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mockUpsert,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('ChatAssistantPage rollover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem('dashboard_chat_session_id', 'session-1');
  });

  it('starts a fresh session automatically after 250 messages and continues sending', async () => {
    render(
      <LanguageProvider>
        <ChatAssistantPage onUpgradePlan={vi.fn()} />
      </LanguageProvider>,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New topic after rollover' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(mockAssistant.handleNewChat).toHaveBeenCalledWith({ suppressToast: true }),
    );
    await waitFor(() =>
      expect(mockAssistant.handleSend).toHaveBeenCalledWith('New topic after rollover', 'auto'),
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'session-2',
        title: 'New topic after rollover',
      }),
      { onConflict: 'id' },
    );
  });
});
