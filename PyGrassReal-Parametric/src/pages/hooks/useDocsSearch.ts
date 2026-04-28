import { useEffect, useMemo, useRef, useState } from 'react';
import type { LanguageCode } from '../../i18n/language';
import type { NodeDocCategory } from '../data/docsContent';
import {
  buildNodeDocSearchIndex,
  filterNodeDocCategories,
  hashQuery,
  localizeNodeDocCategories,
  normalizeSearchQuery,
  type LocalizedNodeDocCategory,
} from '../docsSearchUtils';
import { TELEMETRY_EVENT, telemetry } from '../telemetry/telemetry';

const SEARCH_TELEMETRY_DEBOUNCE_MS = 450;

interface DocsSearchInitializeWorkerRequest {
  type: 'initialize';
  requestId: number;
  categorySignature: string;
  categories: LocalizedNodeDocCategory[];
}

interface DocsSearchRunWorkerRequest {
  type: 'search';
  requestId: number;
  categorySignature: string;
  normalizedQuery: string;
}

type DocsSearchWorkerRequest =
  | DocsSearchInitializeWorkerRequest
  | DocsSearchRunWorkerRequest;

interface DocsSearchResultWorkerResponse {
  type: 'search_result';
  requestId: number;
  normalizedQuery: string;
  categorySignature: string;
  queryHash: string;
  filteredCategories: LocalizedNodeDocCategory[];
}

interface UseDocsSearchOptions {
  /** Current UI language used for content localization and telemetry context. */
  language: LanguageCode;
  /** Raw documentation categories loaded from content modules. */
  categories: readonly NodeDocCategory[];
}

interface UseDocsSearchResult {
  /** Controlled query text entered by the user. */
  query: string;
  /** State setter for query text. */
  setQuery: (nextQuery: string) => void;
  /** Filtered categories returned from worker or fallback main-thread filtering. */
  filteredCategories: LocalizedNodeDocCategory[];
}

interface WorkerSearchResult {
  normalizedQuery: string;
  categorySignature: string;
  queryHash: string;
  filteredCategories: LocalizedNodeDocCategory[];
}

interface SearchMeta {
  normalizedQuery: string;
  queryHash: string;
  resultCategoryCount: number;
}

/**
 * Runs localized docs search with a worker-first strategy.
 *
 * Side effects:
 * - Spins up and tears down a dedicated Web Worker.
 * - Posts initialization/search messages whenever language, docs data, or query changes.
 * - Emits debounced low-priority telemetry for non-empty queries.
 */
export function useDocsSearch({
  language,
  categories,
}: UseDocsSearchOptions): UseDocsSearchResult {
  const [query, setQuery] = useState('');
  const [workerSearchResult, setWorkerSearchResult] = useState<WorkerSearchResult | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const latestSearchRequestIdRef = useRef(0);
  const lastLoggedHashRef = useRef<string | null>(null);

  const localizedCategories = useMemo(
    () => localizeNodeDocCategories(language, categories),
    [categories, language]
  );
  const normalizedQuery = useMemo(() => normalizeSearchQuery(query), [query]);
  const searchIndex = useMemo(
    () => buildNodeDocSearchIndex(localizedCategories),
    [localizedCategories]
  );
  const categorySignature = useMemo(
    () =>
      hashQuery(
        localizedCategories
          .map((category) =>
            `${category.id}:${category.title}:${category.description}:${category.items.join('|')}`
          )
          .join('||')
      ),
    [localizedCategories]
  );

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      return;
    }

    let worker: Worker;
    try {
      worker = new Worker(new URL('../workers/docsSearch.worker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      return;
    }

    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<DocsSearchResultWorkerResponse>) => {
      const response = event.data;
      if (response.type !== 'search_result') {
        return;
      }

      if (response.requestId !== latestSearchRequestIdRef.current) {
        return;
      }

      setWorkerSearchResult({
        normalizedQuery: response.normalizedQuery,
        categorySignature: response.categorySignature,
        queryHash: response.queryHash,
        filteredCategories: response.filteredCategories,
      });
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const request: DocsSearchInitializeWorkerRequest = {
      type: 'initialize',
      requestId,
      categorySignature,
      categories: localizedCategories,
    };

    worker.postMessage(request as DocsSearchWorkerRequest);
  }, [categorySignature, localizedCategories]);

  useEffect(() => {
    if (!normalizedQuery) {
      lastLoggedHashRef.current = null;
      return;
    }

    const worker = workerRef.current;
    if (!worker) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    latestSearchRequestIdRef.current = requestId;

    const request: DocsSearchRunWorkerRequest = {
      type: 'search',
      requestId,
      categorySignature,
      normalizedQuery,
    };

    worker.postMessage(request as DocsSearchWorkerRequest);
  }, [categorySignature, normalizedQuery]);

  const fallbackFilteredCategories = useMemo(() => {
    if (!normalizedQuery) {
      return localizedCategories;
    }

    return filterNodeDocCategories(searchIndex, normalizedQuery);
  }, [localizedCategories, normalizedQuery, searchIndex]);

  const activeWorkerSearchResult = useMemo(() => {
    if (!workerSearchResult || !normalizedQuery) {
      return null;
    }

    if (
      workerSearchResult.normalizedQuery !== normalizedQuery ||
      workerSearchResult.categorySignature !== categorySignature
    ) {
      return null;
    }

    return workerSearchResult;
  }, [categorySignature, normalizedQuery, workerSearchResult]);

  const filteredCategories = useMemo(
    () => activeWorkerSearchResult?.filteredCategories ?? fallbackFilteredCategories,
    [activeWorkerSearchResult, fallbackFilteredCategories]
  );

  const searchMeta = useMemo<SearchMeta | null>(() => {
    if (!normalizedQuery) {
      return null;
    }

    if (activeWorkerSearchResult) {
      return {
        normalizedQuery,
        queryHash: activeWorkerSearchResult.queryHash,
        resultCategoryCount: activeWorkerSearchResult.filteredCategories.length,
      };
    }

    return {
      normalizedQuery,
      queryHash: hashQuery(normalizedQuery),
      resultCategoryCount: fallbackFilteredCategories.length,
    };
  }, [activeWorkerSearchResult, fallbackFilteredCategories.length, normalizedQuery]);

  useEffect(() => {
    if (!searchMeta || searchMeta.normalizedQuery !== normalizedQuery) {
      return;
    }

    const debounceId = window.setTimeout(() => {
      if (lastLoggedHashRef.current === searchMeta.queryHash) {
        return;
      }

      lastLoggedHashRef.current = searchMeta.queryHash;
      telemetry.info(
        TELEMETRY_EVENT.DOCS_SEARCH_QUERY,
        {
          path: window.location.pathname,
          language,
          queryHash: searchMeta.queryHash,
          queryLength: normalizedQuery.length,
          tokenCount: normalizedQuery.split(' ').length,
          hasDigits: /\d/.test(normalizedQuery),
          resultCategoryCount: searchMeta.resultCategoryCount,
        },
        { priority: 'low' }
      );
    }, SEARCH_TELEMETRY_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceId);
    };
  }, [language, normalizedQuery, searchMeta]);

  return {
    query,
    setQuery,
    filteredCategories,
  };
}
