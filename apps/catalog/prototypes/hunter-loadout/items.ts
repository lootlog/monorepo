import { SQL } from "bun";
import { itemForCharacter } from "@lootlog/domain/elastic-level";
import { itemStatRecord } from "@lootlog/domain/item-stat";
import { itemIconUrl } from "@lootlog/domain/margonem-cdn";
import type { Profession } from "../../../wiki/src/lib/equipment-set.ts";
import type { SkillRanks } from "../../../wiki/src/lib/skills/skill-tree.ts";

export const PROFESSIONS = [
  "h",
  "w",
  "p",
  "b",
  "m",
  "t",
] as const satisfies readonly Profession[];

export const PROFESSION_NAMES: Record<Profession, string> = {
  h: "łowca",
  w: "wojownik",
  p: "paladyn",
  b: "tancerz ostrzy",
  m: "mag",
  t: "tropiciel",
};

const ARMOR_SLOTS = [
  "ARMOR",
  "HELMET",
  "BOOTS",
  "GLOVES",
  "RING",
  "NECKLACE",
] as const;

const WEAPONS: Record<Profession, { weapon: string; secondary: string }> = {
  h: { weapon: "DISTANCE_WEAPON", secondary: "QUIVER" },
  t: { weapon: "DISTANCE_WEAPON", secondary: "QUIVER" },
  w: { weapon: "ONE_HAND_WEAPON", secondary: "SHIELD" },
  p: { weapon: "ONE_HAND_WEAPON", secondary: "SHIELD" },
  b: { weapon: "ONE_HAND_WEAPON", secondary: "HELP_WEAPON" },
  m: { weapon: "WAND_WEAPON", secondary: "ORB_WEAPON" },
};

export const SLOTS = ["weapon", "secondary", ...ARMOR_SLOTS] as const;

export type Slot = (typeof SLOTS)[number];

export const recordOf = <Key extends string, Value>(
  keys: readonly Key[],
  valueOf: (key: Key) => Value,
): Record<Key, Value> => {
  // SAFETY: the entries are built from every key in `keys`, so each Key is present.
  return Object.fromEntries(keys.map((key) => [key, valueOf(key)])) as Record<
    Key,
    Value
  >;
};

export const slotType = (profession: Profession, slot: Slot) =>
  slot === "weapon"
    ? WEAPONS[profession].weapon
    : slot === "secondary"
      ? WEAPONS[profession].secondary
      : slot;

const EQUIPMENT_TYPES = new Set<string>([
  ...ARMOR_SLOTS,
  ...Object.values(WEAPONS).flatMap(({ weapon, secondary }) => [
    weapon,
    secondary,
  ]),
]);

const SOURCE_GROUPS = {
  titan: ["TITAN"],
  colossus: ["COLOSSUS"],
  hero: ["HERO", "EVENT_HERO"],
  elite: ["ELITE2", "ELITE3"],
  common: ["COMMON", "ELITE", "NPC"],
  none: [],
} as const satisfies Record<string, readonly string[]>;

export type SourceGroup = keyof typeof SOURCE_GROUPS;

export const SOURCE_GROUP_KEYS = [
  "titan",
  "colossus",
  "hero",
  "elite",
  "common",
  "none",
] as const satisfies readonly SourceGroup[];

export const RARITIES = [
  "legendary",
  "upgraded",
  "heroic",
  "unique",
  "common",
] as const;

type Rarity = (typeof RARITIES)[number];

export type ItemFilters = {
  sources: ReadonlyArray<SourceGroup>;
  rarities: ReadonlyArray<Rarity>;
  includeEvents: boolean;
};

export type CatalogDocument = {
  uid: string;
  name: string;
  icon: string;
  stat: string;
  lvl: number;
  rarity: string | null;
  type: string;
  elasticLevel?: boolean;
  legendaryBonus: string | null;
  eventSlugs: string[];
  droppedByTypes?: string[];
  requiredProfessions: string[];
};

export type Item = {
  uid: string;
  name: string;
  icon: string;
  type: string;
  lvl: number;
  rarity: string;
  elastic: boolean;
  legendaryBonus: string | null;
  event: boolean;
  sources: string[];
  professions: string[];
  stats: Record<string, number>;
  record: Record<string, string>;
  stat: string;
};

const TEMPORARY_KEYS = ["expire_duration", "timelimit", "ttl", "expires"];

const NON_PHYSICAL_DAMAGE_KEYS = ["poison", "wound", "fire", "frost", "light"];

export const loadItems = async (databaseUrl: string | undefined) => {
  const sql = databaseUrl === undefined ? new SQL() : new SQL(databaseUrl);

  const rows: { document: CatalogDocument }[] = await sql`
    select document from "CatalogItem" where "gameVersion" = 'pl'
  `;

  await sql.close();

  return rows.flatMap(({ document }) =>
    EQUIPMENT_TYPES.has(document.type) &&
    !TEMPORARY_KEYS.some((key) => document.stat.includes(`${key}=`))
      ? [document]
      : [],
  );
};

export const toItem = (document: CatalogDocument, level: number): Item => {
  const scaled = itemForCharacter(document, level);
  const record = itemStatRecord(scaled.stat);
  const stats: Record<string, number> = {};

  for (const [key, value] of Object.entries(record)) {
    const numbers = value.split(",").map(Number);

    if (numbers.some((number) => !Number.isFinite(number))) continue;

    if (key === "dmg") {
      stats.dmgAvg = ((numbers[0] ?? 0) + (numbers.at(-1) ?? 0)) / 2;
    } else {
      stats[key] = numbers.at(-1) ?? 0;
    }
  }

  return {
    uid: document.uid,
    name: document.name,
    icon: itemIconUrl(document.icon),
    type: document.type,
    lvl: scaled.lvl,
    rarity: (document.rarity ?? "").toLowerCase(),
    elastic: document.elasticLevel === true,
    legendaryBonus: document.legendaryBonus,
    event: document.eventSlugs.length > 0,
    sources: document.droppedByTypes ?? [],
    professions: document.requiredProfessions,
    stats,
    record,
    stat: scaled.stat,
  };
};

export const matchesFilters = (filters: ItemFilters) => {
  const allowedTypes = new Set<string>(
    filters.sources.flatMap((group) => SOURCE_GROUPS[group]),
  );

  const allowsUnknownSource = filters.sources.includes("none");
  const allowedRarities = new Set<string>(filters.rarities);

  return (item: Item) =>
    allowedRarities.has(item.rarity || "common") &&
    (filters.includeEvents || !item.event) &&
    (item.sources.length === 0
      ? allowsUnknownSource
      : item.sources.some((type) => allowedTypes.has(type)));
};

export type Gear = Partial<Record<Slot, Item>>;

export type Build = { profession: Profession; gear: Gear; ranks: SkillRanks };

export const damageTags = (item: Item) =>
  NON_PHYSICAL_DAMAGE_KEYS.filter((key) => key in item.record).join();
