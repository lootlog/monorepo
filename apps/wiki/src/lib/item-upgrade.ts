import { range } from "es-toolkit";
import { parseItemStats } from "@lootlog/ui/components/item-stat-utils";
import { findEquipmentSlot } from "@/lib/equipment-slots";

/**
 * Margonem's item upgrade (ulepszanie), from the game's rules at
 * https://pomoc.margonem.pl/index/view,372. Each upgrade level raises the
 * item's virtual level, and its stats follow the formulas that level gives.
 */

export const UPGRADE_LEVELS = [0, 1, 2, 3, 4, 5] as const;

export type UpgradeLevel = (typeof UPGRADE_LEVELS)[number];

export const isUpgradeLevel = (value: number): value is UpgradeLevel =>
  UPGRADE_LEVELS.some((level) => level === value);

// Only items of level 20 and above take part in upgrading.
const MIN_UPGRADE_ITEM_LEVEL = 20;

/** `lvl + round(lvl * 0.03) * N`, the level an item's stats are computed at. */
export const upgradedItemLevel = (level: number, upgrade: UpgradeLevel) =>
  level + Math.round(level * 0.03) * upgrade;

/**
 * How far an item is upgraded and, from +5, the extra bonus the player chose
 * for it.
 */
export type ItemUpgrade = { level: UpgradeLevel; bonus?: UpgradeBonusKey };

export const NO_UPGRADE: ItemUpgrade = { level: 0 };

const MAX_UPGRADE_LEVEL = 5;

const levelPower = (level: number) => 0.02 * level ** 2 + 2.6 * level;

const RARITY_FACTOR = new Map(
  Object.entries({
    COMMON: 0,
    UNIQUE: 1,
    HEROIC: 2,
    UPGRADED: 2,
    LEGENDARY: 3,
  }),
);

const rarityPower = (level: number, factor: number) =>
  0.02 * level * Math.ceil((10 * factor) / 3) +
  Math.sign(factor) * (7.8 * factor + 2.6);

const WEAPON_TYPES = new Set([
  "ONE_HAND_WEAPON",
  "TWO_HAND_WEAPON",
  "ONE_AND_HALF_HAND_WEAPON",
  "DISTANCE_WEAPON",
  "HELP_WEAPON",
  "WAND_WEAPON",
  "ORB_WEAPON",
]);

const CLASS_POWER = new Map(
  Object.entries({ HELMET: 0.33, BOOTS: 0.3, GLOVES: 0.25, SHIELD: 0.75 }),
);

/**
 * How a stat value grows: `base + amount * growth(level)`, where `amount` is
 * the item's own, such as the number of bonuses of that kind it was given.
 */
type Scale = { base: number; growth: (level: number) => number };

/**
 * Per stat, how each of its comma-separated values grows, the last rule
 * covering the rest; `null` keeps a value. Stats without a rule, such as
 * critical chance or resistances, do not depend on level.
 */
