import type { SearchParams } from "meilisearch";

interface BuildSearchQueryOptions {
  search: string | string[];
  world?: string;
  limit: number;
}

export function buildSearchQuery({
  search,
  world,
  limit,
}: BuildSearchQueryOptions): { searchTerm: string; query: SearchParams } {
  const hasMultipleSearchTerms = Array.isArray(search);
  const searchTerm = hasMultipleSearchTerms ? "" : search;

  const filters: string[] = [];

  if (hasMultipleSearchTerms) {
    filters.push(`name IN [${search.map((n) => `"${n}"`).join(", ")}]`);
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
