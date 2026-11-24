import { parseItemStatEntries } from "@lootlog/domain/item-stat";
import {
  ITEM_STAT_FOOTER_SECTIONS,
  mapStatsToDisplaySections,
  type ItemDisplayValue,
} from "@lootlog/ui/components/item-stat-utils";

export type ItemStatDiff = {
  changes: ReadonlyMap<string, readonly number[]>;
  lost: readonly ItemDisplayValue[];
};

const NUMBER_TEXT = /^[+-]?\d+(?:[.,]\d+)?$/;

const textNumber = (text: string) =>
  NUMBER_TEXT.test(text.trim())
    ? Number(text.trim().replace(",", "."))
    : undefined;

const displayNumbers = ({
  key,
  value,
}: ItemDisplayValue): number[] | undefined => {
  if (key?.startsWith("legbon.")) return undefined;

  const parts = Array.isArray(value) ? value : String(value).split(" - ");

  const numbers = parts.map(textNumber);

  return numbers.length > 0 && numbers.every((number) => number !== undefined)
    ? numbers
    : undefined;
};

const bodyValues = (stat: string) =>
  new Map(
    mapStatsToDisplaySections(parseItemStatEntries(stat))
      .filter(({ index }) => !ITEM_STAT_FOOTER_SECTIONS.has(index))
      .flatMap(({ values }) => values)
      .flatMap((value) =>
        value.key === undefined ? [] : [[value.key, value] as const],
      ),
  );

export const diffItemStats = (
  stat: string,
  comparedStat: string,
): ItemStatDiff => {
  const values = bodyValues(stat);
  const comparedValues = bodyValues(comparedStat);

  const changes = new Map(
    [...values].flatMap(([key, value]) => {
      const numbers = displayNumbers(value);
      const compared = comparedValues.get(key);

      if (!numbers) return [];

      if (!compared) return [[key, numbers] as const];

      const comparedNumbers = displayNumbers(compared);

      if (comparedNumbers?.length !== numbers.length) return [];

      const diff = numbers.map(
        (number, index) =>
          Math.round((number - (comparedNumbers[index] ?? 0)) * 100) / 100,
      );

      return diff.some((part) => part !== 0) ? [[key, diff] as const] : [];
    }),
  );

  return {
    changes,
    lost: [...comparedValues.values()].filter(
      ({ key }) => key !== undefined && !values.has(key),
    ),
  };
};
