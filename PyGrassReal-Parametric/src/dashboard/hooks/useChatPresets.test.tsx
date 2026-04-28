import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChatPresets } from './useChatPresets';
import { LanguageProvider } from '../../i18n/language';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('useChatPresets', () => {
  const mockPushToast = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('loads default presets when storage is empty', () => {
    const { result } = renderHook(() => useChatPresets('en'), { wrapper });
    expect(result.current.presetItems.length).toBeGreaterThan(0);
  });

  it('filters presets based on search text', () => {
    const { result } = renderHook(() => useChatPresets('en'), { wrapper });
    
    act(() => {
      result.current.setPresetSearchText('summarize');
    });

    // Based on MOCK_PRESETS /brief content
    expect(result.current.filteredPresets.length).toBe(1);
    expect(result.current.filteredPresets[0].triggerWord).toBe('/brief');
  });

  it('prevents duplicate trigger words', () => {
    const { result } = renderHook(() => useChatPresets('en', { pushToast: mockPushToast }), { wrapper });
    
    // Default trigger /brief exists
    act(() => {
      result.current.setNewPromptTriggerWord('/brief');
      result.current.setNewPromptContent('Duplicate content');
    });

    act(() => {
      const success = result.current.handleCreatePrompt();
      expect(success).toBe(false);
    });

    expect(mockPushToast).toHaveBeenCalledWith(expect.stringMatching(/คำสั่งเรียกนี้มีอยู่แล้ว|Trigger word already exists/i), 'error');
  });

  it('creates and persists new preset', () => {
    const { result } = renderHook(() => useChatPresets('en', { pushToast: mockPushToast }), { wrapper });
    const initialCount = result.current.presetItems.length;

    act(() => {
      result.current.setNewPromptTriggerWord('/test');
      result.current.setNewPromptContent('Test content');
    });

    act(() => {
      const success = result.current.handleCreatePrompt();
      expect(success).toBe(true);
    });

    expect(result.current.presetItems.length).toBe(initialCount + 1);
    expect(localStorage.getItem('chatPresets')).toContain('/test');
    expect(mockPushToast).toHaveBeenCalledWith(expect.stringMatching(/สร้างเทมเพลตสำเร็จ|Preset created/i));
  });
});
