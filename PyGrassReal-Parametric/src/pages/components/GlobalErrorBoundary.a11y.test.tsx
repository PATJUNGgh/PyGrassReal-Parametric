import { render, screen } from '@testing-library/react';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';

function CrashComponent() {
  throw new Error('Simulated crash');
}

describe('GlobalErrorBoundary accessibility', () => {
  it('renders an accessible fallback alert when a child crashes', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(
        <GlobalErrorBoundary language="en">
          <CrashComponent />
        </GlobalErrorBoundary>
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /unexpected runtime error/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('forwards error details through onErrorCaptured for external logging integrations', () => {
    const onErrorCaptured = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue({ ok: true } as Response);

    try {
      render(
        <GlobalErrorBoundary language="en" onErrorCaptured={onErrorCaptured}>
          <CrashComponent />
        </GlobalErrorBoundary>
      );
    } finally {
      consoleErrorSpy.mockRestore();
      fetchSpy.mockRestore();
    }

    expect(onErrorCaptured).toHaveBeenCalledTimes(1);
    expect(onErrorCaptured.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
