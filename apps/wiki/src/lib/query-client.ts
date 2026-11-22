import { QueryClient } from "@tanstack/react-query";
import { shouldRetryQuery } from "@lootlog/client/transport";

const isDev = import.meta.env.MODE === "development";

export function createQueryClient() {
  const isServer = typeof window === "undefined";

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: isDev ? 0 : 30_000,
        gcTime: isServer ? Number.POSITIVE_INFINITY : 1000 * 60 * 60 * 24,
        retry: isServer ? 0 : shouldRetryQuery,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
        networkMode: "online",
      },
      mutations: {
        retry: 0,
        networkMode: "online",
      },
      dehydrate: {
        shouldDehydrateQuery: (query) => query.state.status === "success",
      },
    },
  });
}
