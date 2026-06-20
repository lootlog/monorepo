import type {
  EnsureQueryDataOptions,
  FetchInfiniteQueryOptions,
  FetchQueryOptions,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

const DEFAULT_ROUTE_PREFETCH_STALE_TIME = 60_000;

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
