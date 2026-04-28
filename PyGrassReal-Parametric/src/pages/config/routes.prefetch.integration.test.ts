import { telemetry } from '../telemetry/telemetry';
import { PAGE_LOADERS, prefetchPageByPath } from './routes';

describe('prefetchPageByPath', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('prefetches known routes and logs prefetch_requested', () => {
    vi.useFakeTimers();
    const debugSpy = vi.spyOn(telemetry, 'debug').mockImplementation(() => {});
    const prefetchSpy = vi
      .spyOn(PAGE_LOADERS.AboutPage, 'prefetch')
      .mockResolvedValue({ default: () => null } as never);

    prefetchPageByPath('/about?from=landing', {
      trigger: 'hover',
      source: 'test.prefetch',
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
    vi.runAllTimers();

    expect(prefetchSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy).toHaveBeenCalledWith(
      'prefetch_requested',
      expect.objectContaining({
        page: 'AboutPage',
        path: '/about',
        trigger: 'hover',
        source: 'test.prefetch',
      })
    );
  });

  it('skips unknown routes and logs prefetch_skipped_unknown_route', () => {
    const debugSpy = vi.spyOn(telemetry, 'debug').mockImplementation(() => {});
    const prefetchSpy = vi
      .spyOn(PAGE_LOADERS.AboutPage, 'prefetch')
      .mockResolvedValue({ default: () => null } as never);

    prefetchPageByPath('/unknown', {
      trigger: 'manual',
      source: 'test.prefetch',
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith(
      'prefetch_skipped_unknown_route',
      expect.objectContaining({
        path: '/unknown',
        pathname: '/unknown',
        trigger: 'manual',
        source: 'test.prefetch',
      })
    );
  });
});
