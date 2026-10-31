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

  return String(roundTo(scale.base + exact * scale.growth(toLevel), decimals));
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

/**
 * The item's stats once upgraded, in the game's stat format, with the upgrade
 * level among them as the game lists it and, at +5, the chosen extra bonus as
 * the game stores it: `bonus=<stat>,<value>`. The required level stays:
 * upgrading raises only the level the stats are computed at.
 */
export const upgradeItemStat = (item: UpgradableItem, upgrade: ItemUpgrade) => {
  if (upgrade.level === 0 || !isUpgradable(item)) return item.stat;

  const toLevel = upgradedItemLevel(item.lvl, upgrade.level);
  const rules = statRules(item.rarity, item.type);

  const entries = item.stat
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

      const scales = rules.get(key);

      if (!scales) return entry;

      const scaled = values.map((value, index) => {
        const scale = scales[Math.min(index, scales.length - 1)];

        return scale ? scaleValue(value, scale, item.lvl, toLevel) : value;
      });

      return `${key}=${scaled.join(",")}`;
    });

  const bonus =
    upgrade.level === MAX_UPGRADE_LEVEL && upgrade.bonus
      ? upgradeBonusOptions(item).find(({ key }) => key === upgrade.bonus)
      : undefined;

  return [
    ...entries,
    `enhancement_upgrade_lvl=${upgrade.level}`,
    ...(bonus ? [`bonus=${bonus.key},${bonus.value}`] : []),
  ].join(";");
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

/** One bonus of each stat, as the game's bonus table gives it. */
const BONUS_VALUES: Record<UpgradeBonusKey, (context: BonusContext) => number> =
  {
    da: ({ level }) => 0.25 * level + 8,
    ds: ({ level }) => (5 * level) / 9 + 4,
    dz: ({ level }) => (5 * level) / 9 + 4,
    di: ({ level }) => (5 * level) / 9 + 4,
    // Attack speed and slowing are kept in hundredths.
    sa: ({ level }) => 8 + 0.25 * level,
    slow: ({ level }) => 8 + (2 * level) / 7,
    crit: () => 1,
    resdmg: () => 1,
    acdmg: ({ levelPower, type }) =>
      1 + ((WEAPON_TYPES.has(type) ? 1 : 0.75) * levelPower) / 50,
    endest: ({ level }) => 2 + 0.02 * level,
    manadest: ({ level }) => 5 + 0.04 * level,
    abdest: ({ levelPower, rarityPower, type }) =>
      (ABSORB_DESTRUCTION_SHARE.get(type) ?? 0.3) * (rarityPower + levelPower),
    ac: ({ levelPower, classPower }) => 0.15 * levelPower * classPower,
    resfire: () => 3,
    resfrost: () => 3,
    reslight: () => 3,
    act: () => 5,
    hp: ({ level, levelPower, classPower }) =>
      3.08 * Math.round(8 + level + 0.2 * levelPower * classPower),
    blok: ({ level }) => (3 * level) / 20,
    absorb: ({ levelPower, classPower }) => 0.6 * levelPower * classPower,
    absorbm: ({ levelPower, classPower }) => 0.6 * levelPower * classPower,
    evade: ({ level }) => level / 10,
    lowevade: ({ level }) => level / 10,
    energybon: ({ level }) => 10 + level / 15,
    manabon: ({ level }) => 5 + level / 4,
    critval: () => 6,
    critmval: () => 6,
    lowcrit: () => 2,
    heal: ({ level, levelPower, classPower }) =>
      8 + 0.8 * level + 0.2 * levelPower * classPower,
  };

export type UpgradeBonusOption = {
  key: UpgradeBonusKey;
  /** Its group, 0 for the most likely. */
  group: number;
  /** The stat value it adds at +5. */
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

  const context: BonusContext = {
    level,
    levelPower: levelPower(level),
    rarityPower: rarityPower(
      level,
      RARITY_FACTOR.get(item.rarity ?? "COMMON") ?? 0,
    ),
    classPower: CLASS_POWER.get(item.type ?? "") ?? 1,
    type: item.type ?? "",
  };

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
    value: Math.round(BONUS_VALUES[key](context)),
    offerChance: chances[index] ?? 0,
  }));
};
