import { QueryClient } from "@tanstack/react-query";

const isDev = import.meta.env.MODE === "development";

let browserQueryClient: QueryClient | undefined;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: isDev ? 0 : 30_000,
        gcTime: isDev ? 0 : 1000 * 60 * 60 * 24,
        retry: 2,
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
}

export function getQueryClient() {
  if (typeof window === "undefined") {
    return createQueryClient();
  }

  browserQueryClient ??= createQueryClient();

  return browserQueryClient;
}
