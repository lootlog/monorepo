import { ItemStat } from "utils/item-tips/parse-item-stats";

export type ItemDisplayValue = {
  key: string | undefined;
  value?: string | number | boolean | string[];
  translateKey?: string;
};

export type StatBlocks = {
  baseStatsBlock: ItemDisplayValue[];
  usageStatsBlock: ItemDisplayValue[];
  legendaryBonusBlock: ItemDisplayValue[];
  descriptionBlock: ItemDisplayValue[];
  metadataBlock: ItemDisplayValue[];
  requirementsBlock: ItemDisplayValue[];
  unrecognizedBlock: ItemDisplayValue[];
};

function isString(x: unknown): x is string {
  return typeof x === "string";
}

export const mapStatsToDisplayValues = (stats: ItemStat[]) => {
  const blocks: StatBlocks = {
    baseStatsBlock: [],
    usageStatsBlock: [],
    legendaryBonusBlock: [],
    descriptionBlock: [],
    metadataBlock: [],
    requirementsBlock: [],
    unrecognizedBlock: [],
  };

  const sortedStats = stats.reduce((acc, stat) => {
    const displayValue = mapStatDisplayValue(stat, stats);

    switch (stat.key) {
      case "absorb":
      case "absorbm":
      case "acdmg":
      case "afterheal":
      case "blok":
      case "contra":
      case "crit":
      case "critmval":
      case "critval":
      case "da":
      case "di":
      case "ds":
      case "dz":
      case "energybon":
      case "enfatig":
      case "evade":
      case "gold":
      case "heal":
      case "abdest":
      case "hp":
      case "hpbon":
      case "lowcrit":
      case "lowevade":
      case "manabon":
      case "manafatig":
      case "pierce":
      case "pierceb":
      case "resdmg":
      case "sa":
      case "nodesc":
      case "respred":
      case "slow":
      case "runes":
      case "bag":
      case "wound":
        acc.baseStatsBlock.push(displayValue);
        return acc;
      case "lvl":
        acc.requirementsBlock.push(displayValue);
        return acc;
      case "reqp":
        acc.requirementsBlock.unshift(displayValue);
        return acc;
      case "ac":
      case "act":
      case "resfire":
      case "reslight":
      case "resfrost":
        acc.baseStatsBlock.unshift(displayValue);
        return acc;
      case "dmg":
      case "fire":
      case "frost":
      case "poison":
      case "light":
      case "pdmg":
        acc.baseStatsBlock.unshift(displayValue);
        return acc;
      case "opis":
        acc.descriptionBlock.push(displayValue);
        return acc;
      case "teleport":
        acc.descriptionBlock?.unshift(displayValue);
        return acc;
      case "nodepo":
      case "permbound":
      case "binds":
        acc.metadataBlock.push(displayValue);
        return acc;
      case "created":
      case "expires":
      case "rarity":
        return acc;
      case "legbon":
        acc.legendaryBonusBlock.push(displayValue);
        return acc;
      case "amount":
      case "capacity":
      case "cansplit":
      case "ttl":
        acc.usageStatsBlock.push(displayValue);
        return acc;
      default:
        console.warn("Unrecognized stat key:", stat.key, stat.value);
        acc.unrecognizedBlock.push(displayValue);
        return acc;
    }
  }, blocks);

  return sortedStats;
};

const mapStatDisplayValue = (
  { key, value }: ItemStat,
  stats: ItemStat[]
): ItemDisplayValue => {
  const date = stats.find((s) => s.key === "created")?.value;
  const createdDate = isString(date) ? parseInt(date, 10) * 1000 : Date.now();
  const year = new Date(createdDate).getFullYear().toString();

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
    case "dmg":
    case "light":
      return {
        key,
        value: isString(value) ? value.split(",").join(" - ") : "",
      };
    case "opis":
      return {
        key,
        value: isString(value)
          ? value.replace(/\[br\]/g, "\n").replace("#YEAR#", year)
          : "",
      };
    case "reqp":
      return {
        key,
        value: isString(value) ? value.split("") : [],
        translateKey: "itemStats.prof",
      };
    case "rarity":
      return { key: `rarity.${value}`, value: false };
    case "rkey":
      return { key: undefined };
    case "wound":
    case "afterheal":
    case "manafatig":
    case "enfatig":
    case "teleport":
      return { key, value: isString(value) ? value.split(",") : [] };
    case "poison":
    case "frost":
      return {
        key,
        value: isString(value)
          ? value
              .split(",")
              .map((e, i) => (i === 0 ? `${parseInt(e, 10) / 100}` : e))
          : [],
      };
    case "resfire":
    case "reslight":
    case "resfrost":
    case "act":
      return {
        key,
        value: isString(value)
          ? parseInt(value, 10) > 0
            ? `+${value}`
            : value
          : value,
      };
    default:
      return { key, value };
  }
};
