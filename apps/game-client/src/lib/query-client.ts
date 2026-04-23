import { QueryClient } from "@tanstack/react-query";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@/lib/api/generated/main/users/users";

const ACCESSIBLE_GUILDS_CACHE_TIME = 1000 * 60 * 5;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 0,
      staleTime: 0,
      refetchOnMount: "always",
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