const statRules = (rarity: string | null, type: string | null) => {
  const factor = RARITY_FACTOR.get(rarity ?? "COMMON") ?? 0;
  const classPower = CLASS_POWER.get(type ?? "") ?? 1;

  // Weapon damage, armor and absorption: `factor * (rarity_power + level_power)`.
  const power: Scale = {
    base: 0,
    growth: (level) => rarityPower(level, factor) + levelPower(level),
  };

  // `base + amount * perLevel * level`
  const linear = (base: number, perLevel: number): Scale => ({
    base,
    growth: (level) => perLevel * level,
  });

  const isWeapon = WEAPON_TYPES.has(type ?? "");

  return new Map<string, ReadonlyArray<Scale | null>>(
    Object.entries({
      dmg: [power],
      fire: [power],
      light: [power],
      // The slowing that comes with frost and poison, then their damage.
      frost: [linear(0, 1), power],
      poison: [linear(0, 1), power],
      // Its chance stays; its damage grows.
      wound: [null, power],
      ac: [power],
      absorb: [power],
      absorbm: [power],
      abdest: [power],
      acdmg: [
        {
          base: 1,
          growth: (level) => ((isWeapon ? 1 : 0.75) * levelPower(level)) / 50,
        },
      ],
      da: [linear(8, 0.25)],
      ds: [linear(4, 5 / 9)],
      dz: [linear(4, 5 / 9)],
      di: [linear(4, 5 / 9)],
      // Attack speed and slowing are kept in hundredths.
      sa: [linear(8, 0.25)],
      slow: [linear(8, 2 / 7)],
      hp: [
        {
          base: 0,
          growth: (level) =>
            3.08 * Math.round(8 + level + 0.2 * levelPower(level) * classPower),
        },
      ],
      heal: [
        {
          base: 8,
          growth: (level) => 0.8 * level + 0.2 * levelPower(level) * classPower,
        },
      ],
      adest: [
        {
          base: 4,
          growth: (level) => 0.5 * level + 0.1 * levelPower(level) * classPower,
        },
      ],
      blok: [linear(0, 3 / 20)],
      evade: [linear(0, 1 / 10)],
      lowevade: [linear(0, 1 / 10)],
      hpbon: [linear(0, 1 / 100)],
      manabon: [linear(5, 1 / 4)],
      energybon: [{ base: 0, growth: (level) => 10 + level / 15 }],
      enfatig: [null, { base: 0, growth: (level) => 2 + 0.04 * level }],
      manafatig: [null, { base: 0, growth: (level) => 6 + 0.08 * level }],
      endest: [{ base: 0, growth: (level) => 2 + 0.02 * level }],
      manadest: [{ base: 0, growth: (level) => 5 + 0.04 * level }],
    }),
  );
};

const decimalsOf = (value: string) => value.split(".")[1]?.length ?? 0;

const roundTo = (value: number, decimals: number) =>
  Number(value.toFixed(decimals));

/**
 * The value at `toLevel` of one the item shows at `fromLevel`. The amount
 * behind a shown value is rounded away, so a whole or half amount that gives
 * the same value is taken as the item's: it is what designers hand out.
 */
const scaleValue = (
  value: string,
  scale: Scale,
  fromLevel: number,
  toLevel: number,
  extraAmount = 0,
) => {
  const shown = Number(value);
  const from = scale.growth(fromLevel);

  if (!Number.isFinite(shown) || from === 0) return value;

  const decimals = decimalsOf(value);
  const amount = (shown - scale.base) / from;
  const roundAmount = Math.round(amount * 2) / 2;

  const exact =
    roundTo(scale.base + roundAmount * from, decimals) === shown
      ? roundAmount
      : amount;

  return String(
    roundTo(
      scale.base + (exact + extraAmount) * scale.growth(toLevel),
      decimals,
    ),
  );
};

type UpgradableItem = {
  stat: string;
  lvl: number;
  rarity: string | null;
  type: string | null;
};

/**
 * Whether the game lets the item be upgraded: worn equipment of level 20 and
 * up that neither runs out (cursed) nor expires. Arrows and blessings have no
 * equipment slot.
 */
export const isUpgradable = (item: UpgradableItem) =>
  findEquipmentSlot(item.type) !== undefined &&
  item.lvl >= MIN_UPGRADE_ITEM_LEVEL &&
  !item.stat
    .split(";")
    .some((entry) => /^(cursed|expire_duration)(=|$)/.test(entry));

const ARMOR_PIECES = new Set(["ARMOR", "HELMET", "GLOVES", "BOOTS", "SHIELD"]);

/**
 * An armor piece's armor and absorption factors by the professions it is
 * for, their letters in alphabetical order, from the game's armor table;
 * only magic users' pieces absorb.
 */
const ARMOR_FACTOR = new Map(
  Object.entries({
    b: 0.1125,
    w: 0.135,
    p: 0.125,
    m: 0.0625,
    t: 0.0875,
    h: 0.1,
    bw: 0.12375,
    bp: 0.11875,
    bt: 0.1,
    bh: 0.10625,
    pw: 0.13,
    mp: 0.09375,
    pt: 0.115,
    mt: 0.075,
    ht: 0.09375,
    bpw: 0.12,
    bhw: 0.11625,
    bht: 0.1,
    mpt: 0.09375,
    bhpw: 0.12,
    bhmptw: 0.1125,
  }),
);

const ABSORB_FACTOR = new Map(
  Object.entries({
    m: 0.375,
    t: 0.25,
    mp: 0.1875,
    pt: 0.075,
    mt: 0.3125,
    mpt: 0.21,
  }),
);

