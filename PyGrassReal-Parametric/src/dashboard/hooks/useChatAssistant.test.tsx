import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../i18n/language';
import { useChatAssistant } from './useChatAssistant';

const mockServices = vi.hoisted(() => {
  let currentSessionId = 'session-1';
  let sessionCounter = 1;

  return {
    getCurrentSessionId: () => currentSessionId,
    resetSessionState: () => {
      currentSessionId = 'session-1';
      sessionCounter = 1;
    },
    resetDashboardSession: vi.fn(() => {
      sessionCounter += 1;
      currentSessionId = `session-${sessionCounter}`;
      return currentSessionId;
    }),
    sendDashboardMessage: vi.fn(async () => ({ output: 'AI reply' })),
    getChatMemoryBySessionId: vi.fn(async () => []),
  };
});

vi.mock('../../auth/hooks/useProfile', () => ({
  useProfile: () => ({ id: 'user-1' }),
}));

vi.mock('./useUserEntitlement', () => ({
  useUserEntitlement: () => ({ entitlement: { plan_id: 'starter' } }),
}));

vi.mock('../services/dashboard.chat.api', () => ({
  sendDashboardMessage: mockServices.sendDashboardMessage,
  resetDashboardSession: mockServices.resetDashboardSession,
  getDashboardSessionId: () => mockServices.getCurrentSessionId(),
  getDashboardUserId: () => 'anon-user-1',
}));

vi.mock('../services/dashboard.memory.api', () => ({
  getChatMemoryBySessionId: mockServices.getChatMemoryBySessionId,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('useChatAssistant', () => {
  const mockPushToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockServices.resetSessionState();
    mockServices.sendDashboardMessage.mockResolvedValue({ output: 'AI reply' });
    mockServices.getChatMemoryBySessionId.mockResolvedValue([]);
    window.localStorage.clear();
  });

  it('initializes with empty messages', () => {
    const { result } = renderHook(() => useChatAssistant(), { wrapper });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isEmpty).toBe(true);
  });

  it('prevents sending empty messages', async () => {
    const { result } = renderHook(() => useChatAssistant(), { wrapper });

    await act(async () => {
      await result.current.handleSend('   ');
    });

    expect(result.current.messages).toHaveLength(0);
    expect(mockServices.sendDashboardMessage).not.toHaveBeenCalled();
  });

  it('starts a new session and can send immediately after reset', async () => {
    window.localStorage.setItem(
      'dashboard_chat_history_session-1',
      JSON.stringify([
        {
          id: 'old-message',
          role: 'user',
          content: 'Old topic',
          timestamp: 1,
        },
      ]),
    );

    const { result } = renderHook(() => useChatAssistant({ pushToast: mockPushToast }), { wrapper });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Old topic');

    let nextSessionId = '';
    act(() => {
      nextSessionId = result.current.handleNewChat({ suppressToast: true });
    });

    expect(nextSessionId).toBe('session-2');
    expect(mockServices.resetDashboardSession).toHaveBeenCalledTimes(1);
    expect(result.current.messages).toHaveLength(0);
    expect(mockPushToast).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleSend('Fresh topic');
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    expect(mockServices.sendDashboardMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Fresh topic',
        model: 'hanuman',
        searchMode: 'auto',
      }),
      'user-1',
    );
    expect(result.current.messages[0].content).toBe('Fresh topic');
    expect(result.current.messages[1].content).toBe('AI reply');
  });
});
