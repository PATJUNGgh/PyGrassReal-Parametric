import { fireEvent, render, screen } from '@testing-library/react';
import { PageNavigationProvider, usePageNavigation } from './PageNavigationContext';

function NavigationProbe() {
  const { currentPath, navigate } = usePageNavigation();

  return (
    <div>
      <output data-testid="current-path">{currentPath}</output>
      <button type="button" onClick={() => navigate('/docs', { source: 'unit-test' })}>
        navigate-docs
      </button>
    </div>
  );
}

function BrokenNavigationProbe() {
  usePageNavigation();
  return null;
}

describe('usePageNavigation', () => {
  it('throws outside provider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(() => render(<BrokenNavigationProbe />)).toThrow(
        'usePageNavigation must be used within a PageNavigationProvider'
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('returns navigate/currentPath from context', () => {
    const navigate = vi.fn();

    render(
      <PageNavigationProvider value={{ navigate, currentPath: '/about' }}>
        <NavigationProbe />
      </PageNavigationProvider>
    );

    expect(screen.getByTestId('current-path')).toHaveTextContent('/about');
    fireEvent.click(screen.getByRole('button', { name: 'navigate-docs' }));
    expect(navigate).toHaveBeenCalledWith('/docs', { source: 'unit-test' });
  });
});
