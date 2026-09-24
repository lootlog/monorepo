import {
  getUsersControllerGetCurrentUserGuildsQueryKey,
  usersControllerRefreshCurrentUserGuilds,
} from "@lootlog/client/main";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Replaces the cached guild list with one the API fetches from Discord again
 * instead of serving its own cached copy.
 */
export const refreshCurrentUserGuilds = async (queryClient: QueryClient) => {
  const queryKey = getUsersControllerGetCurrentUserGuildsQueryKey();

  // A read already in flight may return the API's older cached list.
  await queryClient.cancelQueries({ queryKey });
  const guilds = await usersControllerRefreshCurrentUserGuilds();
  queryClient.setQueryData(queryKey, guilds);

  return guilds;
};
