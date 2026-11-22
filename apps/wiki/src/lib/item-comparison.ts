import { parseItemStatEntries } from "@lootlog/domain/item-stat";
import { uniqBy } from "es-toolkit";
import {
  type ItemDisplayValue,
  mapStatsToDisplaySections,
} from "@lootlog/ui/components/item-stat-utils";
import {
  decodeItemUpgrade,
  encodeItemUpgrade,
  ITEM_UPGRADE_PATTERN,
  type ItemUpgrade,
  NO_UPGRADE,
} from "@lootlog/domain/item-upgrade";

export const MAX_COMPARED_ITEMS = 4;

export type ComparedItem = { id: number; upgrade: ItemUpgrade };

export const ITEM_COMPARISON_PARAM = "compare";

export const encodeItemComparison = (items: ReadonlyArray<ComparedItem>) =>
  items
    .map(({ id, upgrade }) => `${id}${encodeItemUpgrade(upgrade)}`)
    .join("_");

const COMPARISON_PART = new RegExp(`^(\\d{1,12})${ITEM_UPGRADE_PATTERN}$`);

export const decodeItemComparison = (value: string): ComparedItem[] =>
  uniqBy(
    value.split("_").flatMap((part) => {
      const match = COMPARISON_PART.exec(part);

      return match
        ? [
            {
              id: Number(match[1]),
              upgrade:
                decodeItemUpgrade(match[2], match[3], match[4]) ?? NO_UPGRADE,
            },
          ]
        : [];
    }),
    ({ id }) => id,
  ).slice(0, MAX_COMPARED_ITEMS);

const NUMERIC_STAT = /^[+-]?\d+(?:\.\d+)?(?:,[+-]?\d+(?:\.\d+)?)*$/;

const statNumbers = (value: string | boolean | undefined) => {
  const text = String(value);

  return NUMERIC_STAT.test(text) ? text.split(",").map(Number) : undefined;
};

const covers = (value: number[], other: number[]) =>
  value.length === other.length &&
  value.every((number, index) => number >= (other[index] ?? number));

const UNRANKED_STATS = new Set(["lvl"]);

export type ComparisonRow = {
  key: string;
  values: ReadonlyArray<ItemDisplayValue | undefined>;
  best: ReadonlyArray<boolean>;
};

const displayValues = (stat: string) =>
  mapStatsToDisplaySections(parseItemStatEntries(stat)).flatMap(
    ({ index, values }) => values.map((value) => ({ value, section: index })),
  );

export const compareItemStats = (
  stats: ReadonlyArray<string>,
): ComparisonRow[] => {
  const items = stats.map((stat) => {
    const raw = new Map(
      parseItemStatEntries(stat).map(({ key, value }) => [key, value]),
    );

    return {
      entries: displayValues(stat),
      numbersOf: (key: string) => statNumbers(raw.get(key)),
    };
  });

  const keys = uniqBy(
    items.flatMap(({ entries }) =>
      entries.map(({ value, section }) => ({ key: value.key ?? "", section })),
    ),
    ({ key }) => key,
  )
    .sort((a, b) => a.section - b.section)
    .map(({ key }) => key);

  return keys.map((key) => {
    const values = items.map(
      ({ entries }) => entries.find(({ value }) => value.key === key)?.value,
    );

    const baseKey = key.split(".")[0] ?? "";

    const numbers = items.map((item, index) =>
      values[index] === undefined ? undefined : item.numbersOf(baseKey),
    );

    const present = numbers.filter((number) => number !== undefined);

    const isBest = (number: number[] | undefined) =>
      number !== undefined && present.every((other) => covers(number, other));

    const winner = present.find(isBest);

    const isRanked =
      items.length > 1 &&
      !UNRANKED_STATS.has(baseKey) &&
      winner !== undefined &&
      (present.length < items.length ||
        present.some((other) => !covers(other, winner)));

    return {
      key,
      values,
      best: numbers.map((number) => isRanked && isBest(number)),
    };
  });
};
