import { parseItemStatEntries } from "@lootlog/domain/item-stat";
import {
  type ItemDisplayValue,
  mapStatsToDisplaySections,
} from "@lootlog/ui/components/item-stat-utils";

export type StatChange = {
  displayValue: ItemDisplayValue;
  before: number;
  after: number;
};

const firstNumber = (value: string | boolean | undefined) =>
  Number.parseFloat(String(value));

export const findStatChanges = (baseStat: string, stat: string) => {
  const base = new Map(
    parseItemStatEntries(baseStat).map(({ key, value }) => [key, value]),
  );

  const changed = new Map(
    parseItemStatEntries(stat).flatMap(({ key, value }) => {
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

  return mapStatsToDisplaySections(parseItemStatEntries(stat)).flatMap(
    ({ values }) =>
      values.flatMap((displayValue): StatChange[] => {
        const change = changed.get(displayValue.key?.split(".")[0] ?? "");

        return change ? [{ displayValue, ...change }] : [];
      }),
  );
};
