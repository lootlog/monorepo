import { uniqBy } from "es-toolkit";
import {
  type ItemDisplayValue,
  mapStatsToDisplaySections,
  parseItemStats,
} from "@lootlog/ui/components/item-stat-utils";
import {
  decodeItemUpgrade,
  encodeItemUpgrade,
  ITEM_UPGRADE_PATTERN,
  type ItemUpgrade,
  NO_UPGRADE,
} from "@/lib/item-upgrade";

/** A comparison fits this many items side by side, even on a phone. */
export const MAX_COMPARED_ITEMS = 4;

/** An item a player compares, at the upgrade they chose for it. */
export type ComparedItem = { id: number; upgrade: ItemUpgrade };

/** The query parameter a shared comparison travels in. */
export const ITEM_COMPARISON_PARAM = "compare";

/**
 * A comparison as a short link value: one `<item id>` per item, with its
 * upgrade written as a set link writes it, such as `12345u5ds_678`.
 */
export const encodeItemComparison = (items: ReadonlyArray<ComparedItem>) =>
  items
    .map(({ id, upgrade }) => `${id}${encodeItemUpgrade(upgrade)}`)
    .join("_");

const COMPARISON_PART = new RegExp(`^(\\d{1,12})${ITEM_UPGRADE_PATTERN}$`);

/**
 * The items a link names. Parts it cannot read and repeated items are
 * dropped, and it keeps at most `MAX_COMPARED_ITEMS`.
 */
export const decodeItemComparison = (value: string): ComparedItem[] =>
  uniqBy(
    value.split("_").flatMap((part) => {
      const match = COMPARISON_PART.exec(part);

      return match
        ? [
            {
              id: Number(match[1]),
              upgrade: decodeItemUpgrade(match[2], match[3]) ?? NO_UPGRADE,
            },
          ]
        : [];
    }),
    ({ id }) => id,
  ).slice(0, MAX_COMPARED_ITEMS);

// A stat value that is a number, or numbers such as damage's `4793,5858`;
// text that only starts with one, such as an event's name, is no number.
const NUMERIC_STAT = /^[+-]?\d+(?:\.\d+)?(?:,[+-]?\d+(?:\.\d+)?)*$/;

/** Each number of a stat value; none for text, and for flags such as `binds`. */
const statNumbers = (value: string | boolean | undefined) => {
  const text = String(value);

  return NUMERIC_STAT.test(text) ? text.split(",").map(Number) : undefined;
};

/**
 * Whether one value is at least another in every number, as a damage range
 * must be at both ends; crossing ranges cover neither.
 */
const covers = (value: number[], other: number[]) =>
  value.length === other.length &&
  value.every((number, index) => number >= (other[index] ?? number));

// Stats where more is not better: a higher required level only narrows who
// can wear the item.
const UNRANKED_STATS = new Set(["lvl"]);

/** One stat across the compared items, in the order an item lists it. */
export type ComparisonRow = {
  key: string;
  /** Each item's stat, or none for an item without it. */
  values: ReadonlyArray<ItemDisplayValue | undefined>;
  /** Whether each item's value is the best of the comparison. */
  best: ReadonlyArray<boolean>;
};

/** An item's stats as its tooltip lists them, each with its section. */
const displayValues = (stat: string) =>
  mapStatsToDisplaySections(parseItemStats(stat)).flatMap(({ index, values }) =>
    values.map((value) => ({ value, section: index })),
  );

/**
 * The stats of the items, one row per stat any of them has, in the order
 * their tooltips list them. An item's value is best when no item has more and some item has less or lacks the stat;
 * equal values and stats more of which is no better mark nothing.
 */
export const compareItemStats = (
  stats: ReadonlyArray<string>,
): ComparisonRow[] => {
  const items = stats.map((stat) => {
    const raw = new Map(
      parseItemStats(stat).map(({ key, value }) => [key, value]),
    );

    return {
      entries: displayValues(stat),
      numbersOf: (key: string) => statNumbers(raw.get(key)),
    };
  });

  // Rows keep the tooltip's sections, stats before bindings and
  // requirements; within one, the first item's order, then the others'.
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
