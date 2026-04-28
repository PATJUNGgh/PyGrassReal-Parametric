import { fireEvent, render, screen } from '@testing-library/react';
import {
  formatLastUpdated,
  LanguageProvider,
  localizeText,
  useLanguage,
} from './language';

function LanguageProbe() {
  const { language, languageOptions, setLanguage } = useLanguage();

  return (
    <div>
      <output data-testid="language">{language}</output>
      <output data-testid="language-options">{languageOptions.length}</output>
      <button type="button" onClick={() => setLanguage('th')}>
        set-th
      </button>
      <button type="button" onClick={() => setLanguage('en')}>
        set-en
      </button>
    </div>
  );
}

function BrokenProbe() {
  useLanguage();
  return null;
}

describe('language helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
  });

  it('localizes text by selected language', () => {
    const text = { th: 'สวัสดี', en: 'Hello' };
    expect(localizeText('th', text)).toBe('สวัสดี');
    expect(localizeText('en', text)).toBe('Hello');
  });

  it('formats last-updated copy per language', () => {
    expect(formatLastUpdated('en', 'February 22, 2026')).toBe('Last updated: February 22, 2026');
    expect(formatLastUpdated('th', '22 กุมภาพันธ์ 2026')).toBe('อัปเดตล่าสุด: 22 กุมภาพันธ์ 2026');
  });

  it('initializes from a supported localStorage value and persists updates', () => {
    window.localStorage.setItem('pygrass-language', 'en');

    render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>
    );

    expect(screen.getByTestId('language')).toHaveTextContent('en');
    expect(screen.getByTestId('language-options')).toHaveTextContent('2');
    expect(document.documentElement.lang).toBe('en');

    fireEvent.click(screen.getByRole('button', { name: 'set-th' }));
    expect(screen.getByTestId('language')).toHaveTextContent('th');
    expect(window.localStorage.getItem('pygrass-language')).toBe('th');
    expect(document.documentElement.lang).toBe('th');
  });

  it('falls back to default language when stored value is unsupported', () => {
    const navigatorLanguageSpy = vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US');
    window.localStorage.setItem('pygrass-language', 'jp');

    try {
      render(
        <LanguageProvider>
          <LanguageProbe />
        </LanguageProvider>
      );
    } finally {
      navigatorLanguageSpy.mockRestore();
    }

    expect(screen.getByTestId('language')).toHaveTextContent('th');
  });

  it('throws when useLanguage is called outside provider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(() => render(<BrokenProbe />)).toThrow('useLanguage must be used within a LanguageProvider');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
