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

export type ItemStatSection = {
  index: number;
  values: ItemDisplayValue[];
};

type StatBlockName = keyof StatBlocks;
type StatValueFormatter = (
  key: string,
  value: ItemStat["value"],
  stats: ItemStat[],
) => ItemDisplayValue | null;

type StatDefinition = {
  block: StatBlockName;
  formatter: StatValueFormatter;
  order: number;
  sectionIndex: number;
};

type StatSectionDefinition = {
  block: StatBlockName;
  keys: readonly string[];
  sectionIndex: number;
};

const ITEM_CLASS_KEYS = [
  "",
  "oneHanded",
  "twoHanded",
  "oneAndHalfHanded",
  "distanceWeapon",
  "helpWeapon",
  "wand",
  "orb",
  "armor",
  "helmet",
  "boots",
  "gloves",
  "ring",
  "necklace",
  "shield",
  "neutral",
  "consume",
  "gold",
  "keys",
  "quest",
  "renewable",
  "potion",
  "talisman",
  "book",
  "bag",
  "blessing",
  "upgrade",
  "recipe",
  "coinage",
  "arrows",
  "outfit",
  "pet",
  "teleport",
] as const;

const LEGENDARY_BONUS_VALUES: Readonly<Record<string, number>> = {
  anguish: 8,
  cleanse: 12,
  critred: 25,
  curse: 9,
  dmgred: 16,
  facade: 13,
  frenzy: 2,
  glare: 9,
  holytouch: 7,
  lastheal: 18,
  puncture: 12,
  pushback: 8,
  resgain: 16,
  retaliation: 16,
  verycrit: 17,
};

const TECHNICAL_STAT_KEYS = new Set([
  "animation",
  "battlestats",
  "book",
  "cmp-header",
  "created",
  "doubleshoot",
  "emo",
  "item_value",
  "key",
  "legbon_test",
  "mkey",
  "motel",
  "null",
  "play",
  "price",
  "progress",
  "quest",
  "rarity",
  "reqw",
  "resp",
  "rkey",
  "rlvl",
  "szablon",
]);

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function toStringValue(value: ItemStat["value"]): string {
  return isString(value) ? value : "";
}

function parseNumber(value: string): number | null {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? value.toString()
    : Number(value.toFixed(2)).toString();
}

function formatSignedValue(value: string): string {
  const parsedValue = parseNumber(value);
  return parsedValue !== null && parsedValue > 0 ? `+${value}` : value;
}

function formatAbsoluteValue(value: string): string {
  const parsedValue = parseNumber(value);
  return parsedValue === null ? value : formatNumber(Math.abs(parsedValue));
}

function formatRange(value: string): string {
  return value.split(",").join(" - ");
}

function formatColonRange(value: string): string {
  return value.replace(/[()]/g, "").split(":").join(" - ");
}

function getStatValue(stats: ItemStat[], key: string): string | undefined {
  const value = stats.find((stat) => stat.key === key)?.value;
  return isString(value) ? value : undefined;
}

function hasStat(stats: ItemStat[], key: string): boolean {
  return stats.some((stat) => stat.key === key);
}

function isPresentItemClassKey<T extends string>(
  value: T | undefined,
): value is T {
  return Boolean(value);
}

const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatUnixDate(value: string): string {
  const timestamp = Number.parseInt(value, 10);
  return Number.isFinite(timestamp)
    ? dateTimeFormatter.format(new Date(timestamp * 1000))
    : value;
}

function getCreatedDate(stats: ItemStat[]): Date {
  const created = getStatValue(stats, "created");
  const timestamp = created ? Number.parseInt(created, 10) : Number.NaN;
  return Number.isFinite(timestamp) ? new Date(timestamp * 1000) : new Date();
}

function getShiftedYear(
  stats: ItemStat[],
  offset: string,
  unit: string,
): string {
  const date = getCreatedDate(stats);
  const parsedOffset = Number.parseInt(offset, 10);
  if (!Number.isFinite(parsedOffset)) {
    return date.getFullYear().toString();
  }

  if (unit === "D") {
    date.setDate(date.getDate() + parsedOffset);
  } else if (unit === "M") {
    date.setMonth(date.getMonth() + parsedOffset);
  }

  return date.getFullYear().toString();
}

const formatDefaultStat: StatValueFormatter = (key, value) => ({ key, value });

