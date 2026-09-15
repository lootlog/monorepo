import { orderGuilds as orderLootlogGuilds } from "@lootlog/domain/guild-preferences";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { getVisibleLootlogGuilds } from "@/lib/selected-lootlog-guild";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/client/main";

/**
 * The one reader of the user's Lootlogs for every list, picker and name lookup
 * in the game client. `orderedGuilds` follows the order the user set in
 * settings and still includes hidden Lootlogs, so configuration screens can
 * reach them; `visibleGuilds` drops the hidden ones for in-game switchers.
 */
export const useLootlogGuilds = () => {
  const guildsQuery = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });

  const preferencesQuery = useUserPreferences();

  const orderedGuilds = orderLootlogGuilds(
    guildsQuery.data ?? [],
    preferencesQuery.data?.guildsOrder,
  );

  const visibleGuilds = getVisibleLootlogGuilds(
    orderedGuilds,
    undefined,
    preferencesQuery.data?.hiddenGuildIds,
  );

  return {
    areVisibleGuildsResolved:
      guildsQuery.data !== undefined && preferencesQuery.data !== undefined,
    guildsQuery,
    preferencesQuery,
    orderedGuilds,
    visibleGuilds,
  };
};
