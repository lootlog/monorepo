import { QueryClient } from "@tanstack/react-query";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@lootlog/client/main";

const ACCESSIBLE_GUILDS_CACHE_TIME = 1000 * 60 * 5;
const DEFAULT_QUERY_STALE_TIME = 30 * 1000;
const DEFAULT_QUERY_GC_TIME = 5 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: DEFAULT_QUERY_GC_TIME,
      staleTime: DEFAULT_QUERY_STALE_TIME,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  },
});

queryClient.setQueryDefaults(
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
  {
    gcTime: ACCESSIBLE_GUILDS_CACHE_TIME,
    staleTime: ACCESSIBLE_GUILDS_CACHE_TIME,
  },
);
