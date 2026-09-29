import { Function, Option, Schema } from "effect";
import type { SearchParams } from "meilisearch";

export const getMeilisearchErrorCode = Function.compose(
  Schema.decodeUnknownOption(
    Schema.Struct({ cause: Schema.Struct({ code: Schema.String }) }),
  ),
  (result) => Option.getOrNull(Option.map(result, (error) => error.cause.code)),
);

export function buildMeilisearchStringInFilter(
  fieldName: string,
  values: string[],
): string {
  const formattedValues = values.map((value) => JSON.stringify(value));

  return `${fieldName} IN [${formattedValues.join(", ")}]`;
}

export function buildMeilisearchSearchTermFilter(
  fieldName: string,
  search: string | string[] | undefined,
) {
  if (Array.isArray(search)) {
    return {
      searchTerm: "",
      filter: buildMeilisearchStringInFilter(fieldName, search),
    };
  }

  return {
    searchTerm: search ?? "",
  };
}

export function buildMeilisearchNameQuery({
  ids,
  limit,
  search,
  world,
}: {
  readonly ids?: number[];
  readonly limit: number;
  readonly search?: string | string[];
  readonly world?: string;
}) {
  const { filter: searchFilter, searchTerm } = buildMeilisearchSearchTermFilter(
    "name",
    search,
  );

  const filters: string[] = [];

  if (searchFilter) {
    filters.push(searchFilter);
  }

  if (ids && ids.length > 0) {
    filters.push(`id IN [${ids.join(", ")}]`);
  }

  if (world) {
    filters.push(`world = "${world}"`);
  }

  const query: SearchParams = {
    limit,
    attributesToSearchOn: ["name"],
    ...(filters.length > 0 && { filter: filters.join(" AND ") }),
  };

  return { searchTerm, query };
}
