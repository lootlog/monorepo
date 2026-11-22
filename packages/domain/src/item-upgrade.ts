import { maxBy, minBy, range } from "es-toolkit";
import { itemAttackSpeed } from "./attack-speed.js";
import {
  hasItemStat,
  itemStatValue,
  parseItemStatEntries,
} from "./item-stat.js";
import {
  hasSocket,
  isSocketBonus,
  type SocketBonus,
  socketItemStat,
} from "./item-socket.js";

export const UPGRADE_LEVELS = [0, 1, 2, 3, 4, 5] as const;

export type UpgradeLevel = (typeof UPGRADE_LEVELS)[number];

export const isUpgradeLevel = (value: number): value is UpgradeLevel =>
  UPGRADE_LEVELS.some((level) => level === value);

const MIN_UPGRADE_ITEM_LEVEL = 20;

export const upgradedItemLevel = (level: number, upgrade: UpgradeLevel) =>
  level + Math.round(level * 0.03) * upgrade;

export type ItemUpgrade = {
  level: UpgradeLevel;
  bonus?: UpgradeBonusKey;
  symbol?: SocketBonus;
};

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

const HP_BASE = 3.08 * 8;

const hpPerBonus = (level: number, classPower: number) =>
  3.08 * (level + 0.2 * levelPower(level) * classPower);

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

type Scale = {
  base: number;
  growth: (level: number) => number;
  amounts?: ReadonlyArray<number>;
  decimals?: number;
};

const WEAPON_FACTORS = [
  0.3378, 0.2646, 0.0876, 0.0797, 0.2869, 0.1594, 0.1435, 0.5578, 0.4606, 0.153,
  0.4876, 0.239, 0.2152, 0.2391, 0.3984, 0.3267, 0.1084, 0.4016, 0.2072, 0.1865,
  0.4303, 0.2901, 0.1036, 0.1116, 0.2231, 0.2263, 0.204, 0.2258, 0.2406, 0.1897,
  0.0367, 0.0335, 0.3188, 0.2709, 0.3652, 0.1514, 0.1355, 0.1528, 0.0303,
  0.0271, 0.0478, 0.043,
];

const DAMAGE_SPREADS = [0.8, 0.9, 1, 1.1, 1.2];

const ABSORB_DESTRUCTION_SHARES = [0.33, 0.36, 0.24, 0.21, 0.12, 0.3];

const POWER_AMOUNTS = [
  ...WEAPON_FACTORS.flatMap((factor) =>
    DAMAGE_SPREADS.map((spread) => 8 * factor * spread),
  ),
  ...ABSORB_DESTRUCTION_SHARES,
];

