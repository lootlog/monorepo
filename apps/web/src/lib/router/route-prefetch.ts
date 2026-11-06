import type {
  EnsureQueryDataOptions,
  FetchInfiniteQueryOptions,
  FetchQueryOptions,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

const DEFAULT_ROUTE_PREFETCH_STALE_TIME = 60_000;

export const fetchRouteQueryData = <
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
) =>
  queryClient.fetchQuery({
    staleTime: DEFAULT_ROUTE_PREFETCH_STALE_TIME,
    ...options,
  });

export const ensureRouteQueryData = <
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  options: EnsureQueryDataOptions<TQueryFnData, TError, TData, TQueryKey>,
) =>
  queryClient.ensureQueryData({
    staleTime: DEFAULT_ROUTE_PREFETCH_STALE_TIME,
    ...options,
    revalidateIfStale: true,
  });

export const prefetchRouteQuery = <
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
) =>
  queryClient.prefetchQuery({
    staleTime: DEFAULT_ROUTE_PREFETCH_STALE_TIME,
    ...options,
  });

export const prefetchRouteInfiniteQuery = <
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>(
  queryClient: QueryClient,
  options: FetchInfiniteQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >,
) =>
  queryClient.prefetchInfiniteQuery({
    staleTime: DEFAULT_ROUTE_PREFETCH_STALE_TIME,
    ...options,
  });

const ROUTE_PREFETCH_WAIT_MS = 1_000;

/**
 * Lets a loader hold its navigation until the page's first data has arrived,
 * so the page lands complete instead of filling in piece by piece. A prefetch
 * that fails or outlasts the wait is left to the page, which loads it itself.
 */
export const settleRoutePrefetches = (prefetches: Promise<unknown>[]) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ROUTE_PREFETCH_WAIT_MS);

    void Promise.allSettled(prefetches).then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
