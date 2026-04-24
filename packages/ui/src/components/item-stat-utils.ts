export type ItemStat = {
  key: string;
  value: string | boolean;
};

export type ItemDisplayValue = {
  key: string | undefined;
  translateKey?: string;
  value?: string | number | boolean | string[];
};

export type StatBlocks = {
  baseStatsBlock: ItemDisplayValue[];
  descriptionBlock: ItemDisplayValue[];
  enhancementStatsBlock: ItemDisplayValue[];
  legendaryBonusBlock: ItemDisplayValue[];
  metadataBlock: ItemDisplayValue[];
  requirementsBlock: ItemDisplayValue[];
  unrecognizedBlock: ItemDisplayValue[];
  usageStatsBlock: ItemDisplayValue[];
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

const parseItemStat = (stat: string): ItemStat => {
  const [rawKey, rawValue] = stat.split("=");

  return {
    key: rawKey ?? "undefined",
    value: rawValue ?? true,
  };
};

export const parseItemStats = (stats: string): ItemStat[] => {
  return stats.split(";").filter(Boolean).map(parseItemStat);
};

const mapStatDisplayValue = (
  { key, value }: ItemStat,
  stats: ItemStat[],
): ItemDisplayValue => {
  const date = stats.find((stat) => stat.key === "created")?.value;
  const createdDate = isString(date)
    ? Number.parseInt(date, 10) * 1000
    : Date.now();
  const year = new Date(createdDate).getFullYear().toString();

  switch (key) {
    case "sa":
    case "slow":
      return { key, value: Number.parseInt(value as string, 10) / 100 };
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
        translateKey: "itemStats.prof",
        value: isString(value) ? value.split("") : [],
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
              .map((entry, index) =>
                index === 0 ? `${Number.parseInt(entry, 10) / 100}` : entry,
              )
          : [],
      };
    case "resfire":
    case "reslight":
    case "resfrost":
    case "act":
      if (!isString(value)) {
        return { key, value };
      }

      return {
        key,
        value: Number.parseInt(value, 10) > 0 ? `+${value}` : value,
      };
    default:
      return { key, value };
  }
};

export const mapStatsToDisplayValues = (stats: ItemStat[]) => {
  const blocks: StatBlocks = {
    baseStatsBlock: [],
    descriptionBlock: [],
    enhancementStatsBlock: [],
    legendaryBonusBlock: [],
    metadataBlock: [],
    requirementsBlock: [],
    unrecognizedBlock: [],
    usageStatsBlock: [],
  };

  return stats.reduce((acc, stat) => {
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
      case "outfit":
      case "timelimit":
      case "quest_expbon":
      case "perheal":
      case "npc_lootbon":
      case "enhancement_add":
      case "target_rarity":
      case "pet":
      case "honorbon":
      case "adest":
      case "fullheal":
      case "timelimit_upgmax":
        acc.baseStatsBlock.push(displayValue);
        return acc;
      case "lvl":
      case "lvlnext":
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
        acc.descriptionBlock.unshift(displayValue);
        return acc;
      case "nodepo":
      case "permbound":
      case "noauction":
      case "binds":
      case "artisan_worthless":
      case "force_binding":
        acc.metadataBlock.push(displayValue);
        return acc;
      case "created":
      case "expires":
      case "rarity":
      case "quest":
      case "outfit_selector":
      case "townlimit":
      case "expire_date":
      case "expire_duration":
      case "lootbox2":
      case "battlestats":
      case "recipe":
      case "action":
      case "play":
      case "bonus_reselect":
      case "lootbox":
      case "canpreview":
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
      case "lvlupgcost":
      case "lvlupgs":
        acc.enhancementStatsBlock.push(displayValue);
        return acc;
      default:
        acc.unrecognizedBlock.push(displayValue);
        return acc;
    }
  }, blocks);
};
