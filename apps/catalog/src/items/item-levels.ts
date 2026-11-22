import { MAX_FIXED_LEVELS } from "@lootlog/domain/elastic-level";

export type ItemLevelFields = {
  observedLevels: number[];
  elasticLevel: boolean;
};

export const isElasticLevel = (
  fields: Partial<Pick<ItemLevelFields, "observedLevels">>,
) => (fields.observedLevels?.length ?? 0) > MAX_FIXED_LEVELS;

const toLevelFields = (observedLevels: number[]): ItemLevelFields => ({
  observedLevels,
  elasticLevel: isElasticLevel({ observedLevels }),
});

export const toItemLevelFields = (item: { lvl: number }) =>
  toLevelFields(item.lvl > 0 ? [item.lvl] : []);

export const mergeItemLevels = (
  incoming: Pick<ItemLevelFields, "observedLevels">,
  stored: Partial<ItemLevelFields> | undefined,
) =>
  toLevelFields(
    [
      ...new Set([
        ...(stored?.observedLevels ?? []),
        ...incoming.observedLevels,
      ]),
    ]
      .sort((a, b) => a - b)
      .slice(0, MAX_FIXED_LEVELS + 1),
  );