/**
 * Armor and absorption an item has natively, `scale * factor * class_power *
 * (rarity_power + level_power)`, plus the bonuses it was given, each
 * `perBonus * level_power * class_power`: the two grow differently.
 */
const DEFENSE_STATS = new Map(
  Object.entries({
    ac: { scale: 8, factors: ARMOR_FACTOR, perBonus: 0.15 },
    absorb: { scale: 8, factors: ABSORB_FACTOR, perBonus: 0.6 },
    absorbm: { scale: 4, factors: ABSORB_FACTOR, perBonus: 0.6 },
  }),
);

// An armor bonus raises the native value's quality by one, up to three.
const MAX_QUALITY_BONUS = 3;

// The most bonuses of one kind the game's table hands out.
const MAX_DEFENSE_BONUSES = 6;

/**
 * The item's armor or absorption at a level and with extra bonuses, from
 * the native part and bonus count that give the value it shows; none when
 * no split gives it, and the stat's own rule scales it instead.
 */
const defenseScale = (item: UpgradableItem, key: string, shown: number) => {
  const defense = DEFENSE_STATS.get(key);

  if (!defense) return undefined;

  const professions = [
    ...String(
      parseItemStats(item.stat).find((stat) => stat.key === "reqp")?.value ??
        "bhmptw",
    ),
  ]
    .sort()
    .join("");

  const factor = ARMOR_PIECES.has(item.type ?? "")
    ? (defense.factors.get(professions) ?? 0)
    : 0;

  const classPower = CLASS_POWER.get(item.type ?? "") ?? 1;
  const rarity = RARITY_FACTOR.get(item.rarity ?? "COMMON") ?? 0;

  const valueAt = (level: number, quality: number, bonuses: number) =>
    defense.scale *
      factor *
      classPower *
      (rarityPower(level, quality) + levelPower(level)) +
    bonuses * defense.perBonus * levelPower(level) * classPower;

  for (const qualityBonus of range(factor === 0 ? 1 : MAX_QUALITY_BONUS + 1)) {
    for (const halfBonuses of range(MAX_DEFENSE_BONUSES * 2 + 1)) {
      const quality = rarity + qualityBonus;
      const bonuses = halfBonuses / 2;

      if (Math.round(valueAt(item.lvl, quality, bonuses)) === shown) {
        return (level: number, extraBonuses: number) =>
          Math.round(valueAt(level, quality, bonuses + extraBonuses));
      }
    }
  }

  return undefined;
};

/** The item's stats computed at `toLevel`, without its upgrade entries. */
const scaleStats = (item: UpgradableItem, toLevel: number) => {
  const rules = statRules(item.rarity, item.type);

  return item.stat
    .split(";")
    .filter(Boolean)
    .filter(
      (entry) =>
        !entry.startsWith("enhancement_upgrade_lvl=") &&
        !entry.startsWith("bonus="),
    )
    .map((entry) => {
      const separator = entry.indexOf("=");

      if (separator === -1) return entry;

      const key = entry.slice(0, separator);
      const values = entry.slice(separator + 1).split(",");

      // A legendary bonus is as strong as its item's virtual level.
      if (key === "legbon" && values.length === 2) {
        return `${key}=${values[0]},${toLevel}`;
      }

      const defense =
        values.length === 1
          ? defenseScale(item, key, Number(values[0]))
          : undefined;

      if (defense) return `${key}=${defense(toLevel, 0)}`;

      const scales = rules.get(key);

      if (!scales) return entry;

      const scaled = values.map((value, index) => {
        const scale = scales[Math.min(index, scales.length - 1)];

        return scale ? scaleValue(value, scale, item.lvl, toLevel) : value;
      });

      return `${key}=${scaled.join(",")}`;
    });
};

/**
 * The item's own stat names the +5 bonus raises: one more bonus of that
 * stat, so a base the stat already has is not added again; 0.94 attack speed
 * from one bonus at 345 becomes `round(8 + 2 * 0.25 * 345)` = 1.81, not 1.88.
 * An item without the stat gains it as one bonus.
 */
