import { QueryClient, keepPreviousData } from "@tanstack/react-query";
import { shouldRetryQuery } from "@lootlog/client/transport";

const DEFAULT_QUERY_STALE_TIME = 60_000;

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
      retry: 0,
      networkMode: "online",
    },
  },
});
