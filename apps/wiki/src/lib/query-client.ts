import { QueryClient } from "@tanstack/react-query";

const isDev = import.meta.env.MODE === "development";

/**
 * The router's query cache: one per request on the server, whose queries
 * the page's HTML carries to the browser, and one for the browser's visit.
 */
export function createQueryClient() {
  // A server render would rather leave a query to the browser than wait out
  // retries, and keeps what its loaders fetched until it has rendered: its
  // cache lasts one request.
  const isServer = typeof window === "undefined";

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: isDev ? 0 : 30_000,
        // The browser keeps what the server sent at least until it hydrates;
        // development refetches it through `staleTime` instead.
        gcTime: isServer ? Number.POSITIVE_INFINITY : 1000 * 60 * 60 * 24,
        retry: isServer ? 0 : 2,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
        networkMode: "online",
      },
      mutations: {
        retry: 0,
        networkMode: "online",
      },
      // The browser loads a failed or unfinished query itself.
      dehydrate: {
        shouldDehydrateQuery: (query) => query.state.status === "success",
      },
    },
  });
}