const statRules = (rarity: string | null, type: string | null) => {
  const factor = RARITY_FACTOR.get(rarity ?? "COMMON") ?? 0;
  const classPower = CLASS_POWER.get(type ?? "") ?? 1;

  const power: Scale = {
    base: 0,
    growth: (level) => rarityPower(level, factor) + levelPower(level),
    amounts: POWER_AMOUNTS,
  };

  const linear = (base: number, perLevel: number): Scale => ({
    base,
    growth: (level) => perLevel * level,
  });

  const isWeapon = WEAPON_TYPES.has(type ?? "");

  return new Map<string, ReadonlyArray<Scale | null>>(
    Object.entries({
      dmg: [power],
      pdmg: [power],
      fire: [power],
      light: [power],
      frost: [linear(0, 1), power],
      poison: [linear(0, 1), power],
      wound: [null, power],
      ac: [power],
      absorb: [power],
      absorbm: [power],
      abdest: [power],
      acdmg: [
        type === "QUIVER"
          ? { base: 0, growth: (level) => 0.04 * levelPower(level) }
          : {
              base: 1,
              growth: (level) =>
                ((isWeapon ? 1 : 0.75) * levelPower(level)) / 50,
            },
      ],
      da: [linear(8, 0.25)],
      ds: [linear(4, 5 / 9)],
      dz: [linear(4, 5 / 9)],
      di: [linear(4, 5 / 9)],
      sa: [linear(8, 0.25)],
      slow: [linear(8, 2 / 7)],
      hp: [
        {
          base: HP_BASE,
          growth: (level) => hpPerBonus(level, classPower),
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
      hpbon: [{ ...linear(0, 1 / 100), decimals: 1 }],
      manabon: [linear(5, 1 / 4)],
      energybon: [{ base: 0, growth: (level) => 10 + level / 15 }],
      enfatig: [null, { base: 0, growth: (level) => 2 + 0.04 * level }],
      manafatig: [null, { base: 0, growth: (level) => 6 + 0.08 * level }],
      endest: [{ base: 0, growth: (level) => 2 + 0.02 * level }],
      manadest: [{ base: 0, growth: (level) => 5 + 0.04 * level }],
    }),
  );
};

export const itemStatUpgradeLevel = (stat: string) =>
  Number(itemStatValue(stat, "enhancement_upgrade_lvl") ?? 0);

const decimalsOf = (value: string) => value.split(".")[1]?.length ?? 0;

const roundTo = (value: number, decimals: number) =>
  Number(value.toFixed(decimals));

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

  const decimals = scale.decimals ?? decimalsOf(value);
  const amount = (shown - scale.base) / from;

  const exact =
    minBy(
      [Math.round(amount * 2) / 2, ...(scale.amounts ?? [])].filter(
        (candidate) =>
          roundTo(scale.base + candidate * from, decimals) === shown,
      ),
      (candidate) => Math.abs(candidate - amount),
    ) ?? amount;

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

const EQUIPMENT_TYPES = new Set([
  ...WEAPON_TYPES,
  "QUIVER",
  "ARMOR",
  "HELMET",
  "GLOVES",
  "BOOTS",
  "SHIELD",
  "RING",
  "NECKLACE",
]);

export const isUpgradable = (item: UpgradableItem) =>
  EQUIPMENT_TYPES.has(item.type ?? "") &&
  item.lvl >= MIN_UPGRADE_ITEM_LEVEL &&
  !hasItemStat(item.stat, "cursed") &&
  !hasItemStat(item.stat, "expire_duration");

const ARMOR_PIECES = new Set(["ARMOR", "HELMET", "GLOVES", "BOOTS", "SHIELD"]);

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

const DEFENSE_STATS = new Map(
  Object.entries({
    ac: { scale: 8, factors: ARMOR_FACTOR, perBonus: 0.15 },
    absorb: { scale: 8, factors: ABSORB_FACTOR, perBonus: 0.6 },
    absorbm: { scale: 4, factors: ABSORB_FACTOR, perBonus: 0.6 },
  }),
);

const MAX_QUALITY_BONUS = 3;

const MAX_DEFENSE_BONUSES = 6;

const defenseScale = (item: UpgradableItem, key: string, shown: number) => {
  const defense = DEFENSE_STATS.get(key);

  if (!defense) return undefined;

  const professions = [...(itemStatValue(item.stat, "reqp") ?? "bhmptw")]
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

const LEGENDARY_BONUS_STATS = new Set([
  "legbon",
  "socket_injection_legbon",
  "socket_fleeting_legbon",
]);

const scaleStats = (item: UpgradableItem, toLevel: number) => {
  const rules = statRules(item.rarity, item.type);

  return parseItemStatEntries(item.stat)
    .filter(({ key }) => key !== "enhancement_upgrade_lvl" && key !== "bonus")
    .map(({ key, value }) => {
      if (value === true) return key;

      const entry = `${key}=${value}`;
      const values = value.split(",");

      if (LEGENDARY_BONUS_STATS.has(key) && values.length === 2) {
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

export const itemAtLevel = <Item extends UpgradableItem>(
  item: Item,
  level: number,
): Item =>
  level === item.lvl
    ? item
    : {
        ...item,
        lvl: level,
        stat: scaleStats(item, level)
          .map((entry) => (entry.startsWith("lvl=") ? `lvl=${level}` : entry))
          .join(";"),
      };

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

  const baseValue = itemStatValue(item.stat, key);

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

const upgradeLevelStat = (item: UpgradableItem, upgrade: ItemUpgrade) => {
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

export const upgradeItemStat = (item: UpgradableItem, upgrade: ItemUpgrade) => {
  const upgraded = upgradeLevelStat(item, upgrade);
  const { symbol } = upgrade;

  return symbol && hasSocket(item)
    ? socketItemStat(
        upgraded,
        symbol,
        upgradedItemLevel(item.lvl, isUpgradable(item) ? upgrade.level : 0),
      )
    : upgraded;
};

export const isCrafted = (upgrade: ItemUpgrade) =>
  upgrade.level > 0 || upgrade.symbol !== undefined;

export const isSameUpgrade = (a: ItemUpgrade, b: ItemUpgrade) =>
  a.level === b.level && a.bonus === b.bonus && a.symbol === b.symbol;

const UPGRADE_BONUS_KEYS = [
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

export const encodeItemUpgrade = (upgrade: ItemUpgrade | undefined) =>
  [
    upgrade && upgrade.level > 0
      ? `u${upgrade.level}${upgrade.bonus ?? ""}`
      : "",
    upgrade?.symbol ? `-${upgrade.symbol}` : "",
  ].join("");

export const ITEM_UPGRADE_PATTERN = "(?:u(\\d)([a-z]*))?(?:-([a-z]+))?";

export const decodeItemUpgrade = (
  level: string | undefined,
  bonus: string | undefined,
  symbol?: string,
): ItemUpgrade | undefined => {
  const value = Number(level);
  const upgradeLevel = isUpgradeLevel(value) ? value : 0;

  const socket =
    symbol !== undefined && isSocketBonus(symbol) ? { symbol } : {};

  const upgrade: ItemUpgrade =
    upgradeLevel === 5 && bonus !== undefined && isUpgradeBonusKey(bonus)
      ? { level: upgradeLevel, bonus, ...socket }
      : { level: upgradeLevel, ...socket };

  return isCrafted(upgrade) ? upgrade : undefined;
};

export const UPGRADE_BONUS_GROUP_POWER = [10, 5, 1] as const;

const ATTRIBUTES = ["da", "di", "ds", "dz"] as const;

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

const ABSORB_DESTRUCTION_SHARE = new Map(
  Object.entries({
    ONE_AND_HALF_HAND_WEAPON: 0.33,
    TWO_HAND_WEAPON: 0.36,
    HELP_WEAPON: 0.24,
    ORB_WEAPON: 0.21,
  }),
);

type BonusContext = {
  level: number;
  levelPower: number;
  rarityPower: number;
  classPower: number;
  type: string;
};

const BONUS_VALUES: Record<
  UpgradeBonusKey,
  { base: number; perBonus: (context: BonusContext) => number }
> = {
  da: { base: 8, perBonus: ({ level }) => 0.25 * level },
  ds: { base: 4, perBonus: ({ level }) => (5 * level) / 9 },
  dz: { base: 4, perBonus: ({ level }) => (5 * level) / 9 },
  di: { base: 4, perBonus: ({ level }) => (5 * level) / 9 },
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
    base: HP_BASE,
    perBonus: ({ level, classPower }) => hpPerBonus(level, classPower),
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

const bonusPool = (item: UpgradableItem) =>
  BONUS_POOLS.find(({ types }) => types.has(item.type ?? ""))?.groups.flat();

export type UpgradeBonusOption = {
  key: UpgradeBonusKey;
  group: number;
  value: number;
  offerChance: number;
};

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

const ATTACK_SPEED_BONUSES: ReadonlyArray<UpgradeBonusKey> = ["sa", "dz", "da"];

export const itemStatAttackSpeed = (stat: string) =>
  itemAttackSpeed(
    Object.fromEntries(
      ATTACK_SPEED_BONUSES.map((key) => [
        key,
        Number(itemStatValue(stat, key) ?? 0),
      ]),
    ),
  );

export const attackSpeedUpgrade = (item: UpgradableItem): ItemUpgrade => {
  if (!isUpgradable(item)) return NO_UPGRADE;

  const pool = bonusPool(item) ?? [];

  const upgrades: ItemUpgrade[] = [
    { level: MAX_UPGRADE_LEVEL },
    ...ATTACK_SPEED_BONUSES.flatMap((bonus): ItemUpgrade[] =>
      pool.includes(bonus) ? [{ level: MAX_UPGRADE_LEVEL, bonus }] : [],
    ),
  ];

  return (
    maxBy(upgrades, (upgrade) =>
      itemStatAttackSpeed(upgradeItemStat(item, upgrade)),
    ) ?? NO_UPGRADE
  );
};

export const upgradedAttackSpeed = (item: UpgradableItem) =>
  itemStatAttackSpeed(upgradeItemStat(item, attackSpeedUpgrade(item)));

const UPGRADE_COST_FACTORS = new Map(
  Object.entries({
    COMMON: { points: 1, gold: 1 },
    UNIQUE: { points: 10, gold: 10 },
    HEROIC: { points: 100, gold: 30 },
    UPGRADED: { points: undefined, gold: 40 },
    LEGENDARY: { points: 1000, gold: 60 },
  }),
);

const UPGRADE_LEVEL_COST_FACTORS = [0, 1, 2.1, 3.4, 5, 7] as const;

const DEFAULT_ARTISAN_BONUS = 100;

const ESSENCE_COST_MULTIPLIER = 3;

export type ItemUpgradeCost = {
  points: number;
  essence: number;
  gold: number;
};

const NO_UPGRADE_COST: ItemUpgradeCost = {
  points: 0,
  essence: 0,
  gold: 0,
};

export const itemUpgradeCost = (
  item: UpgradableItem,
  level: UpgradeLevel,
): ItemUpgradeCost => {
  const factors = UPGRADE_COST_FACTORS.get(item.rarity ?? "COMMON");

  if (level === 0 || !factors || !isUpgradable(item)) return NO_UPGRADE_COST;

  const levelFactor = UPGRADE_LEVEL_COST_FACTORS[level];

  const points =
    factors.points === undefined
      ? levelFactor * (150 * item.lvl + 27_000)
      : factors.points * levelFactor * (180 + item.lvl);

  if (level !== MAX_UPGRADE_LEVEL) {
    return { ...NO_UPGRADE_COST, points: Math.round(points) };
  }

  const artisanBonus = Number(
    itemStatValue(item.stat, "artisanbon") ?? DEFAULT_ARTISAN_BONUS,
  );

  const breakdown = ((item.lvl / 10 + 10) * artisanBonus) / 100;

  return {
    points: Math.round(points),
    essence: Math.round(ESSENCE_COST_MULTIPLIER * breakdown),
    gold: Math.round((10 * item.lvl + 1300) * item.lvl * factors.gold),
  };
};
