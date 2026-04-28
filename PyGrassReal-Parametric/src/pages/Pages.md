# Pages Architecture and Developer Guide

This document is the implementation guide for `src/pages/**`.  
It covers how to use the page layer, how the architecture is composed, and which guardrails must be kept for maintainability and security.

## 1. Lean Shell Architecture

`MainLayout` acts as a lean orchestration shell.  
It keeps routing/telemetry/page lifecycle concerns in one place and delegates domain logic to focused hooks/components.

| Area | Primary file(s) | Responsibility |
| --- | --- | --- |
| Shell orchestration | `components/MainLayout.tsx` | Route transition flow, SEO hook call, telemetry shell wiring, error boundary wrapping |
| Navigation helpers | `components/mainLayoutHelpers.ts` | Route/source parsing, readiness state builders, resource target extraction |
| Performance signals | `components/hooks/usePagePerformance.ts` | Core Web Vitals setup, hydration readiness timing, scroll reset |
| Runtime/system signals | `components/hooks/useSystemMonitoring.ts` | Resource load error capture, offline/online telemetry |
| SEO and head metadata | `components/hooks/useSEO.ts` | Title/meta/OG/Twitter/CSP/resource hints/JSON-LD upserts |
| Docs search | `hooks/useDocsSearch.ts` + `workers/docsSearch.worker.ts` | Worker-first search filtering with telemetry-safe query hashing |
| Static content loading | `data/contentLoaders.ts` + `hooks/usePageData.ts` | Dynamic-import split and cached content access |

Design intent:
- UI components stay mostly declarative.
- Hooks own side effects and browser APIs.
- Utilities stay pure and testable.

## 2. Hook Usage (How To)

### `useDocsSearch`
- Input: `{ language, categories }`
- Output: `{ query, setQuery, filteredCategories }`
- Side effects: worker lifecycle, message protocol (`initialize` / `search`), debounced telemetry for query metadata.

### `useFocusTrap`
- Input: `{ isActive, containerRef, initialFocusRef?, onEscape?, lockBodyScroll? }`
- Output: none (behavioral hook)
- Side effects: keyboard listener for `Tab`/`Escape`, optional body scroll lock.

### `usePageData` family
- APIs: `useNodeCategories`, `useFeatureItems`, `useUseCaseItems`, `useAiProfiles`, `useRoadmapItems`
- Output: `{ data, isLoading }`
- Side effects: first-load dynamic import through cached loader promises.

### `usePagePerformance`
- Input: route, language, page ref, readiness ref
- Output: none
- Side effects: route scroll reset + hydration timing telemetry.

### `useSystemMonitoring`
- Input: `{ resolvedPath, language }`
- Output: none
- Side effects: runtime resource error monitoring and network online/offline telemetry.

### `useSEO`
- Input: route/title/description + optional CSP directives and SRI resources
- Output: none
- Side effects: upsert head tags (meta/link/script), CSP meta, OG/Twitter tags, structured data.

## 3. Docs Search Worker Protocol

Files:
- Main thread: `hooks/useDocsSearch.ts`
- Worker: `workers/docsSearch.worker.ts`

### Request messages

#### `initialize`
Sent when language/content changes.

```ts
{
  type: 'initialize';
  requestId: number;
  categorySignature: string;
  categories: LocalizedNodeDocCategory[];
}
```

#### `search`
Sent when normalized query changes.

```ts
{
  type: 'search';
  requestId: number;
  categorySignature: string;
  normalizedQuery: string;
}
```

### Response messages

#### `search_result`

```ts
{
  type: 'search_result';
  requestId: number;
  normalizedQuery: string;
  categorySignature: string;
  queryHash: string;
  filteredCategories: LocalizedNodeDocCategory[];
}
```

### Protocol rules
- `categorySignature` must match active worker dataset, otherwise results are ignored.
- `requestId` is monotonic; main thread accepts only the latest request result.
- Worker rate-limits burst queries (`SEARCH_RATE_LIMIT_MS`) and coalesces to latest pending request.
- Search telemetry always uses `queryHash`, not raw query text.