const formatScaledStat: StatValueFormatter = (key, value) => {
  const parsedValue = parseNumber(toStringValue(value));
  return {
    key,
    value: parsedValue === null ? toStringValue(value) : parsedValue / 100,
  };
};

const formatSignedStat: StatValueFormatter = (key, value) => ({
  key,
  value: formatSignedValue(toStringValue(value)),
});

const formatRangeStat: StatValueFormatter = (key, value) => ({
  key,
  value: formatRange(toStringValue(value)),
});

const formatListStat: StatValueFormatter = (key, value) => ({
  key,
  value: toStringValue(value).split(","),
});

const formatScaledListStat: StatValueFormatter = (key, value) => {
  const entries = toStringValue(value).split(",");
  const scaledValue = parseNumber(entries[0] ?? "");
  if (scaledValue !== null) {
    entries[0] = formatNumber(scaledValue / 100);
  }

  return { key, value: entries };
};

const formatDescription: StatValueFormatter = (key, value, stats) => {
  const createdDate = getCreatedDate(stats);
  const description = toStringValue(value)
    .replace(/\[br\]/g, "\n")
    .replace(/#DATE#/g, dateTimeFormatter.format(createdDate))
    .replace(/#YEAR#/g, createdDate.getFullYear().toString())
    .replace(/#YEAR,([-0-9]+),(D|M)#/g, (_match, offset, unit) =>
      getShiftedYear(stats, offset, unit),
    );

  return { key, value: description };
};

const formatProfessionRequirement: StatValueFormatter = (key, value) => ({
  key,
  translateKey: "itemStats.prof",
  value: toStringValue(value).split(""),
});

const formatTargetClass: StatValueFormatter = (key, value) => {
  const rawValue = toStringValue(value);
  const aliases: Readonly<Record<string, string[]>> = {
    EQUIPPABLE: ["allEquippable"],
    HANDHELD: ["allHandheld"],
    WEAPONS: ["allWeapons"],
  };
  const aliasValues = aliases[rawValue];
  if (aliasValues) {
    return { key, translateKey: "itemStats.class", value: aliasValues };
  }

  const classKeys = rawValue
    .split(",")
    .map((entry) => ITEM_CLASS_KEYS[Number.parseInt(entry.trim(), 10)])
    .filter(isPresentItemClassKey);
  return { key, translateKey: "itemStats.class", value: classKeys };
};

const formatRarityRequirement: StatValueFormatter = (key, value) => ({
  key,
  translateKey: "itemStats.rarity",
  value: [toStringValue(value)],
});

const formatLegendaryBonus: StatValueFormatter = (_key, value) => {
  const bonusName = toStringValue(value).split(",")[0] ?? "";
  const bonusValue = LEGENDARY_BONUS_VALUES[bonusName];
  return bonusValue === undefined
    ? { key: "legbon.not-supported", value: bonusName }
    : { key: `legbon.${bonusName}`, value: bonusValue };
};

const formatSocketContent: StatValueFormatter = (key, value, stats) => {
  if (hasStat(stats, "socket_fleeting_legbon")) {
    return { key: `${key}.fleeting`, value: false };
  }

  return parseNumber(toStringValue(value)) === 0
    ? { key: `${key}.empty`, value: false }
    : { key: `${key}.filled`, value: false };
};

const formatNestedBonus: StatValueFormatter = (_key, value) => {
  const [bonusName = "unknown", ...bonusValues] =
    toStringValue(value).split(",");
  if (bonusName === "sa" || bonusName === "slow") {
    const parsedValue = parseNumber(bonusValues[0] ?? "");
    if (parsedValue !== null) {
      bonusValues[0] = formatNumber(parsedValue / 100);
    }
  }

  if (bonusName === "enfatig" || bonusName === "manafatig") {
    return { key: `bonus.${bonusName}`, value: bonusValues };
  }

  const supportedBonusNames = new Set([
    "ac",
    "act",
    "crit",
    "critmval",
    "critval",
    "resdmg",
    "resfire",
    "resfrost",
    "reslight",
    "sa",
    "slow",
  ]);
  if (!supportedBonusNames.has(bonusName)) {
    return {
      key: "bonus.not-supported",
      value: [bonusName, bonusValues[0] ?? ""],
    };
  }

  return { key: `bonus.${bonusName}`, value: bonusValues[0] ?? "" };
};

const formatAction: StatValueFormatter = (_key, value) => {
  const [actionName = "unknown", ...actionValues] =
    toStringValue(value).split(",");
  const staticActions = new Set([
    "auction",
    "clandeposit",
    "deposit",
    "flee",
    "mail",
    "shop",
  ]);
  if (staticActions.has(actionName)) {
    return { key: `action.${actionName}`, value: false };
  }

  if (actionName === "fatigue") {
    const fatigue = parseNumber(actionValues[0] ?? "");
    return {
      key:
        fatigue !== null && fatigue < 0
          ? "action.fatigueRemove"
          : "action.fatigueAdd",
      value: formatAbsoluteValue(actionValues[0] ?? ""),
    };
  }

  if (actionName === "fightperheal") {
    return {
      key:
        actionValues.length > 1 ? "action.fightHealRange" : "action.fightHeal",
      value: actionValues,
    };
  }

  if (actionName === "nloc") {
    return {
      key:
        actionValues[0] === "*" ? "action.heroLocation" : "action.npcLocation",
      value: actionValues[0] ?? "",
    };
  }

  return { key: "action.not-supported", value: actionName };
};

const formatHealingStat: StatValueFormatter = (_key, value) => {
  const rawValue = toStringValue(value);
  if (rawValue.includes(":")) {
    return { key: "trujeRange", value: formatColonRange(rawValue) };
  }

  const parsedValue = parseNumber(rawValue);
  return parsedValue !== null && parsedValue < 0
    ? { key: "truje", value: formatAbsoluteValue(rawValue) }
    : { key: "leczy", value: rawValue };
};

function formatSignedVariant(
  key: string,
  value: ItemStat["value"],
): ItemDisplayValue {
  const rawValue = toStringValue(value);
  const parsedValue = parseNumber(rawValue);
  return {
    key:
      parsedValue !== null && parsedValue < 0
        ? `${key}.decrease`
        : `${key}.increase`,
    value: formatAbsoluteValue(rawValue),
  };
}

const formatSignedVariantStat: StatValueFormatter = (key, value) =>
  formatSignedVariant(key, value);

const formatExpiry: StatValueFormatter = (key, value) => {
  const rawValue = toStringValue(value);
  const expiresAt = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(expiresAt)) {
    return { key: `${key}.unknown`, value: rawValue };
  }

  if (expiresAt <= Math.floor(Date.now() / 1000)) {
    return { key: `${key}.expired`, value: false };
  }

  return { key: `${key}.active`, value: formatUnixDate(rawValue) };
};

const formatDuration: StatValueFormatter = (key, value) => {
  const rawValue = toStringValue(value);
  const match = /^(\d+)([dhms])$/.exec(rawValue);
  if (!match) {
    return { key: `${key}.unknown`, value: rawValue };
  }

  const [, duration = "", unit = ""] = match;
  return { key: `${key}.${unit}`, value: duration };
};

const formatOutfit: StatValueFormatter = (key, value) => {
  const [duration = "0", , location = ""] = toStringValue(value).split(",");
  const durationMinutes = Number.parseInt(duration, 10);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
    return { key: `${key}.permanent`, value: location };
  }

  if (durationMinutes < 99) {
    return { key: `${key}.minutes`, value: [duration, location] };
  }

  return {
    key: `${key}.hours`,
    value: [formatNumber(durationMinutes / 60), location],
  };
};

