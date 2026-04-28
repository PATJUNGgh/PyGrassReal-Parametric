import { render } from '@testing-library/react';
import { LanguageProvider } from '../i18n/language';
import LandingPage from './LandingPage';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const isElementInAriaHiddenTree = (element: HTMLElement): boolean => {
  return element.closest('[aria-hidden="true"]') !== null;
};

describe('LandingPage a11y integration', () => {
  beforeEach(() => {
    window.localStorage.setItem('pygrass-language', 'en');
    window.scrollTo = vi.fn();
  });

  it('keeps keyboard focus order continuous from top navigation to hero actions', () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <LanguageProvider>
        <LandingPage onNavigate={onNavigate} />
      </LanguageProvider>
    );

    const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => !isElementInAriaHiddenTree(element)
    );
    const tabindexViolations = Array.from(container.querySelectorAll<HTMLElement>('[tabindex]')).filter(
      (element) => Number(element.getAttribute('tabindex')) > 0
    );

    const brandIndex = focusables.findIndex((element) => element.classList.contains('pg-brand'));
    const languageButtonIndices = focusables
      .map((element, index) => ({ element, index }))
      .filter(({ element }) => element.classList.contains('pg-lang-button'))
      .map(({ index }) => index);
    const homeNavIndex = focusables.findIndex((element) => /home/i.test(element.textContent ?? ''));
    const signInNavIndex = focusables.findIndex((element) => /sign in/i.test(element.textContent ?? ''));
    const openDashboardIndex = focusables.findIndex((element) =>
      /open dashboard/i.test(element.textContent ?? '')
    );

    expect(focusables.length).toBeGreaterThan(0);
    expect(tabindexViolations).toHaveLength(0);

    expect(brandIndex).toBeGreaterThanOrEqual(0);
    expect(languageButtonIndices.length).toBeGreaterThanOrEqual(2);
    expect(homeNavIndex).toBeGreaterThanOrEqual(0);
    expect(signInNavIndex).toBeGreaterThan(homeNavIndex);
    expect(openDashboardIndex).toBeGreaterThan(signInNavIndex);
  });
});

