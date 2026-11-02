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

/** Finds the Organization a route segment names by its id or vanity URL. */
export const findGuildByRouteId = <
  TGuild extends { id: string; vanityUrl?: string | null },
>(
  guilds: readonly TGuild[] | undefined,
  routeGuildId: string | undefined,
) =>
  guilds?.find(
    (guild) => guild.id === routeGuildId || guild.vanityUrl === routeGuildId,
  );
