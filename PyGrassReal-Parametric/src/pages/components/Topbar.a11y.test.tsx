import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../../i18n/language';
import type { TopbarNavItem } from '../config/navigation';
import { PageNavigationProvider } from '../navigation/PageNavigationContext';
import { Topbar } from './Topbar';

const TOPBAR_ITEMS: TopbarNavItem[] = [
  {
    path: '/about',
    label: 'About',
    tone: 'default',
    match: 'exact',
  },
  {
    path: '/auth/login',
    label: 'Sign in',
    tone: 'cta',
    match: 'prefix',
  },
];

const renderTopbar = () => {
  const navigate = vi.fn();

  render(
    <LanguageProvider>
      <PageNavigationProvider value={{ navigate, currentPath: '/' }}>
        <Topbar items={TOPBAR_ITEMS} />
      </PageNavigationProvider>
    </LanguageProvider>
  );

  return { navigate };
};

describe('Topbar accessibility', () => {
  beforeEach(() => {
    window.localStorage.setItem('pygrass-language', 'en');
  });

  it('opens the mobile navigation with dialog semantics', () => {
    renderTopbar();

    const menuToggle = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(menuToggle);

    const dialog = screen.getByRole('dialog', { name: /mobile navigation/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on Escape and restores focus to menu toggle', async () => {
    renderTopbar();

    const menuToggle = screen.getByRole('button', { name: /open navigation menu/i });
    menuToggle.focus();
    fireEvent.click(menuToggle);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: /mobile navigation/i })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(menuToggle).toHaveFocus();
    });
  });
});

