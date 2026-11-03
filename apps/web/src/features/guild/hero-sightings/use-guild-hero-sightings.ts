import { useQueries } from "@tanstack/react-query";
import { getHeroSightingsControllerGetHeroSightingsQueryOptions } from "@lootlog/client/main";
import { useGuildWorldScope } from "@/hooks/context/use-guild-world-scope";

/**
 * The latest sighting of each hero on the Organization's world, or on every
 * world it plays on when all worlds are chosen.
 */
export const useGuildHeroSightings = ({ enabled = true } = {}) => {
  const {
    guildId,
    world,
    worlds,
    hasWorldsError,
    isFetchingWorlds,
    refetchWorlds,
  } = useGuildWorldScope({ enabled });

  return useQueries({
    queries: (worlds ?? []).map((sightingsWorld) =>
      getHeroSightingsControllerGetHeroSightingsQueryOptions(
        { guildId: guildId ?? "" },
        { world: sightingsWorld },
        { query: { enabled: enabled && Boolean(guildId), staleTime: 15_000 } },
      ),
    ),
    combine: (results) => {
      const loaded = results.filter((result) => result.data !== undefined);

      return {
        world,
        // Until every world answers, a partial board would read as complete.
        sightings:
          worlds && loaded.length === results.length
            ? loaded.flatMap((result) => result.data ?? [])
            : undefined,
        isPending:
          (!worlds && !hasWorldsError) ||
          results.some((result) => result.isPending),
        isError: hasWorldsError || results.some((result) => result.isError),
        isFetching:
          isFetchingWorlds || results.some((result) => result.isFetching),
        refetch: () =>
          Promise.all([
            ...(hasWorldsError ? [refetchWorlds()] : []),
            ...results.map((result) => result.refetch()),
          ]),
      };
    },
  });
};
