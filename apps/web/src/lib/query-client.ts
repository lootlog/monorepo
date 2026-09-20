import { QueryClient, keepPreviousData } from "@tanstack/react-query";
import { shouldRetryQuery } from "@lootlog/client/transport";

const DEFAULT_QUERY_STALE_TIME = 60_000;

/**
 * Nothing persists the cache and the app stays open all day, so every filter,
 * search and cursor variation would otherwise be retained until the tab closes.
 */
const DEFAULT_QUERY_GC_TIME = 10 * 60_000;

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
      // Writes carry no idempotency key: re-sending one whose response was lost
      // can create a second record. Opt in per mutation, idempotent ones only.
      retry: 0,
      networkMode: "online",
    },
  },
});
