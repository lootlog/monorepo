import {
  getUsersControllerGetCurrentUserGuildsQueryKey,
  usersControllerRefreshCurrentUserGuilds,
} from "@lootlog/client/main";
import type { QueryClient } from "@tanstack/react-query";

export const refreshCurrentUserGuilds = async (queryClient: QueryClient) => {
  const queryKey = getUsersControllerGetCurrentUserGuildsQueryKey();

  await queryClient.cancelQueries({ queryKey });
  const guilds = await usersControllerRefreshCurrentUserGuilds();
  queryClient.setQueryData(queryKey, guilds);

  return guilds;
};

export const findGuildByRouteId = <
  TGuild extends { id: string; vanityUrl?: string | null },
>(
  guilds: readonly TGuild[] | undefined,
  routeGuildId: string | undefined,
) =>
  guilds?.find(
    (guild) => guild.id === routeGuildId || guild.vanityUrl === routeGuildId,
  );
