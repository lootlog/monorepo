import type { QueryClient } from "@tanstack/react-query";
import {
  getHeroSightingsControllerGetHeroSightingHistoryQueryKey,
  getHeroSightingsControllerGetHeroSightingsQueryKey,
  type HeroSightingResponseDto,
} from "@lootlog/client/main";
import { getHeroSightingKey } from "@lootlog/domain/hero-sightings";
import { z } from "zod";

/**
 * The board keeps the latest sighting of each hero. Sighting ids grow with
 * time, so an update for an older sighting, such as the closed one that a
 * probable kill replaced, never displaces the newer one, whatever order the
 * updates arrive in.
 */
export const upsertHeroSighting = (
  sightings: HeroSightingResponseDto[] | undefined,
  sighting: HeroSightingResponseDto,
): HeroSightingResponseDto[] | undefined => {
  if (!sightings) return undefined;

  const current = sightings.find(
    (entry) => entry.hero.key === sighting.hero.key,
  );

  if (!current) return [...sightings, sighting];

  if (current.id > sighting.id) return sightings;

  return sightings.map((entry) => (entry === current ? sighting : entry));
};

const boardParameters = z.object({ world: z.string() });

const historyParameters = z.object({ world: z.string(), hero: z.string() });

/** The query paths of an Organization, under its id and its vanity URL. */
export const getHeroSightingPaths = (organizationIds: readonly string[]) => ({
  board: organizationIds.map(
    (guildId) =>
      getHeroSightingsControllerGetHeroSightingsQueryKey({ guildId })[0],
  ),
  history: organizationIds.map(
    (guildId) =>
      getHeroSightingsControllerGetHeroSightingHistoryQueryKey({ guildId })[0],
  ),
});

/**
 * Puts a changed sighting on its world's board and refetches the history of
 * its hero, which an update can extend or reorder.
 */
export const writeHeroSightingToCache = (
  queryClient: QueryClient,
  organizationIds: readonly string[],
  sighting: HeroSightingResponseDto,
) => {
  const paths = getHeroSightingPaths(organizationIds);

  for (const [queryKey] of queryClient.getQueriesData<
    HeroSightingResponseDto[]
  >({
    predicate: (query) =>
      paths.board.some((path) => path === query.queryKey[0]) &&
      boardParameters.safeParse(query.queryKey[1]).data?.world ===
        sighting.world,
  })) {
    const query = { queryKey, exact: true };
    const state = queryClient.getQueryState(queryKey);

    // A board still loading gets the update from its own response; a late
    // response must not overwrite the update either, so it is fetched again.
    if (state?.data === undefined) continue;
    const isFetching = state.fetchStatus === "fetching";

    if (isFetching) void queryClient.cancelQueries(query);

    queryClient.setQueryData<HeroSightingResponseDto[]>(queryKey, (old) =>
      upsertHeroSighting(old, sighting),
    );

    if (isFetching) void queryClient.invalidateQueries(query);
  }

  void queryClient.invalidateQueries({
    predicate: (query) => {
      const parameters = historyParameters.safeParse(query.queryKey[1]).data;

      return (
        paths.history.some((path) => path === query.queryKey[0]) &&
        parameters?.world === sighting.world &&
        getHeroSightingKey(parameters.hero) === sighting.hero.key
      );
    },
  });
};

const heroSightingPath = z
  .string()
  .regex(/^\/guilds\/[^/]+\/hero-sightings(?:\/history)?$/);

/** Every hero sighting read, or only those of the given Organizations. */
export const heroSightingQueries = (organizationIds?: readonly string[]) => {
  const paths = organizationIds && getHeroSightingPaths(organizationIds);

  return {
    predicate: (query: { queryKey: readonly unknown[] }) =>
      heroSightingPath.safeParse(query.queryKey[0]).success &&
      (!paths ||
        [...paths.board, ...paths.history].some(
          (path) => path === query.queryKey[0],
        )),
  };
};
