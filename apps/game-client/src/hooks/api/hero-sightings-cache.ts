import type { QueryClient } from "@tanstack/react-query";
import {
  getHeroSightingsControllerGetHeroSightingHistoryQueryKey,
  type HeroSightingResponseDto,
} from "@lootlog/client/main";
import { upsertNewestHeroSighting } from "@lootlog/domain/hero-sightings";
import { queryKeys } from "@/lib/query-keys";

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

    if (!state) continue;
    const wasFetching = state.fetchStatus === "fetching";

    if (wasFetching) void queryClient.cancelQueries({ queryKey, exact: true });

    queryClient.setQueryData<readonly HeroSightingResponseDto[]>(
      queryKey,
      (current) => upsertNewestHeroSighting(current ?? [], sighting),
    );

    if (wasFetching || state.data === undefined)
      void queryClient.invalidateQueries({ queryKey, exact: true });
  }
};
