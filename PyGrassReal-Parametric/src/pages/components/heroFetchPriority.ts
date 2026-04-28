interface NavigatorFetchPriorityHints extends Navigator {
  connection?: {
    saveData?: boolean;
  };
  deviceMemory?: number;
}

export const resolveHeroImageFetchPriority = (): 'high' | 'auto' => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'high';
  }

  const nav = navigator as NavigatorFetchPriorityHints;
  const prefersDataSave = nav.connection?.saveData === true;
  const lowMemoryDevice = typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 2;
  const isMobileViewport =
    typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 680px)').matches : false;

  if (prefersDataSave || (isMobileViewport && lowMemoryDevice) || isMobileViewport) {
    return 'auto';
  }

  return 'high';
};
