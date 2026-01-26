import { QueryClient } from "@tanstack/react-query";
import { get, set, del } from "idb-keyval";
import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";

export function createIDBPersister(idbValidKey: IDBValidKey = "lootlog-cache") {
  return {
    persistClient: async (client: PersistedClient) => {
      const filteredClient = {
        ...client,
        clientState: {
          ...client.clientState,
          queries: client.clientState.queries.filter((query) => {
            return query.meta?.persist !== false;
          }),
        },
      };
      const serialized = JSON.stringify(filteredClient);
      await set(idbValidKey, serialized);
    },
    restoreClient: async () => {
      const serialized = await get<string>(idbValidKey);
      if (!serialized) return undefined;
      return JSON.parse(serialized) as PersistedClient;
    },
    removeClient: async () => {
      await del(idbValidKey);
    },
  } satisfies Persister;
}

export const persister = createIDBPersister();

const isDev = import.meta.env.MODE === "development";

export const queryClient = new QueryClient({
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
