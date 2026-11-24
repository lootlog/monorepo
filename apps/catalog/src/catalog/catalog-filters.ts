import { ELASTIC_LEVELS } from "@lootlog/domain/elastic-level";
import { buildMeilisearchInFilter } from "@lootlog/meilisearch/query-builder";
import type { CatalogControllerGetItemsQuery } from "#src/http-api/contracts/catalog/schemas";

const ITEM_TYPE = /^[A-Z_]+$/;

export const gameVersionFilter = (gameVersion: string | undefined) =>
  gameVersion === undefined
    ? undefined
    : `gameVersion = ${JSON.stringify(gameVersion)}`;

const levelFilter = (min: number | undefined, max: number | undefined) => {
  const bounds = [
    min === undefined ? undefined : `lvl >= ${Math.floor(min)}`,
    max === undefined ? undefined : `lvl <= ${Math.floor(max)}`,
  ].filter((bound) => bound !== undefined);

  if (bounds.length === 0) return undefined;

  const reachesElastic =
    (max ?? ELASTIC_LEVELS.max) >= ELASTIC_LEVELS.min &&
    (min ?? ELASTIC_LEVELS.min) <= ELASTIC_LEVELS.max;

  return reachesElastic
    ? `((${bounds.join(" AND ")}) OR elasticLevel = true)`
    : bounds.join(" AND ");
};

export const inFilter = (
  field: string,
  values: ReadonlyArray<string | number> | undefined,
) => (values?.length ? buildMeilisearchInFilter(field, values) : undefined);

export const itemFilters = (
  query: CatalogControllerGetItemsQuery,
  monsterKey: string | undefined,
) => {
  const types = query.types?.filter((type) => ITEM_TYPE.test(type));

  return [
    gameVersionFilter(query.gameVersion),
    inFilter("id", query.ids),
    inFilter("rarity", query.rarities),
    inFilter("type", types),
    inFilter("category", query.categories),
    inFilter("requiredProfessions", query.professions),
    levelFilter(query.minLevel, query.maxLevel),
    ...(query.statKeys ?? []).map(
      (key) => `statsKeys = ${JSON.stringify(key)}`,
    ),
    ...(query.excludedStatKeys ?? []).map(
      (key) => `NOT statsKeys = ${JSON.stringify(key)}`,
    ),
    inFilter("legendaryBonus", query.legendaryBonuses),
    inFilter("droppedByTypes", query.dropSourceTypes),
    query.event === undefined
      ? undefined
      : `eventSlugs = ${JSON.stringify(query.event)}`,
    monsterKey === undefined
      ? undefined
      : `droppedByMonsterKeys = ${JSON.stringify(monsterKey)}`,
    query.droppedBy === undefined || monsterKey !== undefined
      ? undefined
      : `droppedByKeys = ${JSON.stringify(query.droppedBy)}`,
  ].filter((filter) => filter !== undefined);
};
