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
 * The item's stats once upgraded to `upgrade`, in the game's stat format,
 * with the upgrade level among them as the game lists it. The required level
 * stays: upgrading raises only the level the stats are computed at.
 */
export const upgradeItemStat = (
  item: UpgradableItem,
  upgrade: UpgradeLevel,
) => {
  if (upgrade === 0 || !isUpgradable(item)) return item.stat;

  const toLevel = upgradedItemLevel(item.lvl, upgrade);
  const rules = statRules(item.rarity, item.type);

  const entries = item.stat
    .split(";")
    .filter(Boolean)
    .filter((entry) => !entry.startsWith("enhancement_upgrade_lvl="))
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

  return [...entries, `enhancement_upgrade_lvl=${upgrade}`].join(";");
};
