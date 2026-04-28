import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../i18n/language';
import { UserProfileButton } from './UserProfileButton';

describe('UserProfileButton', () => {
  it('routes to pricing when upgrade plan is clicked', () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();

    render(
      <LanguageProvider>
        <UserProfileButton
          displayName="Profile Tester"
          email="tester@example.com"
          avatarUrl={null}
          isLoading={false}
          onSignOut={onSignOut}
          onNavigate={onNavigate}
        />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /open profile menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /upgrade plan/i }));

    expect(onNavigate).toHaveBeenCalledWith('/pricing?from=dashboard');
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('routes to chat-aware pricing source when opened from chat route', () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();

    render(
      <LanguageProvider>
        <UserProfileButton
          displayName="Profile Tester"
          email="tester@example.com"
          avatarUrl={null}
          isLoading={false}
          onSignOut={onSignOut}
          onNavigate={onNavigate}
          activeRoute="/dashboard/chat"
        />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /open profile menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /upgrade plan/i }));

    expect(onNavigate).toHaveBeenCalledWith('/pricing?from=chat');
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('opens dropdown and routes to settings', () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();

    render(
      <LanguageProvider>
        <UserProfileButton
          displayName="Profile Tester"
          email="tester@example.com"
          avatarUrl={null}
          isLoading={false}
          onSignOut={onSignOut}
          onNavigate={onNavigate}
        />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /open profile menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /settings/i }));

    expect(onNavigate).toHaveBeenCalledWith('/dashboard/settings');
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('triggers sign out action from dropdown', () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();

    render(
      <LanguageProvider>
        <UserProfileButton
          displayName="Profile Tester"
          email="tester@example.com"
          avatarUrl={null}
          isLoading={false}
          onSignOut={onSignOut}
          onNavigate={onNavigate}
        />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /open profile menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('changes language to thai from profile dropdown', () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();

    render(
      <LanguageProvider>
        <UserProfileButton
          displayName="Profile Tester"
          email="tester@example.com"
          avatarUrl={null}
          isLoading={false}
          onSignOut={onSignOut}
          onNavigate={onNavigate}
        />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /open profile menu/i }));
    const languageTrigger = screen.getByRole('menuitem', { name: /language/i });

    fireEvent.click(languageTrigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /english/i }));
    expect(languageTrigger).toHaveTextContent('EN');

    fireEvent.click(languageTrigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /thai/i }));
    expect(languageTrigger).toHaveTextContent('TH');
  });
});
