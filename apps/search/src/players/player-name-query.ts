import { buildMeilisearchInFilter } from "@lootlog/meilisearch/query-builder";
import type { SearchParams } from "meilisearch";
import type { PlayerSearchQuery } from "./player-search-query.js";

/**
 * A search for players by name: one search string matches by words, several
 * match exactly those names, and a world narrows either.
 */
export const playerNameQuery = ({
  limit,
  search,
  world,
}: PlayerSearchQuery) => {
  const filters = [
    ...(Array.isArray(search)
      ? [buildMeilisearchInFilter("name", search)]
      : []),
    ...(world ? [`world = ${JSON.stringify(world)}`] : []),
  ];

  const query: SearchParams = {
    limit,
    attributesToSearchOn: ["name"],
    ...(filters.length > 0 && { filter: filters.join(" AND ") }),
  };

  return { searchTerm: Array.isArray(search) ? "" : (search ?? ""), query };
};
