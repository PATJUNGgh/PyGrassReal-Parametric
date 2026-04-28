import { resolveHeroImageFetchPriority } from './heroFetchPriority';

interface MutableNavigator extends Navigator {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
}

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: /max-width:\s*680px/.test(query) ? width <= 680 : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
};

const setNavigatorHints = (hints: { saveData?: boolean; deviceMemory?: number }) => {
  const nav = window.navigator as MutableNavigator;
  Object.defineProperty(nav, 'connection', {
    configurable: true,
    value: { saveData: hints.saveData ?? false },
  });
  Object.defineProperty(nav, 'deviceMemory', {
    configurable: true,
    value: hints.deviceMemory,
  });
};

describe('Hero logo fetch priority', () => {
  it('uses high priority for desktop-like viewports', () => {
    setViewportWidth(1280);
    setNavigatorHints({ saveData: false, deviceMemory: 8 });
    expect(resolveHeroImageFetchPriority()).toBe('high');
  });

  it('falls back to auto priority on narrow/mobile viewports', () => {
    setViewportWidth(420);
    setNavigatorHints({ saveData: false, deviceMemory: 8 });
    expect(resolveHeroImageFetchPriority()).toBe('auto');
  });

  it('falls back to auto priority when save-data is enabled', () => {
    setViewportWidth(1280);
    setNavigatorHints({ saveData: true, deviceMemory: 8 });
    expect(resolveHeroImageFetchPriority()).toBe('auto');
  });
});
