import { waitFor } from '@testing-library/react';

const OFFLINE_QUEUE_STORAGE_KEY = 'pygrass.telemetry.offline-queue.v2';
const runtimeEnv =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const STAGING_TELEMETRY_ENDPOINT =
  runtimeEnv.TELEMETRY_STAGING_ENDPOINT ?? runtimeEnv.VITE_TELEMETRY_STAGING_ENDPOINT ?? '';

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

const emitBatch = async (
  eventName: `custom.${string}`,
  endpoint: string,
  count: number
) => {
  const telemetryModule = await importFreshTelemetry();
  telemetryModule.setTelemetryEnabled(true);

  for (let index = 0; index < count; index += 1) {
    telemetryModule.telemetry.warn(
      eventName,
      { index, path: '/telemetry-e2e' },
      {
        backendEndpoint: endpoint,
        skipConsole: true,
        skipAnalytics: true,
      }
    );
  }
};

const describeIfStagingConfigured = STAGING_TELEMETRY_ENDPOINT ? describe : describe.skip;

describeIfStagingConfigured('telemetry staging e2e verification', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    setNavigatorOnline(true);
  });

  afterEach(() => {
    setNavigatorOnline(true);
    vi.restoreAllMocks();
  });

  it(
    'delivers signed batches to staging backend and keeps queue empty when online',
    async () => {
      await emitBatch('custom.staging_signature_check', STAGING_TELEMETRY_ENDPOINT, 10);

      await waitFor(
        () => {
          expect(window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)).toBeNull();
        },
        { timeout: 12000 }
      );
    },
    18000
  );

  it(
    'persists offline queue then drains it after network recovery against staging backend',
    async () => {
      setNavigatorOnline(false);
      await emitBatch('custom.staging_offline_queue_check', STAGING_TELEMETRY_ENDPOINT, 10);

      await waitFor(
        () => {
          expect(window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)).not.toBeNull();
        },
        { timeout: 12000 }
      );

      setNavigatorOnline(true);
      window.dispatchEvent(new Event('online'));

      await waitFor(
        () => {
          expect(window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)).toBeNull();
        },
        { timeout: 15000 }
      );
    },
    22000
  );
});