const addUpgradeBonus = (
  entries: ReadonlyArray<string>,
  key: UpgradeBonusKey,
  item: UpgradableItem,
  toLevel: number,
) => {
  const formula = BONUS_VALUES[key];
  const perBonus = formula.perBonus(bonusContext(item, toLevel));
  const prefix = `${key}=`;
  const index = entries.findIndex((entry) => entry.startsWith(prefix));

  const current =
    index === -1 ? undefined : entries[index]?.slice(prefix.length);

  if (current === undefined) {
    const value = Math.round(formula.base + perBonus);

    return { entries: [...entries, `${prefix}${value}`], added: value };
  }

  const scale = statRules(item.rarity, item.type).get(key)?.[0];

  const baseValue = parseItemStats(item.stat).find(
    (stat) => stat.key === key,
  )?.value;

  const defense = defenseScale(item, key, Number(baseValue));

  const next = defense
    ? String(defense(toLevel, 1))
    : scale && AMOUNT_SCALED_BONUSES.has(key)
      ? scaleValue(current, scale, toLevel, toLevel, 1)
      : String(Math.round(Number(current) + perBonus));

  return {
    entries: entries.map((entry, entryIndex) =>
      entryIndex === index ? `${prefix}${next}` : entry,
    ),
    added: Number(next) - Number(current),
  };
};

/**
 * The item's stats once upgraded, in the game's stat format, with the upgrade
 * level among them as the game lists it and, at +5, the chosen extra bonus:
 * it raises the item's own stat and is listed as the game stores it,
 * `bonus=<stat>,<increase>`. The required level stays: upgrading raises only
 * the level the stats are computed at.
 */
export const upgradeItemStat = (item: UpgradableItem, upgrade: ItemUpgrade) => {
  if (upgrade.level === 0 || !isUpgradable(item)) return item.stat;

  const toLevel = upgradedItemLevel(item.lvl, upgrade.level);
  const entries = scaleStats(item, toLevel);
  const level = `enhancement_upgrade_lvl=${upgrade.level}`;

  const bonus =
    upgrade.level === MAX_UPGRADE_LEVEL && upgrade.bonus
      ? upgrade.bonus
      : undefined;

  if (!bonus || !bonusPool(item)?.includes(bonus)) {
    return [...entries, level].join(";");
  }

  const upgraded = addUpgradeBonus(entries, bonus, item, toLevel);

  return [...upgraded.entries, level, `bonus=${bonus},${upgraded.added}`].join(
    ";",
  );
};

/**
 * The extra bonus a +5 item offers: three drawn without repeats from its
 * class's pool, each with a chance by its group's power, the player keeping
 * one. Its value is one bonus of that stat at the item's +5 virtual level.
 */
export const UPGRADE_BONUS_KEYS = [
  "da",
  "di",
  "ds",
  "dz",
  "sa",
  "crit",
  "acdmg",
  "resdmg",
  "endest",
  "manadest",
  "abdest",
  "ac",
  "resfire",
  "resfrost",
  "reslight",
  "act",
  "hp",
  "blok",
  "absorb",
  "absorbm",
  "evade",
  "energybon",
  "manabon",
  "critval",
  "critmval",
  "lowcrit",
  "heal",
  "slow",
  "lowevade",
] as const;

export type UpgradeBonusKey = (typeof UPGRADE_BONUS_KEYS)[number];

export const isUpgradeBonusKey = (value: string): value is UpgradeBonusKey =>
  UPGRADE_BONUS_KEYS.some((key) => key === value);

/**
 * An upgrade as a link writes it after an item id: `u` with its level, then
 * the +5 bonus's stat, such as `u5ds`. An item worn as dropped writes nothing.
 */
export const encodeItemUpgrade = (upgrade: ItemUpgrade | undefined) =>
  upgrade && upgrade.level > 0 ? `u${upgrade.level}${upgrade.bonus ?? ""}` : "";

/** Matches `encodeItemUpgrade`'s text, capturing its level and bonus. */
export const ITEM_UPGRADE_PATTERN = "(?:u(\\d)([a-z]*))?";

/**
 * The upgrade a link's captured level and bonus name. A level it cannot read
 * is none, and a bonus counts only on a +5.
 */
export const decodeItemUpgrade = (
  level: string | undefined,
  bonus: string | undefined,
): ItemUpgrade | undefined => {
  const value = Number(level);

  if (!isUpgradeLevel(value) || value === 0) return undefined;

  return value === 5 && bonus !== undefined && isUpgradeBonusKey(bonus)
    ? { level: value, bonus }
    : { level: value };
};

