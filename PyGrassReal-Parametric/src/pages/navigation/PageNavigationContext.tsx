import { createContext, useContext, type ReactNode } from 'react';

export interface PageNavigateOptions {
  source?: string;
}

interface PageNavigationContextValue {
  navigate: (path: string, options?: PageNavigateOptions) => void;
  currentPath: string;
}

const PageNavigationContext = createContext<PageNavigationContextValue | null>(null);

interface PageNavigationProviderProps {
  value: PageNavigationContextValue;
  children: ReactNode;
}

export function PageNavigationProvider({ value, children }: PageNavigationProviderProps) {
  return <PageNavigationContext.Provider value={value}>{children}</PageNavigationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePageNavigation() {
  const context = useContext(PageNavigationContext);
  if (!context) {
    throw new Error('usePageNavigation must be used within a PageNavigationProvider');
  }
  return context;
}
