import { render } from '@testing-library/react';
import { LanguageProvider } from '../i18n/language';
import LandingPage from './LandingPage';

const getMetaContent = (selector: string): string | null =>
  document.querySelector<HTMLMetaElement>(selector)?.getAttribute('content');

const findLinkHint = (rel: string, href: string): HTMLLinkElement | undefined =>
  Array.from(document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`)).find(
    (link) => link.getAttribute('href') === href
  );

describe('MainLayout SEO metadata', () => {
  beforeEach(() => {
    window.localStorage.setItem('pygrass-language', 'en');
    window.scrollTo = vi.fn();
  });

  it('sets complete Open Graph and Twitter image metadata with absolute URLs', () => {
    const onNavigate = vi.fn();
    render(
      <LanguageProvider>
        <LandingPage onNavigate={onNavigate} />
      </LanguageProvider>
    );

    const ogImage = getMetaContent('meta[property="og:image"]');
    const ogImageWidth = getMetaContent('meta[property="og:image:width"]');
    const ogImageHeight = getMetaContent('meta[property="og:image:height"]');
    const ogImageAlt = getMetaContent('meta[property="og:image:alt"]');
    const twitterImage = getMetaContent('meta[name="twitter:image"]');
    const twitterImageAlt = getMetaContent('meta[name="twitter:image:alt"]');

    expect(ogImage).toBeTruthy();
    expect(twitterImage).toBeTruthy();
    expect(ogImageWidth).toBe('768');
    expect(ogImageHeight).toBe('768');
    expect(ogImageAlt).toMatch(/logo/i);
    expect(twitterImageAlt).toMatch(/logo/i);

    const parsedOgImageUrl = new URL(ogImage ?? '', window.location.origin);
    const parsedTwitterImageUrl = new URL(twitterImage ?? '', window.location.origin);
    expect(parsedOgImageUrl.protocol).toMatch(/^https?:$/);
    expect(parsedTwitterImageUrl.protocol).toMatch(/^https?:$/);
  });

  it('provides PWA manifest and apple-touch-icon links', () => {
    const onNavigate = vi.fn();
    render(
      <LanguageProvider>
        <LandingPage onNavigate={onNavigate} />
      </LanguageProvider>
    );

    const manifestLink = document.querySelector('link[rel="manifest"]');
    const appleIconLink = document.querySelector('link[rel="apple-touch-icon"]');

    expect(manifestLink).toHaveAttribute('href', '/manifest.json');
    expect(appleIconLink).toHaveAttribute('href');
    expect(appleIconLink?.getAttribute('href')).toMatch(/\.png$/);
  });

  it('adds preconnect and dns-prefetch resource hints for external domains', () => {
    const onNavigate = vi.fn();
    render(
      <LanguageProvider>
        <LandingPage onNavigate={onNavigate} />
      </LanguageProvider>
    );

    expect(findLinkHint('dns-prefetch', 'https://fonts.googleapis.com')).toBeTruthy();
    expect(findLinkHint('preconnect', 'https://fonts.googleapis.com')).toBeTruthy();
    expect(findLinkHint('dns-prefetch', 'https://fonts.gstatic.com')).toBeTruthy();
    expect(findLinkHint('dns-prefetch', 'https://www.googletagmanager.com')).toBeTruthy();
    expect(findLinkHint('preconnect', 'https://www.googletagmanager.com')).toBeTruthy();

    const googleApisPreconnect = findLinkHint('preconnect', 'https://fonts.googleapis.com');
    const gstaticPreconnect = findLinkHint('preconnect', 'https://fonts.gstatic.com');
    const gtmPreconnect = findLinkHint('preconnect', 'https://www.googletagmanager.com');

    expect(googleApisPreconnect).toBeTruthy();
    expect(gstaticPreconnect).toBeTruthy();
    expect(gtmPreconnect).toBeTruthy();
    expect(googleApisPreconnect).toHaveAttribute('crossorigin', 'anonymous');
    expect(gstaticPreconnect).toHaveAttribute('crossorigin', 'anonymous');
    expect(gtmPreconnect).toHaveAttribute('crossorigin', 'anonymous');
    expect(gstaticPreconnect).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  });

  it('publishes a restrictive csp meta policy', () => {
    const onNavigate = vi.fn();
    render(
      <LanguageProvider>
        <LandingPage onNavigate={onNavigate} />
      </LanguageProvider>
    );

    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(cspMeta).toBeTruthy();

    const cspContent = cspMeta?.getAttribute('content') ?? '';
    expect(cspContent).toContain("default-src 'self'");
    expect(cspContent).toContain("object-src 'none'");
    expect(cspContent).toContain("frame-ancestors 'none'");
    expect(cspContent).toContain("connect-src 'self'");
  });
});
