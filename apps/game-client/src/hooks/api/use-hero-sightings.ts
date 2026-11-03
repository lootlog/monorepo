import {
  skipToken,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  fetchHeroSightings,
  type HeroSighting,
} from "@/api/hero-sightings.api";
import { queryKeys } from "@/features/public-api/query-keys";
import { useRealtimeSnapshotReady } from "@/contexts/socket-context";
import { applyGameTimerAccess } from "@/lib/game-access-cache";

/** The latest sighting of every hero in the world, per Organization. */
export const useHeroSightings = (world: string | undefined) => {
  const queryClient = useQueryClient();
  const snapshotReady = useRealtimeSnapshotReady();

  return useQuery({
    queryKey: queryKeys.heroSightings(world ?? ""),
    enabled: !!world && snapshotReady,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) =>
      applyGameTimerAccess(
        queryClient,
        await fetchHeroSightings(world ?? "", signal),
      ),
  });
};

const EMPTY_SIGHTINGS: HeroSighting[] = [];

// Module-level, so the combined list keeps its identity until a world's list changes.
const combineLoadedSightings = (
  results: readonly UseQueryResult<HeroSighting[]>[],
): HeroSighting[] => {
  if (results.length === 1) return results[0]?.data ?? EMPTY_SIGHTINGS;
  const loaded = results.flatMap((result) => result.data ?? []);

  return loaded.length > 0 ? loaded : EMPTY_SIGHTINGS;
};

/**
 * Sightings already loaded for these worlds, without requesting them: the
 * hero sightings feature owns loading and live updates.
 */
export const useLoadedHeroSightings = (
  worlds: readonly string[],
): HeroSighting[] =>
  useQueries({
    queries: worlds.map((world): UseQueryOptions<HeroSighting[]> => ({
      queryKey: queryKeys.heroSightings(world),
      queryFn: skipToken,
    })),
    combine: combineLoadedSightings,
  });
