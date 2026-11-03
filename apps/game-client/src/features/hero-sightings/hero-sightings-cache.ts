import type { QueryClient } from "@tanstack/react-query";
import type { HeroSighting } from "@/api/hero-sightings.api";
import { queryKeys } from "@/features/public-api/query-keys";

/**
 * Keeps one sighting per hero in each Organization: the newest by id. A
 * detection that replaces a sighting delivers the closed one and its
 * successor in any order, and the closed one must not win.
 */
export const upsertHeroSightingInCollection = (
  sightings: HeroSighting[],
  next: HeroSighting,
): HeroSighting[] => {
  const index = sightings.findIndex(
    (sighting) =>
      sighting.guildId === next.guildId && sighting.hero.key === next.hero.key,
  );

  if (index === -1) return [...sightings, next];

  const current = sightings[index];

  if (current && current.id > next.id) return sightings;

  return sightings.with(index, next);
};

/** Applies sightings to their world's list, as the API or the gateway returned them. */
export const upsertHeroSightings = (
  queryClient: QueryClient,
  sightings: readonly HeroSighting[],
): void => {
  for (const sighting of sightings) {
    const queryKey = queryKeys.heroSightings(sighting.world);
    const state = queryClient.getQueryState(queryKey);

    // No list for this world is shown; it loads current data when it is.
    if (!state) continue;
    const wasFetching = state.fetchStatus === "fetching";

    if (wasFetching) void queryClient.cancelQueries({ queryKey, exact: true });

    queryClient.setQueryData<HeroSighting[]>(queryKey, (current) =>
      upsertHeroSightingInCollection(current ?? [], sighting),
    );

    // The cancelled response may have missed this change's neighbours.
    if (wasFetching || state.data === undefined)
      void queryClient.invalidateQueries({ queryKey, exact: true });
  }
};
