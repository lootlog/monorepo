import { QueryClient } from "@tanstack/react-query";

const DEFAULT_QUERY_STALE_TIME = 60_000;
const DEFAULT_QUERY_GC_TIME = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_QUERY_STALE_TIME,
      gcTime: DEFAULT_QUERY_GC_TIME,
      retry: 2,
      placeholderData: (previousData: unknown) => previousData,
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
