import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatAssistantHeader } from './ChatAssistantHeader';
import { LanguageProvider } from '../../../i18n/language';
import React from 'react';

describe('ChatAssistantHeader', () => {
  const defaultProps = {
    onNewChat: vi.fn(),
    onToggleHistory: vi.fn(),
    isHistoryOpen: false,
    currentModel: 'hanuman' as const,
    onModelChange: vi.fn(),
    onUpgradePlan: vi.fn(),
  };

  it('renders correctly with current model info', () => {
    render(
      <LanguageProvider>
        <ChatAssistantHeader {...defaultProps} />
      </LanguageProvider>
    );

    expect(screen.getByText(/Hanuman-Ai/)).toBeInTheDocument();
  });

  it('calls onToggleHistory when history button clicked', () => {
    render(
      <LanguageProvider>
        <ChatAssistantHeader {...defaultProps} />
      </LanguageProvider>
    );

    const historyBtn = screen.getByTitle(/เปิด\/ปิดประวัติการแชท/i);
    fireEvent.click(historyBtn);
    expect(defaultProps.onToggleHistory).toHaveBeenCalled();
  });

  it('calls onNewChat when new chat button clicked', () => {
    render(
      <LanguageProvider>
        <ChatAssistantHeader {...defaultProps} />
      </LanguageProvider>
    );

    const newChatBtn = screen.getByTitle(/เริ่มการสนทนาใหม่/i);
    fireEvent.click(newChatBtn);
    expect(defaultProps.onNewChat).toHaveBeenCalled();
  });
});
