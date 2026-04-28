import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../i18n/language';
import { telemetry } from '../telemetry/telemetry';
import { LanguageSwitcher } from './LanguageSwitcher';

describe('LanguageSwitcher accessibility', () => {
  beforeEach(() => {
    window.localStorage.setItem('pygrass-language', 'en');
  });

  it('exposes language options with pressed state and group label', () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    );

    expect(screen.getByRole('group', { name: /language selector/i })).toBeInTheDocument();

    const thaiButton = screen.getByRole('button', { name: /switch language to/i, pressed: false });
    const englishButton = screen.getByRole('button', { name: /switch language to en/i, pressed: true });

    expect(thaiButton).toHaveAttribute('lang', 'th');
    expect(englishButton).toHaveAttribute('lang', 'en');
  });

  it('emits telemetry when changing language', () => {
    const telemetryInfoSpy = vi.spyOn(telemetry, 'info').mockImplementation(() => {});
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /switch language to/i, pressed: false }));

    expect(telemetryInfoSpy).toHaveBeenCalledWith(
      'language_preference_changed',
      expect.objectContaining({
        fromLanguage: 'en',
        path: window.location.pathname,
      })
    );
  });
});