const formatPet: StatValueFormatter = (key, value) => {
  const entries = toStringValue(value).split(",");
  const tasks = entries
    .slice(2)
    .filter(
      (entry) => !["elite", "heroic", "legendary", "quest"].includes(entry),
    )
    .flatMap((entry) => entry.split("|"))
    .map((entry) => entry.replace(/#.*/, ""))
    .filter(Boolean);

  return {
    key: entries.includes("quest") ? `${key}.quest` : `${key}.default`,
    value: tasks.join("\n- "),
  };
};

const formatLoot: StatValueFormatter = (key, value) => {
  const [playerName = "", , groupSize = "", timestamp = "", npcName = ""] =
    toStringValue(value).split(",");
  const parsedGroupSize = Number.parseInt(groupSize, 10);
  let variant = "solo";
  if (parsedGroupSize === 2) {
    variant = "companion";
  } else if (parsedGroupSize > 2) {
    variant = "party";
  }

  return {
    key: `${key}.${variant}`,
    value: [formatUnixDate(timestamp), npcName, playerName],
  };
};

const formatCustomTeleport: StatValueFormatter = (key, value) => {
  const rawValue = toStringValue(value);
  return rawValue
    ? { key: `${key}.set`, value: rawValue.split(",") }
    : { key: `${key}.empty`, value: false };
};

const formatEnhancementRefund: StatValueFormatter = (key, value) => {
  const amount = parseNumber(toStringValue(value));
  return {
    key: amount !== null && amount > 1 ? `${key}.multiple` : `${key}.default`,
    value: toStringValue(value),
  };
};

const formatExperienceLevelBonus: StatValueFormatter = (key, value) => {
  const [level = "", multiplier = ""] = toStringValue(value).split(",");
  return { key, value: [multiplier, level] };
};

const formatTeleport: StatValueFormatter = (key, value) => ({
  key,
  value: toStringValue(value).split(","),
});

const formatBtype: StatValueFormatter = (key, value) => {
  const classKeys = toStringValue(value)
    .split(",")
    .map((entry) => ITEM_CLASS_KEYS[Number.parseInt(entry, 10)])
    .filter(isPresentItemClassKey);
  return { key, translateKey: "itemStats.class", value: classKeys };
};

const formatAmount: StatValueFormatter = (key, value) => ({
  key,
  value: formatColonRange(toStringValue(value)),
});

const formatCanSplit: StatValueFormatter = (key, value) => ({
  key: Number.parseInt(toStringValue(value), 10) ? `${key}.yes` : `${key}.no`,
  value: false,
});

const formatTimelimit: StatValueFormatter = (key, value) => ({
  key,
  value: toStringValue(value).split(",")[0] ?? "",
});

const formatPumpkinWeight: StatValueFormatter = (key, value) => {
  const parsedValue = parseNumber(toStringValue(value));
  return {
    key,
    value: parsedValue === null ? toStringValue(value) : parsedValue / 1000,
  };
};

const formatEtiquette: StatValueFormatter = (key, value) => {
  const entries = toStringValue(value).split("|");
  return { key, value: entries[entries.length - 1] ?? "" };
};

const formatBindingMetadata: StatValueFormatter = (key, value, stats) => {
  if (
    hasStat(stats, "permbound") &&
    ["binds", "noauction", "nodepoclan", "soulbound"].includes(key)
  ) {
    return null;
  }

  return { key, value };
};

const formatResManaEnergyDestroy: StatValueFormatter = (key, value) => {
  const rawValue = toStringValue(value);
  const parsedValue = parseNumber(rawValue);
  const energyValue =
    parsedValue === null
      ? rawValue
      : Math.max(1, Math.round(parsedValue * 0.444));
  return { key, value: [rawValue, energyValue.toString()] };
};

const STAT_VALUE_FORMATTERS: Readonly<Record<string, StatValueFormatter>> = {
  act: formatSignedStat,
  action: formatAction,
  afterheal: formatListStat,
  afterheal2: formatListStat,
  amount: formatAmount,
  artisanbon: formatSignedStat,
  binds: formatBindingMetadata,
  bonus: formatNestedBonus,
  btype: formatBtype,
  cansplit: formatCanSplit,
  custom_teleport: formatCustomTeleport,
  dmg: formatRangeStat,
  dmgmul: formatSignedStat,
  dmgmulabsolute: formatSignedStat,
  combo_multiplier: formatSignedStat,
  dmgmulfire: formatSignedStat,
  dmgmulfrost: formatSignedStat,
  dmgmullight: formatSignedStat,
  dmgmulphysical: formatSignedStat,
  dmgmulpoison: formatSignedStat,
  dmgmulwound: formatSignedStat,
  enfatig: formatListStat,
  enhancement_refund: formatEnhancementRefund,
  etiquette: formatEtiquette,
  expaddlvl: formatExperienceLevelBonus,
  expire_date: (key, value) => ({
    key,
    value: formatUnixDate(toStringValue(value)),
  }),
  expire_duration: formatDuration,
  expires: formatExpiry,
  frost: formatScaledListStat,
  legbon: formatLegendaryBonus,
  leczy: formatHealingStat,
  light: formatRangeStat,
  loot: formatLoot,
  manafatig: formatListStat,
  noauction: formatBindingMetadata,
  nodepoclan: formatBindingMetadata,
  npc_expbon: formatSignedVariantStat,
  opis: formatDescription,
  outfit: formatOutfit,
  perheal: formatSignedVariantStat,
  pet: formatPet,
  poison: formatScaledListStat,
  pumpkin_weight: formatPumpkinWeight,
  quest_expbon: formatSignedVariantStat,
  reqp: formatProfessionRequirement,
  resfire: formatSignedStat,
  resfrost: formatSignedStat,
  reslight: formatSignedStat,
  resmanaendest: formatResManaEnergyDestroy,
  sa: formatScaledStat,
  slow: formatScaledStat,
  socket_content: formatSocketContent,
  socket_fleeting_legbon: formatLegendaryBonus,
  socket_injection_legbon: formatLegendaryBonus,
  soulbound: formatBindingMetadata,
  target_class: formatTargetClass,
  target_rarity: formatRarityRequirement,
  teleport: formatTeleport,
  timelimit: formatTimelimit,
  wanted_change: formatSignedVariantStat,
  wound: formatListStat,
};

const STAT_SECTIONS = [
  {
    block: "requirementsBlock",
    keys: ["lowreq"],
    sectionIndex: 0,
  },
  {
    block: "baseStatsBlock",
    keys: [
      "dmg",
      "ac",
      "act",
      "expire_duration",
      "expires",
      "leczy",
      "npc_expbon",
      "pdmg",
      "resfire",
      "resfrost",
      "reslight",
    ],
    sectionIndex: 1,
  },
  {
    block: "baseStatsBlock",
    keys: ["fire", "frost", "light", "pet", "poison", "summonparty"],
    sectionIndex: 2,
  },
  {
    block: "baseStatsBlock",
    keys: [
      "abdest",
      "absorb",
      "absorbm",
      "acdmg",
      "action",
      "adest",
      "afterheal",
      "afterheal2",
      "bag",
      "blok",
      "bonus_reselect",
      "contra",
      "creditsbon",
      "crit",
      "critmval",
      "critval",
      "da",
      "di",
      "dmgmul",
      "dmgmulabsolute",
      "combo_multiplier",
      "dmgmulfire",
      "dmgmulfrost",
      "dmgmullight",
      "dmgmulphysical",
      "dmgmulpoison",
      "dmgmulwound",
      "ds",
      "dz",
      "energybon",
      "endest",
      "enfatig",
      "enhancement_add",
      "enhancement_add_point",
      "evade",
      "expire_date",
      "force_binding",
      "freeskills",
      "fullheal",
      "gold",
      "goldpack",
      "heal",
      "honorbon",
      "hp",
      "hpbon",
      "lootbox",
      "lootbox2",
      "lowcrit",
      "lowcritallval",
      "lowevade",
      "lowheal2turns",
      "manabon",
      "manadest",
      "manafatig",
      "npc_lootbon",
      "outfit",
      "outfit_selector",
      "perheal",
      "pierce",
      "pierceb",
      "quest_expbon",
      "recipe",
      "resdmg",
      "resmanaendest",
      "respred",
      "revive",
      "rkeydesc",
      "runes",
      "sa",
      "slow",
      "socket_component",
      "socket_enhancer",
      "stamina",
      "target_rarity",
      "timelimit",
      "timelimit_upgmax",
      "timelimit_upgs",
      "wound",
    ],
    sectionIndex: 3,
  },
  {
    block: "enhancementStatsBlock",
    keys: [
      "add_battleset",
      "add_enhancement_refund",
      "add_tab_deposit",
      "amount",
      "bonus",
      "bonus_not_selected",
      "btype",
      "cansplit",
      "capacity",
      "cursed",
      "enhancement_refund",
      "expadd",
      "expaddlvl",
      "lvlupgcost",
      "lvlupgs",
      "reset_custom_teleport",
      "ttl",
      "upglvl",
      "upgtimelimit",
      "wanted_change",
    ],
    sectionIndex: 4,
  },
  {
    block: "legendaryBonusBlock",
    keys: [
      "socket_content",
      "socket_fleeting_legbon",
      "socket_injection_legbon",
      "legbon",
      "townlimit",
    ],
    sectionIndex: 5,
  },
  {
    block: "descriptionBlock",
    keys: ["furniture", "nodesc", "loot"],
    sectionIndex: 6,
  },
  {
    block: "descriptionBlock",
    keys: [
      "teleport",
      "custom_teleport",
      "opis",
      "etiquette",
      "pumpkin_weight",
    ],
    sectionIndex: 7,
  },
  {
    block: "metadataBlock",
    keys: [
      "permbound",
      "soulbound",
      "artisanbon",
      "binds",
      "artisan_worthless",
      "canpreview",
      "enhancement_upgrade_lvl",
      "recovered",
      "noauction",
      "nodepo",
      "nodepoclan",
      "notakeoff",
      "outexchange",
      "personal",
      "unbind",
      "unbind_credits",
      "undoupg",
    ],
    sectionIndex: 8,
  },
  {
    block: "requirementsBlock",
    keys: [
      "target_class",
      "reqp",
      "maxuselvl",
      "maxstatslvl",
      "target_min_lvl",
      "target_max_lvl",
      "lvl",
      "lvlnext",
    ],
    sectionIndex: 9,
  },
] as const satisfies readonly StatSectionDefinition[];

function getSemanticBlock(
  key: string,
  fallbackBlock: StatBlockName,
): StatBlockName {
  if (["amount", "cansplit", "capacity", "ttl"].includes(key)) {
    return "usageStatsBlock";
  }
  if (["lvlupgcost", "lvlupgs"].includes(key)) {
    return "enhancementStatsBlock";
  }

  return fallbackBlock;
}

function createStatDefinitions(): ReadonlyMap<string, StatDefinition> {
  const definitions = new Map<string, StatDefinition>();
  let order = 0;

  for (const section of STAT_SECTIONS) {
    for (const key of section.keys) {
      if (!definitions.has(key)) {
        definitions.set(key, {
          block: getSemanticBlock(key, section.block),
          formatter: STAT_VALUE_FORMATTERS[key] ?? formatDefaultStat,
          order,
          sectionIndex: section.sectionIndex,
        });
      }
      order += 1;
    }
  }

  return definitions;
}

const STAT_DEFINITIONS = createStatDefinitions();

export const SUPPORTED_ITEM_STAT_KEYS = [...STAT_DEFINITIONS.keys()];

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

type OrderedDisplayValue = {
  block: StatBlockName;
  order: number;
  sectionIndex: number;
  value: ItemDisplayValue;
};

function mapStatsToOrderedValues(stats: ItemStat[]): OrderedDisplayValue[] {
  const orderedValues: OrderedDisplayValue[] = [];
  let unknownOrder = STAT_DEFINITIONS.size;

  for (const stat of stats) {
    if (TECHNICAL_STAT_KEYS.has(stat.key)) {
      continue;
    }

    const definition = STAT_DEFINITIONS.get(stat.key);
    if (!definition) {
      orderedValues.push({
        block: "unrecognizedBlock",
        order: unknownOrder,
        sectionIndex: 10,
        value: { key: stat.key, value: stat.value },
      });
      unknownOrder += 1;
      continue;
    }

    const displayValue = definition.formatter(stat.key, stat.value, stats);
    if (displayValue) {
      orderedValues.push({ ...definition, value: displayValue });
    }
  }

  return orderedValues.sort((left, right) => left.order - right.order);
}

export const mapStatsToDisplaySections = (
  stats: ItemStat[],
): ItemStatSection[] => {
  const sections = new Map<number, ItemDisplayValue[]>();
  for (const entry of mapStatsToOrderedValues(stats)) {
    const values = sections.get(entry.sectionIndex) ?? [];
    values.push(entry.value);
    sections.set(entry.sectionIndex, values);
  }

  return [...sections.entries()]
    .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .map(([index, values]) => ({ index, values }));
};

function createEmptyBlocks(): StatBlocks {
  return {
    baseStatsBlock: [],
    descriptionBlock: [],
    enhancementStatsBlock: [],
    legendaryBonusBlock: [],
    metadataBlock: [],
    requirementsBlock: [],
    unrecognizedBlock: [],
    usageStatsBlock: [],
  };
}

export const mapStatsToDisplayValues = (stats: ItemStat[]): StatBlocks => {
  const blocks = createEmptyBlocks();
  for (const entry of mapStatsToOrderedValues(stats)) {
    blocks[entry.block].push(entry.value);
  }

  return blocks;
};
