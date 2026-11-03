import { useGuildsControllerGetWorldsByGuildId } from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildWorld } from "@/hooks/context/use-guild-world";

/**
 * The worlds a per-world Organization read covers: the chosen world, or every
 * world the Organization plays on when all worlds are chosen. `worlds` stays
 * undefined until that list loads.
 */
export const useGuildWorldScope = ({ enabled = true } = {}) => {
  const guildId = useGuildId();
  const { world } = useGuildWorld();
  const readsAllWorlds = world === null;

  const worldsQuery = useGuildsControllerGetWorldsByGuildId(
    { guildId: guildId ?? "" },
    { query: { enabled: enabled && Boolean(guildId) && readsAllWorlds } },
  );

  return {
    guildId,
    world,
    worlds: world ? [world] : worldsQuery.data,
    readsAllWorlds,
    hasWorldsError: readsAllWorlds && worldsQuery.isError,
    isFetchingWorlds: readsAllWorlds && worldsQuery.isFetching,
    refetchWorlds: worldsQuery.refetch,
  };
};
