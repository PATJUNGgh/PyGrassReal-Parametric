import { render } from '@testing-library/react';
import { useSEO } from './useSEO';

function SEOHarness() {
  useSEO({
    resolvedPath: '/',
    externalStylesheets: [
      {
        key: 'cdn-style',
        href: 'https://cdn.example.com/app.css',
        integrity: 'sha384-stylehash',
      },
    ],
    externalScripts: [
      {
        key: 'cdn-script',
        src: 'https://cdn.example.com/app.js',
        integrity: 'sha384-scripthash',
        defer: true,
      },
    ],
  });

  return null;
}

describe('useSEO security resource tags', () => {
  it('supports integrity attributes for external stylesheet and script resources', () => {
    render(<SEOHarness />);

    const stylesheet = document.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href="https://cdn.example.com/app.css"]');
    const script = document.querySelector<HTMLScriptElement>('script[src="https://cdn.example.com/app.js"]');

    expect(stylesheet).toBeTruthy();
    expect(stylesheet).toHaveAttribute('integrity', 'sha384-stylehash');
    expect(stylesheet).toHaveAttribute('crossorigin', 'anonymous');
    expect(stylesheet).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

    expect(script).toBeTruthy();
    expect(script).toHaveAttribute('integrity', 'sha384-scripthash');
    expect(script).toHaveAttribute('crossorigin', 'anonymous');
    expect(script).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  });
});