## 4. Telemetry Schema Map

Source of truth: `telemetry/events.ts`

| Event | Typical trigger | Business purpose |
| --- | --- | --- |
| `cta_click` | User clicks hero/topbar/footer action | Funnel conversion attribution |
| `language_preference_changed` | User switches language | Localization adoption measurement |
| `section_visible` | Section enters viewport observer | Content engagement depth |
| `route_transition` | In-app navigation starts | Navigation path analysis |
| `page_view` | Route render settles | Core traffic/session analytics |
| `legal_page_access` | Legal route opened | Compliance access audit |
| `docs_search_query` | Docs search query debounced | Docs discoverability optimization |
| `prefetch_chunk_loaded` | Route chunk prefetched successfully | Prefetch ROI tracking |
| `lazy_chunk_loaded` | Route lazy chunk loaded | Runtime loading performance |
| `prefetch_conversion` | Prefetched chunk used by navigation | Prefetch conversion effectiveness |
| `lazy_chunk_load_failed` | Chunk load/import failure | Frontend reliability monitoring |
| `prefetch_requested` | Prefetch requested on hover/focus/manual | Prefetch demand insights |
| `prefetch_skipped_unknown_route` | Prefetch skipped for unresolved route | Route config quality signal |
| `resource_load_error` | Script/image/link resource failed | Client runtime incident detection |
| `network_offline` | Browser offline event | Network resilience tracking |
| `network_online` | Browser online event | Network recovery tracking |
| `hydration_readiness_timing` | Route settles after hydration frame | UX readiness latency trend |
| `telemetry_opt_out` | User disables telemetry | Consent governance evidence |
| `telemetry_opt_in` | User re-enables telemetry | Consent re-activation tracking |
| `react_error_boundary_captured` | Global error boundary catches crash | Frontend stability and triage |
| `interaction_latency` | Timed interaction-to-route transition | Interaction responsiveness KPI |
| `core_web_vital` | LCP/CLS observer report | Web Vitals performance governance |

## 5. Standards and Patterns

### 5.1 A11y and SEO baseline
- Target WCAG AA practices in interactive controls:
  - visible focus states (`:focus-visible`)
  - keyboard-only dialog traversal for mobile nav
  - semantic roles for alerts/dialogs/navigation landmarks
- SEO minimum for page routes:
  - canonical URL
  - `description`, OpenGraph, Twitter image metadata
  - JSON-LD software/application graph
  - CSP meta and resource hints for critical external domains

### 5.2 Localization workflow
- Text intended for multilingual UI must use `LocalizedText` and `localizeText`.
- Add new translatable content at data layer (`data/*.ts`) as `{ th, en }`.
- Keep `LanguageCode` and `LanguageProvider` as the only source of active locale state.
- Avoid embedding route/business logic in translation objects; keep them pure strings.

### 5.3 Security guardrails
- `target="_blank"` links must include `rel="noopener noreferrer"`.
- `dangerouslySetInnerHTML` is disallowed by lint guard unless sanitized and reviewed.
- Telemetry payloads are scrubbed and size-limited before backend dispatch.
- Regression guard file: `SecurityAudit.guard.test.ts`.

## 6. Data Splitting Strategy (`contentLoaders.ts`)

Current approach:
- Large static datasets remain in separate modules (`docsContent`, `siteContent`).
- Loaders use dynamic import and memoized module promises.

Use dynamic import when:
- Payload is static but not required for first paint.
- Data is route/section specific.
- Content size growth can meaningfully impact initial bundle parse time.

Keep eager import when:
- Small constants are needed on every route.
- Delayed loading would hurt perceived responsiveness more than it helps bundle size.

Practical checklist before adding new content loader:
1. Is this content required above the fold on initial route?
2. Does it exceed trivial inline constant size?
3. Can the UI show a deterministic loading state while module resolves?
4. Is there a stable cache point (module-level promise) to prevent repeated imports?
