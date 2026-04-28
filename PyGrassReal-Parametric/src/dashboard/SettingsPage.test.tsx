import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/language';
import { SettingsPage } from './SettingsPage';

const memorySpaceMock = vi.hoisted(() => ({
  toggleMemory: vi.fn(),
  deleteMemory: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('../auth/hooks/useProfile', () => ({
  useProfile: () => ({
    displayName: 'Settings Tester',
    email: 'settings.tester@example.com',
    avatarUrl: null,
    isLoading: false,
  }),
}));

vi.mock('./hooks/useUserEntitlement', () => ({
  useUserEntitlement: () => ({
    entitlement: {
      user_id: 'test-user',
      plan_id: 'pro',
      billing_cycle: 'monthly',
      status: 'active',
      activated_at: '2026-01-01T00:00:00.000Z',
      current_period_end: '2026-02-01T00:00:00.000Z',
    },
    loading: false,
    userId: 'test-user',
  }),
}));

vi.mock('./hooks/useMemorySpace', () => ({
  useMemorySpace: () => ({
    memories: [
      {
        id: 'memory-1',
        user_id: 'test-user',
        content: 'Remember project preferences for UI layout.',
        memory_enabled: true,
        created_at: '2026-03-01T00:00:00.000Z',
      },
    ],
    isLoading: false,
    memoryEnabled: true,
    toggleMemory: memorySpaceMock.toggleMemory,
    deleteMemory: memorySpaceMock.deleteMemory,
    refresh: memorySpaceMock.refresh,
  }),
}));

describe('SettingsPage', () => {
  it('navigates to legal and feature pages from menu items', () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();

    render(
      <LanguageProvider>
        <SettingsPage onNavigate={onNavigate} onSignOut={onSignOut} />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /terms of service/i }));
    fireEvent.click(screen.getByRole('button', { name: /privacy policy/i }));
    fireEvent.click(screen.getByRole('button', { name: /features/i }));

    expect(onNavigate).toHaveBeenCalledWith('/legal/terms');
    expect(onNavigate).toHaveBeenCalledWith('/legal/privacy');
    expect(onNavigate).toHaveBeenCalledWith('/about');
  });

  it('calls sign out callback', () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();

    render(
      <LanguageProvider>
        <SettingsPage onNavigate={onNavigate} onSignOut={onSignOut} />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('opens presets modal inside settings page', () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();

    render(
      <LanguageProvider>
        <SettingsPage onNavigate={onNavigate} onSignOut={onSignOut} />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /presets/i }));
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows current subscription plan in manage section', () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();

    render(
      <LanguageProvider>
        <SettingsPage onNavigate={onNavigate} onSignOut={onSignOut} />
      </LanguageProvider>
    );

    expect(screen.getByText(/pro/i)).toBeInTheDocument();
  });

  it('opens memory space modal in place without navigation', () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();

    render(
      <LanguageProvider>
        <SettingsPage onNavigate={onNavigate} onSignOut={onSignOut} />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /memory space/i }));

    expect(onNavigate).not.toHaveBeenCalledWith('/dashboard/chat?focus=memory');
    expect(screen.getByRole('dialog', { name: /memory space/i })).toBeInTheDocument();
    expect(screen.getByText(/remember project preferences for ui layout/i)).toBeInTheDocument();
  });
});
