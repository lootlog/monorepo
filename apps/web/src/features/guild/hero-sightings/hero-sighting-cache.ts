import type { QueryClient } from "@tanstack/react-query";
import {
  getHeroSightingsControllerGetHeroSightingHistoryQueryKey,
  getHeroSightingsControllerGetHeroSightingsQueryKey,
  type HeroSightingResponseDto,
} from "@lootlog/client/main";
import {
  getHeroSightingKey,
  upsertNewestHeroSighting,
} from "@lootlog/domain/hero-sightings";
import { Option, Schema } from "effect";

const decodeBoardParameters = Schema.decodeUnknownOption(
  Schema.Struct({ world: Schema.String }),
);

const decodeHistoryParameters = Schema.decodeUnknownOption(
  Schema.Struct({ world: Schema.String, hero: Schema.String }),
);

/** The query paths of an Organization, under its id and its vanity URL. */
const getHeroSightingPaths = (organizationIds: readonly string[]) => ({
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
      Option.getOrUndefined(decodeBoardParameters(query.queryKey[1]))?.world ===
        sighting.world,
  })) {
    const query = { queryKey, exact: true };
    const state = queryClient.getQueryState(queryKey);

    // A board still loading gets the update from its own response; a late
    // response must not overwrite the update either, so it is fetched again.
    if (state?.data === undefined) continue;
    const isFetching = state.fetchStatus === "fetching";

    if (isFetching) void queryClient.cancelQueries(query);

    // The board keeps the newest sighting of each hero; a board not loaded
    // stays unloaded.
    queryClient.setQueryData<readonly HeroSightingResponseDto[]>(
      queryKey,
      (old) => old && upsertNewestHeroSighting(old, sighting),
    );

    if (isFetching) void queryClient.invalidateQueries(query);
  }

  void queryClient.invalidateQueries({
    predicate: (query) => {
      const parameters = Option.getOrUndefined(
        decodeHistoryParameters(query.queryKey[1]),
      );

      return (
        paths.history.some((path) => path === query.queryKey[0]) &&
        parameters?.world === sighting.world &&
        getHeroSightingKey(parameters.hero) === sighting.hero.key
      );
    },
  });
};

const isHeroSightingPath = Schema.is(
  Schema.String.check(
    Schema.isPattern(/^\/guilds\/[^/]+\/hero-sightings(?:\/history)?$/),
  ),
);

/** Every hero sighting read, or only those of the given Organizations. */
export const heroSightingQueries = (organizationIds?: readonly string[]) => {
  const paths = organizationIds && getHeroSightingPaths(organizationIds);

  return {
    predicate: (query: { queryKey: readonly unknown[] }) =>
      isHeroSightingPath(query.queryKey[0]) &&
      (!paths ||
        [...paths.board, ...paths.history].some(
          (path) => path === query.queryKey[0],
        )),
  };
};
