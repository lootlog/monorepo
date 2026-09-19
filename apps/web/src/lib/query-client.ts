import { QueryClient, keepPreviousData } from "@tanstack/react-query";
import { getApiErrorStatus } from "@lootlog/client/transport";

const DEFAULT_QUERY_STALE_TIME = 60_000;

const DEFAULT_QUERY_GC_TIME = 1000 * 60 * 60 * 24;

const MAX_QUERY_RETRIES = 2;

const REQUEST_TIMEOUT_STATUS = 408;

const TOO_MANY_REQUESTS_STATUS = 429;

/**
 * A client error is an answer, not a failure: retrying a 403 or 404 only
 * delays the screen that explains it by the full backoff.
 */
export const shouldRetryQuery = (failureCount: number, error: Error) => {
  const status = getApiErrorStatus(error);

  const isFinalClientError =
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== REQUEST_TIMEOUT_STATUS &&
    status !== TOO_MANY_REQUESTS_STATUS;

  return !isFinalClientError && failureCount < MAX_QUERY_RETRIES;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_QUERY_STALE_TIME,
      gcTime: DEFAULT_QUERY_GC_TIME,
      retry: shouldRetryQuery,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      networkMode: "online",
    },
    mutations: {
      retry: 1,
      networkMode: "online",
    },
  },
});
