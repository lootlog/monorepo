import type { QueryClient } from "@tanstack/react-query";
import {
  getHeroSightingsControllerGetHeroSightingHistoryQueryKey,
  type HeroSightingResponseDto,
} from "@lootlog/client/main";
import { upsertNewestHeroSighting } from "@lootlog/domain/hero-sightings";
import { queryKeys } from "@/features/public-api/query-keys";

/**
 * Applies sightings to their world's list, as the API or the gateway returned
 * them. The hero's history in that Lootlog reloads if it is open, and is
 * fetched fresh when it opens next.
 */
export const upsertHeroSightings = (
  queryClient: QueryClient,
  sightings: readonly HeroSightingResponseDto[],
): void => {
  for (const sighting of sightings) {
    void queryClient.invalidateQueries({
      queryKey: getHeroSightingsControllerGetHeroSightingHistoryQueryKey(
        { guildId: sighting.guildId },
        { world: sighting.world, hero: sighting.hero.key },
      ),
      exact: true,
    });

    const queryKey = queryKeys.heroSightings(sighting.world);
    const state = queryClient.getQueryState(queryKey);

    // No list for this world is shown; it loads current data when it is.
    if (!state) continue;
    const wasFetching = state.fetchStatus === "fetching";

    if (wasFetching) void queryClient.cancelQueries({ queryKey, exact: true });

    queryClient.setQueryData<readonly HeroSightingResponseDto[]>(
      queryKey,
      (current) => upsertNewestHeroSighting(current ?? [], sighting),
    );

    // The cancelled response may have missed this change's neighbours.
    if (wasFetching || state.data === undefined)
      void queryClient.invalidateQueries({ queryKey, exact: true });
  }
};
