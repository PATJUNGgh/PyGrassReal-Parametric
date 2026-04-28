import {
  buildNodeDocSearchIndex,
  filterNodeDocCategories,
  hashQuery,
  normalizeSearchQuery,
  type LocalizedNodeDocCategory,
  type NodeDocSearchIndexEntry,
} from '../docsSearchUtils';

interface DocsSearchInitializeWorkerRequest {
  /** Initializes worker index for the current localized docs dataset. */
  type: 'initialize';
  requestId: number;
  categorySignature: string;
  categories: LocalizedNodeDocCategory[];
}

interface DocsSearchRunWorkerRequest {
  /** Executes a search query against the active indexed dataset. */
  type: 'search';
  requestId: number;
  categorySignature: string;
  normalizedQuery: string;
}

type DocsSearchWorkerRequest =
  | DocsSearchInitializeWorkerRequest
  | DocsSearchRunWorkerRequest;

interface DocsSearchResultWorkerResponse {
  /** Responds with filtered categories for the latest accepted search request. */
  type: 'search_result';
  requestId: number;
  normalizedQuery: string;
  categorySignature: string;
  queryHash: string;
  filteredCategories: LocalizedNodeDocCategory[];
}

let searchIndex: NodeDocSearchIndexEntry[] = [];
let activeCategorySignature = '';
let pendingSearchRequest: DocsSearchRunWorkerRequest | null = null;
let pendingSearchTimerId: number | null = null;
let lastSearchProcessedAtMs = 0;

const SEARCH_RATE_LIMIT_MS = 45;

const clearPendingSearchTimer = () => {
  if (pendingSearchTimerId === null) {
    return;
  }

  self.clearTimeout(pendingSearchTimerId);
  pendingSearchTimerId = null;
};

const flushPendingSearchRequest = () => {
  const request = pendingSearchRequest;
  pendingSearchRequest = null;
  pendingSearchTimerId = null;
  if (!request) {
    return;
  }

  if (request.categorySignature !== activeCategorySignature) {
    return;
  }

  const normalizedQuery = normalizeSearchQuery(request.normalizedQuery);
  const response: DocsSearchResultWorkerResponse = {
    type: 'search_result',
    requestId: request.requestId,
    normalizedQuery,
    categorySignature: request.categorySignature,
    queryHash: hashQuery(normalizedQuery),
    filteredCategories: filterNodeDocCategories(searchIndex, normalizedQuery),
  };

  lastSearchProcessedAtMs = Date.now();
  self.postMessage(response);
};

const schedulePendingSearchFlush = () => {
  if (!pendingSearchRequest) {
    return;
  }

  if (pendingSearchTimerId !== null) {
    return;
  }

  const elapsedMs = Date.now() - lastSearchProcessedAtMs;
  const waitMs = Math.max(0, SEARCH_RATE_LIMIT_MS - elapsedMs);
  if (waitMs === 0) {
    flushPendingSearchRequest();
    if (pendingSearchRequest) {
      schedulePendingSearchFlush();
    }
    return;
  }

  pendingSearchTimerId = self.setTimeout(() => {
    flushPendingSearchRequest();
    if (pendingSearchRequest) {
      schedulePendingSearchFlush();
    }
  }, waitMs);
};

self.onmessage = (event: MessageEvent<DocsSearchWorkerRequest>) => {
  const request = event.data;

  if (request.type === 'initialize') {
    clearPendingSearchTimer();
    pendingSearchRequest = null;
    searchIndex = buildNodeDocSearchIndex(request.categories);
    activeCategorySignature = request.categorySignature;
    lastSearchProcessedAtMs = 0;
    return;
  }

  if (request.categorySignature !== activeCategorySignature) {
    return;
  }

  pendingSearchRequest = request;
  schedulePendingSearchFlush();
};

export {};
