interface Window {
  gtag?: (
    command: 'event' | 'config' | 'js' | 'set',
    eventName: string,
    eventParams?: Record<string, unknown>
  ) => void;
  dataLayer?: unknown[];
}
