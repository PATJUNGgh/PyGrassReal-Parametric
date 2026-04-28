import { render, waitFor } from '@testing-library/react';
import { TELEMETRY_EVENT, telemetry } from '../telemetry/telemetry';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';

function CrashComponent() {
  throw new Error('Boundary integration crash');
}

describe('GlobalErrorBoundary telemetry integration', () => {
  it('captures runtime error payload with breadcrumbs and state snapshot', async () => {
    const telemetryErrorSpy = vi.spyOn(telemetry, 'error').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onErrorCaptured = vi.fn();

    telemetry.info(
      'custom.breadcrumb_before_crash',
      { path: '/about' },
      {
        skipBackend: true,
        skipAnalytics: true,
        skipConsole: true,
        skipSampling: true,
      }
    );

    try {
      render(
        <GlobalErrorBoundary
          language="en"
          currentPath="/docs"
          errorLogEndpoint="/api/errors-test"
          onErrorCaptured={onErrorCaptured}
          stateSnapshot={{
            pendingNavigation: { toPath: '/docs' },
            authToken: 'super-secret-token',
            nested: {
              password: '123456',
            },
          }}
        >
          <CrashComponent />
        </GlobalErrorBoundary>
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }

    await waitFor(() => {
      expect(telemetryErrorSpy).toHaveBeenCalledTimes(1);
    });

    const [eventName, payload, options] = telemetryErrorSpy.mock.calls[0] as [
      string,
      Record<string, unknown>,
      Record<string, unknown>,
    ];

    expect(eventName).toBe(TELEMETRY_EVENT.REACT_ERROR_BOUNDARY_CAPTURED);
    expect(payload).toEqual(
      expect.objectContaining({
        stateSnapshot: {
          pendingNavigation: {
            toPath: '/docs',
          },
          nested: {},
        },
        runtime: expect.objectContaining({
          path: '/docs',
          language: 'en',
        }),
      })
    );
    expect(payload.stateSnapshot).not.toHaveProperty('authToken');
    expect(payload.breadcrumbs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: 'custom.breadcrumb_before_crash',
        }),
      ])
    );
    expect(options).toEqual(
      expect.objectContaining({
        backendEndpoint: '/api/errors-test',
      })
    );
    expect(onErrorCaptured).toHaveBeenCalledTimes(1);
  });
});
