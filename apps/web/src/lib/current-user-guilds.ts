import {
  getUsersControllerGetCurrentUserGuildsQueryKey,
  usersControllerGetCurrentUserGuilds,
} from "@lootlog/client/main";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Replaces the cached guild list with one the API fetches from Discord again
 * instead of serving its own cached copy.
 */
export const refreshCurrentUserGuilds = (queryClient: QueryClient) =>
  queryClient.fetchQuery({
    queryKey: getUsersControllerGetCurrentUserGuildsQueryKey(),
    queryFn: ({ signal }) =>
      usersControllerGetCurrentUserGuilds({ refresh: true }, { signal }),
    staleTime: 0,
  });