/** A bonus group's power, which weighs its chance to be drawn. */
export const UPGRADE_BONUS_GROUP_POWER = [10, 5, 1] as const;

const ATTRIBUTES = ["da", "di", "ds", "dz"] as const;

/** Each class set's pool, as its three groups. */
const BONUS_POOLS: ReadonlyArray<{
  types: ReadonlySet<string>;
  groups: readonly [
    ReadonlyArray<UpgradeBonusKey>,
    ReadonlyArray<UpgradeBonusKey>,
    ReadonlyArray<UpgradeBonusKey>,
  ];
}> = [
  {
    types: new Set([...WEAPON_TYPES, "QUIVER"]),
    groups: [
      ATTRIBUTES,
      ["sa", "crit"],
      ["acdmg", "resdmg", "endest", "manadest", "abdest"],
    ],
  },
  {
    types: new Set(["ARMOR", "HELMET", "GLOVES", "BOOTS", "SHIELD"]),
    groups: [
      ATTRIBUTES,
      ["ac", "resfire", "resfrost", "reslight", "act"],
      ["hp", "blok", "absorb", "absorbm", "evade"],
    ],
  },
  {
    types: new Set(["RING", "NECKLACE"]),
    groups: [
      ATTRIBUTES,
      ["energybon", "manabon", "critval", "critmval", "lowcrit"],
      ["heal", "slow", "lowevade"],
    ],
  },
];

// Absorption destruction, per weapon class, as a share of its power.
const ABSORB_DESTRUCTION_SHARE = new Map(
  Object.entries({
    ONE_AND_HALF_HAND_WEAPON: 0.33,
    TWO_HAND_WEAPON: 0.36,
    HELP_WEAPON: 0.24,
    ORB_WEAPON: 0.21,
  }),
);

/** What one bonus's value depends on. */
type BonusContext = {
  level: number;
  levelPower: number;
  rarityPower: number;
  classPower: number;
  type: string;
};

/**
 * Each stat's bonus formula from the game's bonus table, `base + amount *
 * perBonus`: the base comes once with the stat, whatever its bonus count.
 */
const BONUS_VALUES: Record<
  UpgradeBonusKey,
  { base: number; perBonus: (context: BonusContext) => number }
> = {
  da: { base: 8, perBonus: ({ level }) => 0.25 * level },
  ds: { base: 4, perBonus: ({ level }) => (5 * level) / 9 },
  dz: { base: 4, perBonus: ({ level }) => (5 * level) / 9 },
  di: { base: 4, perBonus: ({ level }) => (5 * level) / 9 },
  // Attack speed and slowing are kept in hundredths.
  sa: { base: 8, perBonus: ({ level }) => 0.25 * level },
  slow: { base: 8, perBonus: ({ level }) => (2 * level) / 7 },
  crit: { base: 0, perBonus: () => 1 },
  resdmg: { base: 0, perBonus: () => 1 },
  acdmg: {
    base: 1,
    perBonus: ({ levelPower, type }) =>
      ((WEAPON_TYPES.has(type) ? 1 : 0.75) * levelPower) / 50,
  },
  endest: { base: 0, perBonus: ({ level }) => 2 + 0.02 * level },
  manadest: { base: 0, perBonus: ({ level }) => 5 + 0.04 * level },
  abdest: {
    base: 0,
    perBonus: ({ levelPower, rarityPower, type }) =>
      (ABSORB_DESTRUCTION_SHARE.get(type) ?? 0.3) * (rarityPower + levelPower),
  },
  ac: {
    base: 0,
    perBonus: ({ levelPower, classPower }) => 0.15 * levelPower * classPower,
  },
  resfire: { base: 0, perBonus: () => 3 },
  resfrost: { base: 0, perBonus: () => 3 },
  reslight: { base: 0, perBonus: () => 3 },
  act: { base: 0, perBonus: () => 5 },
  hp: {
    base: 0,
    perBonus: ({ level, levelPower, classPower }) =>
      3.08 * Math.round(8 + level + 0.2 * levelPower * classPower),
  },
  blok: { base: 0, perBonus: ({ level }) => (3 * level) / 20 },
  absorb: {
    base: 0,
    perBonus: ({ levelPower, classPower }) => 0.6 * levelPower * classPower,
  },
  absorbm: {
    base: 0,
    perBonus: ({ levelPower, classPower }) => 0.6 * levelPower * classPower,
  },
  evade: { base: 0, perBonus: ({ level }) => level / 10 },
  lowevade: { base: 0, perBonus: ({ level }) => level / 10 },
  energybon: { base: 0, perBonus: ({ level }) => 10 + level / 15 },
  manabon: { base: 5, perBonus: ({ level }) => level / 4 },
  critval: { base: 0, perBonus: () => 6 },
  critmval: { base: 0, perBonus: () => 6 },
  lowcrit: { base: 0, perBonus: () => 2 },
  heal: {
    base: 8,
    perBonus: ({ level, levelPower, classPower }) =>
      0.8 * level + 0.2 * levelPower * classPower,
  },
};

