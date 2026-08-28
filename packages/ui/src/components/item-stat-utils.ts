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

type StatValueFormatter = (
  key: string,
  value: ItemStat["value"],
  stats: ItemStat[],
) => ItemDisplayValue;

const formatDefaultStat: StatValueFormatter = (key, value) => ({ key, value });
const formatScaledStat: StatValueFormatter = (key, value) => ({
  key,
  value: Number.parseInt(value as string, 10) / 100,
});
const formatLegendaryBonus: StatValueFormatter = (_key, value) => ({
  key: `legbon.${isString(value) ? value.split(",")[0] : "not-supported"}`,
  value: false,
});
const formatRangeStat: StatValueFormatter = (key, value) => ({
  key,
  value: isString(value) ? value.split(",").join(" - ") : "",
});
const formatDescription: StatValueFormatter = (key, value, stats) => {
  const date = stats.find((stat) => stat.key === "created")?.value;
  const createdDate = isString(date)
    ? Number.parseInt(date, 10) * 1000
    : Date.now();
  const year = new Date(createdDate).getFullYear().toString();

  return {
    key,
    value: isString(value)
      ? value.replace(/\[br\]/g, "\n").replace("#YEAR#", year)
      : "",
  };
};
const formatProfessionRequirement: StatValueFormatter = (key, value) => ({
  key,
  translateKey: "itemStats.prof",
  value: isString(value) ? value.split("") : [],
});
const formatRarity: StatValueFormatter = (_key, value) => ({
  key: `rarity.${value}`,
  value: false,
});
const hideStat: StatValueFormatter = () => ({ key: undefined });
const formatListStat: StatValueFormatter = (key, value) => ({
  key,
  value: isString(value) ? value.split(",") : [],
});
const formatScaledListStat: StatValueFormatter = (key, value) => ({
  key,
  value: isString(value)
    ? value
        .split(",")
        .map((entry, index) =>
          index === 0 ? `${Number.parseInt(entry, 10) / 100}` : entry,
        )
    : [],
});
const formatSignedStat: StatValueFormatter = (key, value) => {
  if (!isString(value)) {
    return { key, value };
  }

  return {
    key,
    value: Number.parseInt(value, 10) > 0 ? `+${value}` : value,
  };
};

const STAT_VALUE_FORMATTERS: Record<string, StatValueFormatter> = {
  sa: formatScaledStat,
  slow: formatScaledStat,
  legbon: formatLegendaryBonus,
  dmg: formatRangeStat,
  light: formatRangeStat,
  opis: formatDescription,
  reqp: formatProfessionRequirement,
  rarity: formatRarity,
  rkey: hideStat,
  wound: formatListStat,
  afterheal: formatListStat,
  manafatig: formatListStat,
  enfatig: formatListStat,
  teleport: formatListStat,
  poison: formatScaledListStat,
  frost: formatScaledListStat,
  resfire: formatSignedStat,
  reslight: formatSignedStat,
  resfrost: formatSignedStat,
  act: formatSignedStat,
};

const BASE_END_KEYS = new Set([
  "absorb",
  "absorbm",
  "acdmg",
  "afterheal",
  "blok",
  "contra",
  "crit",
  "critmval",
  "critval",
  "da",
  "di",
  "ds",
  "dz",
  "energybon",
  "enfatig",
  "evade",
  "gold",
  "heal",
  "abdest",
  "hp",
  "hpbon",
  "lowcrit",
  "lowevade",
  "manabon",
  "manafatig",
  "pierce",
  "pierceb",
  "resdmg",
  "sa",
  "nodesc",
  "respred",
  "slow",
  "runes",
  "bag",
  "wound",
  "outfit",
  "timelimit",
  "quest_expbon",
  "perheal",
  "npc_lootbon",
  "enhancement_add",
  "target_rarity",
  "pet",
  "honorbon",
  "adest",
  "fullheal",
  "timelimit_upgmax",
]);
const BASE_START_KEYS = new Set([
  "ac",
  "act",
  "resfire",
  "reslight",
  "resfrost",
  "dmg",
  "fire",
  "frost",
  "poison",
  "light",
  "pdmg",
]);
const METADATA_KEYS = new Set([
  "nodepo",
  "permbound",
  "noauction",
  "binds",
  "artisan_worthless",
  "force_binding",
]);
const IGNORED_KEYS = new Set([
  "created",
  "expires",
  "rarity",
  "quest",
  "outfit_selector",
  "townlimit",
  "expire_date",
  "expire_duration",
  "lootbox2",
  "battlestats",
  "recipe",
  "action",
  "play",
  "bonus_reselect",
  "lootbox",
  "canpreview",
]);
const USAGE_KEYS = new Set(["amount", "capacity", "cansplit", "ttl"]);
const ENHANCEMENT_KEYS = new Set(["lvlupgcost", "lvlupgs"]);

type StatPlacement = {
  block: keyof StatBlocks;
  position: "start" | "end";
};

const getStatPlacement = (key: string): StatPlacement | null => {
  if (BASE_END_KEYS.has(key))
    return { block: "baseStatsBlock", position: "end" };
  if (BASE_START_KEYS.has(key))
    return { block: "baseStatsBlock", position: "start" };
  if (key === "lvl" || key === "lvlnext") {
    return { block: "requirementsBlock", position: "end" };
  }
  if (key === "reqp") return { block: "requirementsBlock", position: "start" };
  if (key === "opis") return { block: "descriptionBlock", position: "end" };
  if (key === "teleport")
    return { block: "descriptionBlock", position: "start" };
  if (METADATA_KEYS.has(key))
    return { block: "metadataBlock", position: "end" };
  if (IGNORED_KEYS.has(key)) return null;
  if (key === "legbon") {
    return { block: "legendaryBonusBlock", position: "end" };
  }
  if (USAGE_KEYS.has(key)) return { block: "usageStatsBlock", position: "end" };
  if (ENHANCEMENT_KEYS.has(key)) {
    return { block: "enhancementStatsBlock", position: "end" };
  }
  return { block: "unrecognizedBlock", position: "end" };
};

const addStatToBlock = (
  blocks: StatBlocks,
  placement: StatPlacement | null,
  displayValue: ItemDisplayValue,
) => {
  if (!placement) return;

  const block = blocks[placement.block];
  if (placement.position === "start") {
    block.unshift(displayValue);
    return;
  }

  block.push(displayValue);
};

const parseItemStat = (stat: string): ItemStat => {
  const separatorIndex = stat.indexOf("=");

  if (separatorIndex === -1) {
    return { key: stat, value: true };
  }

  return {
    key: stat.slice(0, separatorIndex),
    value: stat.slice(separatorIndex + 1),
  };
};

export const parseItemStats = (stats: string): ItemStat[] => {
  return stats.split(";").filter(Boolean).map(parseItemStat);
};

const mapStatDisplayValue = (
  { key, value }: ItemStat,
  stats: ItemStat[],
): ItemDisplayValue => {
  const formatter = STAT_VALUE_FORMATTERS[key] ?? formatDefaultStat;
  return formatter(key, value, stats);
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

  for (const stat of stats) {
    const displayValue = mapStatDisplayValue(stat, stats);
    addStatToBlock(blocks, getStatPlacement(stat.key), displayValue);
  }

  return blocks;
};
