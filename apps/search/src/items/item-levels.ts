/**
 * An item seen at more levels than this takes its looter's level, as
 * Margonem's elastic items (`lvladjust`) do; a rebalanced item keeps a few.
 */
export const MAX_FIXED_LEVELS = 4;

/** The levels Margonem gives an elastic item, whoever loots it. */
export const ELASTIC_LEVELS = { min: 40, max: 300 } as const;

/**
 * The distinct levels the catalog saw an item at, the lowest kept up to one
 * past `MAX_FIXED_LEVELS`: enough to tell an elastic item apart, which
 * `elasticLevel` stores for filtering.
 */
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

/** The level of one observation; level 0 is no level requirement. */
export const toItemLevelFields = (item: { lvl: number }) =>
  toLevelFields(item.lvl > 0 ? [item.lvl] : []);

/**
 * One item's levels from two observations. Merging is commutative, so
 * redelivered or reordered deliveries settle on the same entry. Documents
 * indexed before the field existed have none.
 */
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
