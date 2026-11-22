import type { HeroSightingResponseDto } from "@lootlog/client/main";
import {
  skipToken,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { fetchHeroSightings } from "@/api/hero-sightings.api";
import { queryKeys } from "@/lib/query-keys";
import { useRealtimeSnapshotReady } from "@/contexts/socket-context";
import { applyGameTimerAccess } from "@/lib/game-access-cache";

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

const EMPTY_SIGHTINGS: HeroSightingResponseDto[] = [];

const combineLoadedSightings = (
  results: readonly UseQueryResult<HeroSightingResponseDto[]>[],
): HeroSightingResponseDto[] => {
  if (results.length === 1) return results[0]?.data ?? EMPTY_SIGHTINGS;
  const loaded = results.flatMap((result) => result.data ?? []);

  return loaded.length > 0 ? loaded : EMPTY_SIGHTINGS;
};

export const useLoadedHeroSightings = (
  worlds: readonly string[],
): HeroSightingResponseDto[] =>
  useQueries({
    queries: worlds.map(
      (world): UseQueryOptions<HeroSightingResponseDto[]> => ({
        queryKey: queryKeys.heroSightings(world),
        queryFn: skipToken,
      }),
    ),
    combine: combineLoadedSightings,
  });
