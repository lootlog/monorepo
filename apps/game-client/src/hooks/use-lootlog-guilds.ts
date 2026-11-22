import { orderGuilds as orderLootlogGuilds } from "@lootlog/domain/guild-preferences";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { getVisibleLootlogGuilds } from "@/lib/selected-lootlog-guild";
import { useAccessibleGuilds } from "@/hooks/api/use-accessible-guilds";

export const useLootlogGuilds = () => {
  const guildsQuery = useAccessibleGuilds();

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
    hasNoGuilds: guildsQuery.data?.length === 0,
    guildsQuery,
    preferencesQuery,
    orderedGuilds,
    visibleGuilds,
  };
};