/**
 * Stats whose value the item's stat rules already count in bonuses of this
 * formula, so the +5 bonus is one more of them. Armor and absorption are
 * split into their native part and bonuses first; absorption destruction
 * comes from the item's quality, so its bonus adds on top.
 */
const AMOUNT_SCALED_BONUSES: ReadonlySet<UpgradeBonusKey> = new Set([
  "da",
  "ds",
  "dz",
  "di",
  "sa",
  "slow",
  "acdmg",
  "endest",
  "manadest",
  "hp",
  "blok",
  "evade",
  "lowevade",
  "energybon",
  "manabon",
  "heal",
]);

const bonusContext = (item: UpgradableItem, level: number): BonusContext => ({
  level,
  levelPower: levelPower(level),
  rarityPower: rarityPower(
    level,
    RARITY_FACTOR.get(item.rarity ?? "COMMON") ?? 0,
  ),
  classPower: CLASS_POWER.get(item.type ?? "") ?? 1,
  type: item.type ?? "",
});

/** The +5 bonuses the item's class draws from; none for other items. */
const bonusPool = (item: UpgradableItem) =>
  BONUS_POOLS.find(({ types }) => types.has(item.type ?? ""))?.groups.flat();

export type UpgradeBonusOption = {
  key: UpgradeBonusKey;
  /** Its group, 0 for the most likely. */
  group: number;
  /** How much it raises the item's stat at +5. */
  value: number;
  /** The chance it is one of the three bonuses offered at +5. */
  offerChance: number;
};

/**
 * The chance each bonus is among `draws` drawn without repeats, each draw
 * weighted by power among the bonuses left.
 */
const offerChances = (powers: ReadonlyArray<number>, draws: number) => {
  const chances = powers.map(() => 0);

  const draw = (taken: ReadonlySet<number>, chance: number, left: number) => {
    if (left === 0 || chance === 0) return;

    const remaining = powers.reduce(
      (sum, power, index) => (taken.has(index) ? sum : sum + power),
      0,
    );

    powers.forEach((power, index) => {
      if (taken.has(index) || remaining === 0) return;

      const drawn = (chance * power) / remaining;

      chances[index] = (chances[index] ?? 0) + drawn;
      draw(new Set([...taken, index]), drawn, left - 1);
    });
  };

  draw(new Set(), 1, draws);

  return chances;
};

const OFFERED_BONUSES = 3;

/** The extra bonuses the item's class can draw at +5; none when it cannot. */
export const upgradeBonusOptions = (
  item: UpgradableItem,
): UpgradeBonusOption[] => {
  const pool = BONUS_POOLS.find(({ types }) => types.has(item.type ?? ""));

  if (!pool || !isUpgradable(item)) return [];

  const level = upgradedItemLevel(item.lvl, MAX_UPGRADE_LEVEL);
  const entries = scaleStats(item, level);

  const bonuses = pool.groups.flatMap((keys, group) =>
    keys.map((key) => ({ key, group })),
  );

  const chances = offerChances(
    bonuses.map(({ group }) => UPGRADE_BONUS_GROUP_POWER[group] ?? 0),
    OFFERED_BONUSES,
  );

  return bonuses.map(({ key, group }, index) => ({
    key,
    group,
    value: addUpgradeBonus(entries, key, item, level).added,
    offerChance: chances[index] ?? 0,
  }));
};
