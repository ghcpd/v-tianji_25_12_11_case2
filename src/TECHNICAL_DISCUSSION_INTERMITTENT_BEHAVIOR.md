Title: Technical Discussion on Intermittent Behavior and Architectural Consistency
Description: Facilitate a structured engineering discussion by analyzing potential architectural issues related to state management, caching, and data flow, highlighting risks, trade-offs, questions, and areas requiring team alignment.

## Summary

This document summarizes quick findings on architectural patterns and places to investigate further to explain intermittent symptoms (stale data, re-renders, performance variance, cache surprises). It is intended to facilitate a focused discussion rather than prescribe concrete fixes.

## Where I looked (selected files)

- Review context: [src/contexts/ReviewContext.tsx](src/contexts/ReviewContext.tsx#L1-L250)
- Zustand store: [src/store/reviewStore.ts](src/store/reviewStore.ts#L1-L300)
- HTTP service: [src/services/reviewService.ts](src/services/reviewService.ts#L1-L300)
- Cache layer: [src/services/cacheManager.ts](src/services/cacheManager.ts#L1-L250)
- Sync helper: [src/hooks/useReviewSync.ts](src/hooks/useReviewSync.ts#L1-L20)
- App entry toggling store usage: [src/App.tsx](src/App.tsx#L1-L50)

## Concrete issues/observations

1. **Dual state management modes (React local state vs global store)**
   - The `ReviewProvider` supports two modes via a `useStore` flag (see [ReviewContext.tsx](src/contexts/ReviewContext.tsx#L1-L250)). This creates inconsistent behavior and duplicated logic for fetch/add/update/delete operations.
   - When `useStore` is false, the provider manages local state and its own cache actions; when true, it delegates to Zustand store. This duality can cause divergence when some code paths read from the store and others from context-local state.

2. **Inconsistent cache key naming and invalidation**
   - Cache writes use multiple key formats: `reviews`, `reviews:{}`, `reviews:${JSON.stringify(filters)}`, and `review:${id}` across the codebase. This prevents deterministic invalidation and causes stale cache reads (see [reviewService.ts](src/services/reviewService.ts#L120-L200), [reviewStore.ts](src/store/reviewStore.ts#L1-L140), [ReviewContext.tsx](src/contexts/ReviewContext.tsx#L140-L180)).
   - Invalidating `reviews` cache after creates/updates/deletes is inconsistent — some paths delete `reviews:{}`; others delete `reviews`. Invalidation can be silently skipped.

3. **Sync vs async cache access mismatch**
   - `reviewService.getReviews` calls `cacheManager.get` (a sync-only memory read) and `getReview` calls `getAsync`. If a value is only in IndexedDB (and not memory), `get` misses it and fetches again. See [services/reviewService.ts](src/services/reviewService.ts#L150-L160) and [services/cacheManager.ts](src/services/cacheManager.ts#L90-L120).

4. **Weak equality check for subscribing to store changes**
   - The subscription in `ReviewProvider` compares only array lengths ( `equalityFn: (a, b) => a.length === b.length` ). This misses content changes with same length (edits, reorder, nested prop changes) and results in stale UI. See [ReviewContext.tsx](src/contexts/ReviewContext.tsx#L33-L40).

5. **Zustand persistence storing potentially stale data**
   - The store persists `reviews` into localStorage (`persist`) and doesn't embed freshness metadata. Without a run-time freshness check, the app may display stale data on load. See [store/reviewStore.ts](src/store/reviewStore.ts#L1-L60).

6. **Context provider re-creates object and can cause re-renders**
   - `ReviewContext` constructs a fresh `value` object on each provider render which can cause consumers to re-render even if only a subset of fields changed. Even though functions are memoized with `useCallback`, wrapping with `useMemo` would be more explicit and may reduce unnecessary consumer re-renders.

7. **Polling and sync are naive**
   - `useReviewSync` compares `store.reviews.length` and `context.reviews.length` every 5s; length-only checks miss content changes. This can cause both missed updates and unnecessary fetches, depending on the timing. See [hooks/useReviewSync.ts](src/hooks/useReviewSync.ts#L1-L18).

8. **Cache manager API & behavior mismatches**
   - `CacheManager` offers both `get` and `getAsync` (memory-only and memory+IndexedDB) and `delete` returns void (sync). Some callers `await` `delete()`, causing a false assumption of synchronicity; this is a subtle source of confusion. See [services/cacheManager.ts](src/services/cacheManager.ts#L1-L220).

9. **Request cache/deduplication keys may vary (param order)**
   - Deduplication keys use `JSON.stringify(filters)` and `getCacheKey` uses `config.params` JSON; small differences (param ordering, default param values) could create multiple keys for the same logical request, reducing dedupe effectiveness and causing more network requests.

10. **Code paths do not always honor server caching headers**
   - Interceptor logic conditionally caches responses when `etag` is present; other flows set TTLs explicitly. If the server relies on `ETag`, partial caching might bypass intended conditional get behavior.

## How these can cause the observed symptoms (mapped to user-reported problems)

- **Data occasionally appears stale**: inconsistent cache keys + persisted store + weak subscription criteria + caching misses (sync vs async) lead to stale data showing in UI.
- **Unexpected re-renders**: provider re-creation, inconsistently memoized elements, and varied subscriptions (context + store) cause over-rendering or unnecessary updates.
- **Performance inconsistencies**: local caching and persistent storage increase data volume and startup cost, while poor deduplication and repeated fetches (due to cache misses) cause variable performance.
- **Cache behavior not matching expectations**: automatic interceptor caching vs explicit cache writes combined with inconsistent key naming results in data being read/written under different keys.

## Trade-offs and perspectives

- **Two-state model (local + global)**
  - If the application requires a transitional flag for migrating to Zustand, keep `useStore` but clearly document the scope. Otherwise, choose a single approach to reduce complexity.

- **Local persistent cache vs server-fresh reads**
  - Persisting data in localStorage improves cold start UX but requires clear freshness or TTL logic, ideally a version stamp or `lastFetchTime` to decide when to revalidate.

- **Automatic caching in interceptor vs application-level cache**
  - Interceptor-based cache is convenient but couples HTTP transport with business logic. If the team needs stronger control (e.g., filter-aware cache keys), consider centralizing caching in the service layer around well-defined keys.

## Suggested discussion topics for the team

1. Pick the canonical state model: either local provider-only for local component state or a centralized global store with `ReviewProvider` as a thin adapter. Clarify the transition plan if dual-mode is required.
2. Agree a cache key strategy for queries (canonical naming for filter keys, always using `JSON.stringify` with a normalized filter shape, or hashed strings) and make it consistent across `reviewService`, `reviewStore`, and `ReviewContext`.
3. Decide which layer owns cache invalidation and TTL semantics: HTTP layer (service), cache manager, or store? Centralize this responsibility to reduce mistakes.
4. Determine a revalidation strategy for persisted state: versioning, `lastFetchTime`, or an initial freshness check on startup.
5. Check where `get` vs `getAsync` should be used and make it consistent: prefer `getAsync` for code paths that should read IndexDB fallback.
6. Consider better equality checks for store subscriptions and more explicit memoization for context `value` to avoid unnecessary re-renders.
7. If polling is required, refine `useReviewSync` to check content hashes or last update timestamps instead of array length.

## Clarifying questions (to help scope next work)

1. Is there a strong reason to keep `useStore` toggling `ReviewProvider`? If it’s for migration, can we define a sunset plan? (See [src/App.tsx](src/App.tsx#L1-L50).)
2. Does the server provide `ETag`/`Last-Modified` headers or pub/sub for change notifications? If yes, should we leverage conditional requests or a push mechanism instead of polling?
3. How critical is startup latency vs offline read-instant display? Do we prefer fresh data on load or instant display with revalidation?
4. Do we want to keep `reviews` persisted to localStorage via Zustand? If so, should we add metadata (`lastFetchTime`, `cacheVersion`), or move to a smaller persisted shape?
5. Are there any existing or planned integration tests validating cache behavior across update operations? If not, adding test coverage for read/write and invalidation flows can reduce regressions.

## Risks and technical debt to call out

- The dual-state approach buys flexibility in the short-term, but increases technical debt and long-term maintenance cost. If left, it will continue to cause inconsistencies and cognitive overhead.
- Persisting entire review objects indiscriminately increases risk of leaking stale data and bloating storage and the UI at startup. This creates hard-to-reproduce bugs across environments.
- Relying on ad-hoc cache invalidation without clear keys is fragile; small changes in key formatting will silently break behavior.
- `CacheManager` complexity (in-memory + IndexedDB + cleanup) must be integrated into the cache strategy; if it isn’t, inconsistent use could mean expired entries remain or users see stale data.

## Next steps & low-risk experiments (practical steps for teams)

1. **Audit & standardize cache keys** - Define canonical key names (e.g., `reviews:filterHash` and `review:id`) and search/replace across repo to ensure consistent reads/invalidations. This solves the most direct source of stale reads.
2. **Standardize cache API usage** - Replace `cacheManager.get` with `getAsync` across code paths that should account for persistent storage, to reduce unnecessary fetches.
3. **Add freshness metadata** - Add `lastFetchTime` or `cacheVersion` to the persisted store to allow an initial revalidation flow on startup, or an explicit TTL check.
4. **Replace length-only equality with deep checks or use a checksum** - For the subscription equality function in `ReviewProvider` use a content hash, `JSON.stringify`, or `id` set comparison to detect meaningful changes.
5. **Pick a single state model for primary operations** - Prefer a single canonical model (e.g., Zustand store for global data, provider for small forms) and migrate away from the `useStore` toggle.
6. **Refactor context provider value memoization** - Use `useMemo` to stabilize `value` and reduce unhelpful consumer re-renders.
7. **Add integration tests for cache invalidation flows** - Cover create/update/delete + fetch sequences using mocked service responses and cached states.

## Open follow-up tasks

1. Decide the canonical state approach (local vs store) and update `ReviewProvider` docs/spec.
2. Standardize cache keys, adjust `reviewService`, `ReviewStore`, and `ReviewContext` to use the canonical key format.
3. Update `cacheManager` API to make `delete` return a Promise for correct `await` semantics or make call sites not await it.
4. Switch `get` to `getAsync` across service-level reads if persistent cache matters.
5. Add `lastFetchTime` or `cacheVersion` to persisted store and make initial revalidation deterministic.

## Final notes

This document is intentionally a diagnostic and discussion starter. It is not meant to be a specs document or PR proposal. The listed next steps can be split into low-risk PRs for incremental improvement. If you want, I can prepare a follow-up PR to standardize cache keys and update the `useReviewStore` subscription logic as a focused first change.

----
Generated on: 2025-12-11
