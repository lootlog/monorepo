import type { UseQueryOptions } from "@tanstack/react-query";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryOptions,
  guildsControllerGetGuildPermissions,
  type GuildsControllerGetGuildPermissions200Item,
} from "@lootlog/client/main";
import { readGameClientBootstrap } from "@/lib/game-client-bootstrap";

const GUILD_PERMISSIONS_STALE_TIME = 5 * 60 * 1000;

/**
 * The capabilities of the player in one guild. At startup the answer comes
 * from the game client bootstrap; a guild it could not read is fetched here.
 */
export const getGuildPermissionsQueryOptions = (
  guildId: string,
  query?: Partial<
    UseQueryOptions<GuildsControllerGetGuildPermissions200Item[]>
  >,
) => {
  const queryKey = getGuildsControllerGetGuildPermissionsQueryKey({ guildId });

  return getGuildsControllerGetGuildPermissionsQueryOptions(
    { guildId },
    {
      query: {
        staleTime: GUILD_PERMISSIONS_STALE_TIME,
        ...query,
        queryKey,
        queryFn: async ({ signal }) =>
          (await readGameClientBootstrap<
            GuildsControllerGetGuildPermissions200Item[]
          >(queryKey)) ??
          guildsControllerGetGuildPermissions({ guildId }, { signal }),
      },
    },
  );
};
