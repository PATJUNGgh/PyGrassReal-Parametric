import { PAGE_LOADERS, prefetchPageByPath, resolveAdaptiveIdleTimeoutForTesting } from './routes';

interface MutableNavigator extends Navigator {
  connection?: { effectiveType?: string; saveData?: boolean };
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

const setNavigatorHints = (hints: {
  connection?: { effectiveType?: string; saveData?: boolean };
  deviceMemory?: number;
  hardwareConcurrency?: number;
}) => {
  const nav = window.navigator as MutableNavigator;
  Object.defineProperty(nav, 'connection', {
    configurable: true,
    value: hints.connection,
  });
  Object.defineProperty(nav, 'deviceMemory', {
    configurable: true,
    value: hints.deviceMemory,
  });
  Object.defineProperty(nav, 'hardwareConcurrency', {
    configurable: true,
    value: hints.hardwareConcurrency,
  });
};

describe('routes adaptive idle scheduling', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      value: undefined,
    });
  });

  it('returns baseline timeout for capable devices', () => {
    setNavigatorHints({
      connection: { effectiveType: '4g', saveData: false },
      deviceMemory: 8,
      hardwareConcurrency: 8,
    });

    expect(resolveAdaptiveIdleTimeoutForTesting()).toBe(180);
  });

  it('increases timeout for constrained devices and network hints', () => {
    setNavigatorHints({
      connection: { effectiveType: '2g', saveData: true },
      deviceMemory: 2,
      hardwareConcurrency: 2,
    });

    const timeoutMs = resolveAdaptiveIdleTimeoutForTesting();
    expect(timeoutMs).toBeGreaterThanOrEqual(800);
    expect(timeoutMs).toBeLessThanOrEqual(900);
  });

  it('passes adaptive timeout into requestIdleCallback prefetch scheduling', async () => {
    setNavigatorHints({
      connection: { effectiveType: '3g', saveData: true },
      deviceMemory: 4,
      hardwareConcurrency: 4,
    });

    const prefetchSpy = vi
      .spyOn(PAGE_LOADERS.AboutPage, 'prefetch')
      .mockResolvedValue({ default: () => null } as never);
    const requestIdleCallbackSpy = vi.fn(() => 1);

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      value: requestIdleCallbackSpy,
    });

    const expectedTimeout = resolveAdaptiveIdleTimeoutForTesting();

    prefetchPageByPath('/about', {
      trigger: 'manual',
      source: 'test.adaptive_idle',
    });

    expect(requestIdleCallbackSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ timeout: expectedTimeout })
    );

    const idleCallback = requestIdleCallbackSpy.mock.calls[0][0] as () => void;
    idleCallback();
    await Promise.resolve();
    expect(prefetchSpy).toHaveBeenCalledTimes(1);
  });
});
