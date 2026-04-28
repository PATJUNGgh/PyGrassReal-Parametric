import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LanguageProvider } from '../i18n/language';
import TermsOfService from './legal/TermsOfService';
import LandingPage from './LandingPage';
import { setTelemetryEnabled, telemetry } from './telemetry/telemetry';

const getTelemetryPayloads = (
  infoSpy: { mock: { calls: unknown[][] } },
  eventName: string
): Array<Record<string, unknown>> => {
  return infoSpy.mock.calls
    .filter((call) => call[0] === eventName)
    .map((call) => (call[1] ?? {}) as Record<string, unknown>);
};

const installIntersectionObserverMock = () => {
  const original = window.IntersectionObserver;
  let callback: IntersectionObserverCallback | null = null;

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [0.35, 0.6];

    constructor(nextCallback: IntersectionObserverCallback) {
      callback = nextCallback;
    }

    disconnect = vi.fn();
    observe = vi.fn();
    takeRecords = vi.fn(() => []);
    unobserve = vi.fn();
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });

  return {
    triggerVisible: () => {
      if (!callback) {
        throw new Error('IntersectionObserver callback was not registered');
      }

      callback(
        [
          {
            isIntersecting: true,
            intersectionRatio: 0.55,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver
      );
    },
    restore: () => {
      Object.defineProperty(window, 'IntersectionObserver', {
        configurable: true,
        writable: true,
        value: original,
      });
    },
  };
};

describe('MainLayout telemetry integration', () => {
  beforeEach(() => {
    setTelemetryEnabled(true);
    window.localStorage.setItem('pygrass-language', 'en');
    window.history.replaceState(null, '', '/');
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('emits page_view and legal_page_access when opening legal pages', async () => {
    const infoSpy = vi.spyOn(telemetry, 'info').mockImplementation(() => {});

    window.history.replaceState(null, '', '/legal/terms');
    render(
      <LanguageProvider>
        <TermsOfService onNavigate={vi.fn()} />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(getTelemetryPayloads(infoSpy, 'page_view').length).toBeGreaterThan(0);
      expect(getTelemetryPayloads(infoSpy, 'legal_page_access').length).toBeGreaterThan(0);
    });

    expect(getTelemetryPayloads(infoSpy, 'legal_page_access')[0]).toEqual(
      expect.objectContaining({
        path: '/legal/terms',
        consentAudit: true,
      })
    );
  });

  it('emits cta_click and route_transition from hero CTA navigation', () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    const infoSpy = vi.spyOn(telemetry, 'info').mockImplementation(() => {});

    render(
      <LanguageProvider>
        <LandingPage onNavigate={onNavigate} />
      </LanguageProvider>
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /open dashboard/i }));
      vi.advanceTimersByTime(200);
    });

    expect(getTelemetryPayloads(infoSpy, 'cta_click')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          area: 'hero',
          ctaId: 'open_dashboard',
          path: '/',
        }),
      ])
    );
    expect(getTelemetryPayloads(infoSpy, 'route_transition')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromPath: '/',
          toPath: '/dashboard',
          source: 'hero.cta.open_dashboard',
        }),
      ])
    );

    expect(onNavigate).toHaveBeenCalledWith('/dashboard', { source: 'hero.cta.open_dashboard' });
  });

  it('emits language_preference_changed from language switcher interaction', () => {
    const infoSpy = vi.spyOn(telemetry, 'info').mockImplementation(() => {});
    const { container } = render(
      <LanguageProvider>
        <LandingPage onNavigate={vi.fn()} />
      </LanguageProvider>
    );

    const nextLanguageButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.pg-lang-button')
    ).find((button) => button.getAttribute('aria-pressed') === 'false');

    expect(nextLanguageButton).toBeTruthy();
    fireEvent.click(nextLanguageButton as HTMLButtonElement);

    expect(getTelemetryPayloads(infoSpy, 'language_preference_changed')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromLanguage: 'en',
          toLanguage: (nextLanguageButton as HTMLButtonElement).lang,
          path: '/',
        }),
      ])
    );
  });

  it('emits section_visible when a section crosses visibility threshold', () => {
    const intersectionObserverMock = installIntersectionObserverMock();
    const infoSpy = vi.spyOn(telemetry, 'info').mockImplementation(() => {});

    try {
      render(
        <LanguageProvider>
          <LandingPage onNavigate={vi.fn()} />
        </LanguageProvider>
      );

      intersectionObserverMock.triggerVisible();

      expect(getTelemetryPayloads(infoSpy, 'section_visible')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '/',
            language: 'en',
            visibleRatio: 0.55,
          }),
        ])
      );
    } finally {
      intersectionObserverMock.restore();
    }
  });

  it('emits telemetry_opt_out from footer telemetry toggle', () => {
    const infoSpy = vi.spyOn(telemetry, 'info').mockImplementation(() => {});

    render(
      <LanguageProvider>
        <LandingPage onNavigate={vi.fn()} />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /disable telemetry/i }));

    expect(infoSpy).toHaveBeenCalledWith(
      'telemetry_opt_out',
      expect.objectContaining({
        path: '/',
        language: 'en',
      }),
      expect.objectContaining({
        skipSampling: true,
      })
    );
    expect(screen.getByRole('button', { name: /enable telemetry/i })).toBeInTheDocument();
  });

  it('navigates from topbar and emits route_transition with topbar source', () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    const infoSpy = vi.spyOn(telemetry, 'info').mockImplementation(() => {});
    const { container } = render(
      <LanguageProvider>
        <LandingPage onNavigate={onNavigate} />
      </LanguageProvider>
    );

    const desktopNav = container.querySelector('nav.pg-topnav-desktop');
    expect(desktopNav).toBeTruthy();
    act(() => {
      fireEvent.click(within(desktopNav as HTMLElement).getByRole('button', { name: /^docs$/i }));
      vi.advanceTimersByTime(200);
    });

    expect(onNavigate).toHaveBeenCalledWith('/docs', { source: 'topbar.desktop.nav' });
    expect(getTelemetryPayloads(infoSpy, 'route_transition')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromPath: '/',
          toPath: '/docs',
          source: 'topbar.desktop.nav',
        }),
      ])
    );
  });

  it('navigates from footer and emits route_transition with footer source', () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    const infoSpy = vi.spyOn(telemetry, 'info').mockImplementation(() => {});
    const { container } = render(
      <LanguageProvider>
        <LandingPage onNavigate={onNavigate} />
      </LanguageProvider>
    );

    const footer = container.querySelector('footer.pg-footer');
    expect(footer).toBeTruthy();
    act(() => {
      fireEvent.click(within(footer as HTMLElement).getByRole('button', { name: /^docs$/i }));
      vi.advanceTimersByTime(200);
    });

    expect(onNavigate).toHaveBeenCalledWith('/docs', { source: 'footer.product.docs' });
    expect(getTelemetryPayloads(infoSpy, 'route_transition')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromPath: '/',
          toPath: '/docs',
          source: 'footer.product.docs',
        }),
      ])
    );
  });

  it('emits hydration_readiness_timing after initial page hydration', async () => {
    const infoSpy = vi.spyOn(telemetry, 'info').mockImplementation(() => {});
    render(
      <LanguageProvider>
        <LandingPage onNavigate={vi.fn()} />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(getTelemetryPayloads(infoSpy, 'hydration_readiness_timing')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '/',
            phase: 'initial_load',
            source: 'initial_load',
          }),
        ])
      );
    });
  });
});
