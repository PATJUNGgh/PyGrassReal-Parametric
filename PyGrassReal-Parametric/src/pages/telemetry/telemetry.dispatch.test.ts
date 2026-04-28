import { waitFor } from '@testing-library/react';

const OFFLINE_QUEUE_STORAGE_KEY = 'pygrass.telemetry.offline-queue.v2';

const importFreshTelemetry = async () => {
  vi.resetModules();
  return import('./telemetry');
};

const setNavigatorOnline = (isOnline: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: isOnline,
  });
};

describe('telemetry dispatch behavior', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    setNavigatorOnline(true);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    setNavigatorOnline(true);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('batches warn events and sends one backend request at batch threshold', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const telemetryModule = await importFreshTelemetry();
    telemetryModule.setTelemetryEnabled(true);

    for (let index = 0; index < 10; index += 1) {
      telemetryModule.telemetry.warn(
        'custom.batch_warn_event',
        { index },
        {
          skipConsole: true,
          skipAnalytics: true,
        }
      );
    }

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    });

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const requestBody = JSON.parse(String(requestInit.body)) as {
      events: Array<{ eventName: string; level: string }>;
    };

    expect(requestBody.events).toHaveLength(10);
    expect(requestBody.events.every((event) => event.eventName === 'custom.batch_warn_event')).toBe(true);
    expect(requestBody.events.every((event) => event.level === 'warn')).toBe(true);
  });

  it('queues batched events when offline and retries on online event', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const telemetryModule = await importFreshTelemetry();
    telemetryModule.setTelemetryEnabled(true);
    setNavigatorOnline(false);

    for (let index = 0; index < 10; index += 1) {
      telemetryModule.telemetry.warn(
        'custom.offline_warn_event',
        { index },
        {
          skipConsole: true,
          skipAnalytics: true,
        }
      );
    }

    await waitFor(() => {
      expect(window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)).not.toBeNull();
    });
    expect(fetchMock).not.toHaveBeenCalled();

    setNavigatorOnline(true);
    window.dispatchEvent(new Event('online'));

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)).toBeNull();
    });
  });

  it('emits skipSampling events into breadcrumbs for critical signals', async () => {
    const telemetryModule = await importFreshTelemetry();
    telemetryModule.setTelemetryEnabled(true);
    const initialCount = telemetryModule.getTelemetryBreadcrumbs().length;

    telemetryModule.emitTelemetry(
      'debug',
      'custom.critical_sampling_override',
      { path: '/sampling' },
      {
        skipSampling: true,
        skipBackend: true,
        skipAnalytics: true,
        skipConsole: true,
      }
    );

    const breadcrumbs = telemetryModule.getTelemetryBreadcrumbs();
    expect(breadcrumbs).toHaveLength(initialCount + 1);
    expect(breadcrumbs[breadcrumbs.length - 1]).toEqual(
      expect.objectContaining({
        eventName: 'custom.critical_sampling_override',
        path: '/sampling',
      })
    );
  });

  it('blocks normal events after opt-out but still allows skipSampling critical events', async () => {
    const telemetryModule = await importFreshTelemetry();
    telemetryModule.setTelemetryEnabled(false);
    const initialCount = telemetryModule.getTelemetryBreadcrumbs().length;

    telemetryModule.emitTelemetry(
      'info',
      'custom.suppressed_after_opt_out',
      { path: '/opt-out' },
      {
        skipBackend: true,
        skipAnalytics: true,
        skipConsole: true,
      }
    );
    expect(telemetryModule.getTelemetryBreadcrumbs()).toHaveLength(initialCount);

    telemetryModule.emitTelemetry(
      'warn',
      'custom.critical_after_opt_out',
      { path: '/opt-out' },
      {
        skipSampling: true,
        skipBackend: true,
        skipAnalytics: true,
        skipConsole: true,
      }
    );

    const breadcrumbs = telemetryModule.getTelemetryBreadcrumbs();
    expect(breadcrumbs).toHaveLength(initialCount + 1);
    expect(breadcrumbs[breadcrumbs.length - 1]).toEqual(
      expect.objectContaining({
        eventName: 'custom.critical_after_opt_out',
      })
    );
  });

  it('generates non-reversible anonymous session ids with strong random format', async () => {
    const telemetryModule = await importFreshTelemetry();
    const sessionId = telemetryModule.getAnonymousSessionId();

    expect(sessionId).toMatch(
      /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|sid_[0-9a-f]{32})$/i
    );
    expect(sessionId).not.toMatch(/_[0-9a-f]{10,}$/i);
  });

  it('hardens client-error payload shape and emits a batch signature', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const telemetryModule = await importFreshTelemetry();
    telemetryModule.setTelemetryEnabled(true);

    const longStack = 'stack-line '.repeat(500);
    for (let index = 0; index < 10; index += 1) {
      telemetryModule.telemetry.error(
        telemetryModule.TELEMETRY_EVENT.REACT_ERROR_BOUNDARY_CAPTURED,
        {
          errorName: 'BoundaryError',
          errorMessage: 'Unexpected runtime failure',
          errorStack: longStack,
          componentStack: longStack,
          runtime: {
            path: '/docs',
            language: 'en',
            customInternalFlag: 'should-not-leak',
          },
          stateSnapshot: {
            pendingNavigation: { toPath: '/docs' },
            authToken: 'sensitive-token-value',
          },
          secretPayload: 'must-be-dropped',
        },
        {
          skipConsole: true,
          skipAnalytics: true,
          backendEndpoint: telemetryModule.DEFAULT_CLIENT_ERROR_ENDPOINT,
        }
      );
    }

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    });

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const requestBody = JSON.parse(String(requestInit.body)) as {
      batchSignature: string;
      events: Array<{ payload: Record<string, unknown> }>;
    };

    expect(requestBody.batchSignature).toMatch(/^(sha256|fnv1a):/);
    const firstPayload = requestBody.events[0]?.payload ?? {};
    expect(firstPayload).not.toHaveProperty('secretPayload');
    expect(firstPayload.runtime).toEqual(
      expect.objectContaining({
        path: '/docs',
        language: 'en',
      })
    );
    expect((firstPayload.runtime as Record<string, unknown>).customInternalFlag).toBeUndefined();
    expect(typeof firstPayload.errorStack).toBe('string');
    expect((firstPayload.errorStack as string).length).toBeLessThanOrEqual(2403);
  });
});
