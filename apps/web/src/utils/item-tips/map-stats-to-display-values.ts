import { ItemStat } from "utils/item-tips/parse-item-stats";

function isString(x: unknown): x is string {
  return typeof x === "string";
}

export const mapStatsToDisplayValues = (stats: ItemStat[]) => {
  return stats.map((stat) => mapStatDisplayValue(stat));
};

const mapStatDisplayValue = ({ key, value }: ItemStat) => {
  switch (key) {
    case "sa":
    case "slow":
      return { key, value: parseInt(value as string, 10) / 100 };
    case "legbon":
      return {
        key: `legbon.${
          isString(value) ? value.split(",")[0] : "not-supported"
        }`,
        value: false,
      };
    case "loot":
      // rethink this
      return { key, value: isString(value) ? value.split(",")[0] : "" };
    case "opis":
      return {
        key,
        value: isString(value) ? value.replace(/\[br\]/g, "\n") : "",
      };
    case "reqp":
      // rethink this
      return { key, value };
    case "rarity":
      return { key: `rarity.${value}`, value: false };
    case "rkey":
      return { key: undefined };
    default:
      return { key, value };
  }
};
