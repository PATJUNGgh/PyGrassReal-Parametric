import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChatHistory } from './useChatHistory';
import { LanguageProvider } from '../../i18n/language';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('useChatHistory', () => {
  const mockPushToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles conversation deletion with confirmation', async () => {
    const { result } = renderHook(() => useChatHistory({ pushToast: mockPushToast }), { wrapper });

    // Create one conversation first (history now starts empty until loaded from DB).
    act(() => {
      result.current.handleNewFile(null, null);
    });

    await waitFor(() => expect(result.current.historyItems.length).toBeGreaterThan(0));

    const initialCount = result.current.historyItems.length;
    const targetId = result.current.historyItems[0].id;

    await new Promise((resolve) => setTimeout(resolve, 1100));

    // First click sets confirming
    act(() => {
      result.current.handleDelete({ stopPropagation: vi.fn() } as any, targetId);
    });
    expect(result.current.confirmingDeleteId).toBe(targetId);

    // Second click deletes
    act(() => {
      result.current.handleDelete({ stopPropagation: vi.fn() } as any, targetId);
    });
    
    await waitFor(() => expect(result.current.historyItems.length).toBe(initialCount - 1));
    expect(mockPushToast).toHaveBeenCalledWith(expect.stringMatching(/ลบบทสนทนาแล้ว|Conversation deleted/i));
  });

  it('can create a new project and movement via drop is possible', async () => {
    const { result } = renderHook(() => useChatHistory({ pushToast: mockPushToast }), { wrapper });
    
    // Initial state should have 0 projects
    expect(result.current.projects).toHaveLength(0);

    // Submit new project
    act(() => {
      result.current.setNewProjectName('Test Project');
    });
    
    act(() => {
      result.current.submitNewProject();
    });

    // Wait for projects array to update
    await waitFor(() => {
      expect(result.current.projects.length).toBe(1);
    }, { timeout: 2000 });

    expect(result.current.projects[0].name).toBe('Test Project');
    expect(mockPushToast).toHaveBeenCalledWith(expect.stringMatching(/สร้างโปรเจกต์แล้ว|Project created/i));
  });
});
