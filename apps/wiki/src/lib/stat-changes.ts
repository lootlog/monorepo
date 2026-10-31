import {
  type ItemDisplayValue,
  mapStatsToDisplaySections,
  parseItemStats,
} from "@lootlog/ui/components/item-stat-utils";

export type StatChange = {
  /** The stat as the item shows it after the change. */
  displayValue: ItemDisplayValue;
  /** The first number of the stat before and after, such as minimum damage. */
  before: number;
  after: number;
};

/** The first number of a stat's value; flags such as `binds` have none. */
const firstNumber = (value: string | boolean | undefined) =>
  Number.parseFloat(String(value));

/**
 * The stats `stat` raises or lowers from `baseStat`, in the order the item
 * lists them. A legendary bonus only fades later, so it is not a change.
 */
export const findStatChanges = (baseStat: string, stat: string) => {
  const base = new Map(
    parseItemStats(baseStat).map(({ key, value }) => [key, value]),
  );

  const changed = new Map(
    parseItemStats(stat).flatMap(({ key, value }) => {
      const before = firstNumber(base.get(key));
      const after = firstNumber(value);

      return key !== "legbon" &&
        Number.isFinite(before) &&
        Number.isFinite(after) &&
        before !== after
        ? [[key, { before, after }] as const]
        : [];
    }),
  );

  return mapStatsToDisplaySections(parseItemStats(stat)).flatMap(({ values }) =>
    values.flatMap((displayValue): StatChange[] => {
      const change = changed.get(displayValue.key?.split(".")[0] ?? "");

      return change ? [{ displayValue, ...change }] : [];
    }),
  );
};
