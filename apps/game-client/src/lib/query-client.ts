import {
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QUERY_CLIENT_CACHE_TIME_MS } from "@/constants/query-client";
import { storageKey } from "@/lib/storage-key";
import { IS_DEV } from "@/config/app";
import { USER_GAME_ACCOUNT_PREFERENCES_QUERY_KEY_PREFIX } from "@/lib/game-account-notification-preferences";

const STORAGE_KEY = storageKey("ll:query-cache");

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: IS_DEV ? 0 : QUERY_CLIENT_CACHE_TIME_MS,
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
    },
  },
});

const localStoragePersister = createAsyncStoragePersister({
  storage: window.localStorage,
  key: STORAGE_KEY,
});

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: QUERY_CLIENT_CACHE_TIME_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      return (
        defaultShouldDehydrateQuery(query) &&
        query.queryKey[0] !== USER_GAME_ACCOUNT_PREFERENCES_QUERY_KEY_PREFIX
      );
    },
  },
});
