import { upgradedItemLevel, type UpgradeLevel } from "@/lib/item-upgrade";

/**
 * Margonem's formulas behind the wiki's calculators. Unless a formula says
 * otherwise, it is the game's own, from the combat mechanics at
 * https://pomoc.margonem.pl/index/view,372; the rest are players' findings
 * the game documents nowhere.
 */

/** Where a calculator's formula comes from. */
export type FormulaSource = "official" | "community";

export const MECHANICS_DOCUMENTATION_URL =
  "https://pomoc.margonem.pl/index/view,372";

export const SERVICES_DOCUMENTATION_URL =
  "https://pomoc.margonem.pl/index/view,322";

// Level-dependent mechanics treat anything above 300 as 300.
const LEVEL_CAP = 300;

/** Evade and block chances stop at 50%, however many points stack above. */
export const MAX_DEFENCE_CHANCE = 50;

/**
 * The chance in percent that evade or block points turn an attack of an
 * enemy of `enemyLevel`: `points * 20 / min(enemyLevel, 300)`, at most 50%.
 * The attacker's level counts, not the defender's.
 */
export const defenceChance = (points: number, enemyLevel: number) =>
  Math.min(MAX_DEFENCE_CHANCE, (points * 20) / Math.min(enemyLevel, LEVEL_CAP));

/** The points that reach the 50% cap against an enemy of `enemyLevel`. */
export const pointsForMaxDefence = (enemyLevel: number) =>
  Math.ceil((MAX_DEFENCE_CHANCE * Math.min(enemyLevel, LEVEL_CAP)) / 20);

/**
 * The attack speed agility gives:
 * `min(2, 0.02 * agility) + max(0, 0.002 * (agility - 100))`.
 */
export const attackSpeedFromAgility = (agility: number) =>
  Math.min(2, 0.02 * agility) + Math.max(0, 0.002 * (agility - 100));

/** The evade points agility gives: `round(agility / 30)`. */
export const evadeFromAgility = (agility: number) => Math.round(agility / 30);

/**
 * What each legendary bonus starts at, in percent: a chance to trigger, or
 * the share of damage or defence it changes. Ostatni ratunek heals a random
 * amount instead and has no percent to add up.
 */
export const LEGENDARY_BONUS_START_VALUES = {
  verycrit: 17,
  holytouch: 7,
  curse: 9,
  glare: 9,
  critred: 25,
  facade: 13,
  cleanse: 12,
  anguish: 8,
  puncture: 12,
} as const;

export type CalculableLegendaryBonus =
  keyof typeof LEGENDARY_BONUS_START_VALUES;

export const CALCULABLE_LEGENDARY_BONUSES = Object.keys(
  LEGENDARY_BONUS_START_VALUES,
).filter((bonus): bonus is CalculableLegendaryBonus =>
  Object.hasOwn(LEGENDARY_BONUS_START_VALUES, bonus),
);

// A bonus fades to nothing over this many levels past its first weakening.
const WEAKENING_LEVELS = 50;

// Items from this level weaken from a multiple of their level, not an offset.
const SCALED_WEAKENING_FROM_LEVEL = 120;

/**
 * The level from which an item's legendary bonus weakens: `30 + lvl` below
 * level 120, `1.25 * lvl` from it.
 */
export const weakeningStartLevel = (itemLevel: number) =>
  itemLevel < SCALED_WEAKENING_FROM_LEVEL ? 30 + itemLevel : 1.25 * itemLevel;

/**
 * The share of its bonus an item keeps on a character of `characterLevel`:
 * whole until the bonus weakens, then falling linearly to nothing over 50
 * levels. Characters above 300 count by their operational level.
 */
export const legendaryBonusStrength = (
  characterLevel: number,
  itemLevel: number,
) =>
  Math.min(
    1,
    Math.max(
      0,
      1 - (characterLevel - weakeningStartLevel(itemLevel)) / WEAKENING_LEVELS,
    ),
  );

/**
 * A legendary bonus worn on several items. Each further item adds half of
 * what the one before it added, so a bonus starting at 13 reaches 20, 23,
 * 25, 26 and 26. The least weakened item counts first. The documentation
 * gives the halving and the weakening apart; weakening each item's share
 * before halving it is our reading of the two together.
 */
export const legendaryBonusValue = (
  startValue: number,
  strengths: ReadonlyArray<number>,
) =>
  [...strengths]
    .sort((a, b) => b - a)
    .reduce(
      (total, strength, index) =>
        total + Math.round(startValue * 0.5 ** index * strength),
      0,
    );

/** Krwawa udręka bleeds its target for this many turns. */
export const ANGUISH_TURNS = 5;

/**
 * Krwawa udręka's bleeding each turn:
 * `(0.0025 * lvl + 0.3) * (str + int + 0.8 * agi)`, where `lvl` is the item's
 * upgraded level, at most 300.
 */
export const anguishDamage = ({
  itemLevel,
  upgrade,
  strength,
  intellect,
  agility,
}: {
  itemLevel: number;
  upgrade: UpgradeLevel;
  strength: number;
  intellect: number;
  agility: number;
}) =>
  Math.round(
    (0.0025 * Math.min(upgradedItemLevel(itemLevel, upgrade), LEVEL_CAP) +
      0.3) *
      (strength + intellect + 0.8 * agility),
  );

/** Dotyk anioła heals on this many turns. */
export const HOLY_TOUCH_TURNS = 3;

/**
 * Dotyk anioła heals 6% of the character's health each turn, never above the
 * health the character started the fight with. The documentation does not
 * say how it rounds; we round to the nearest point.
 */
export const holyTouchHeal = (maxHealth: number) =>
  Math.round(0.06 * maxHealth);

/**
 * Where a character moves: most routes pay the full cost, and a move from
 * the Unia world to a private one 60% of it.
 */
export type TransferRoute = "standard" | "uniaToPrivate";

/**
 * Moving a character to another world costs 75 dragon scales a level, at
 * least 10 000, and 60% of that from Unia to a private world, where creating
 * the character there is paid apart; from
 * https://pomoc.margonem.pl/index/view,322.
 */
export const characterTransferCost = (level: number, route: TransferRoute) => {
  const cost = Math.max(10_000, level * 75);

  return route === "uniaToPrivate" ? Math.round(cost * 0.6) : cost;
};

export const UNBIND_RARITIES = [
  "COMMON",
  "UNIQUE",
  "HEROIC",
  "LEGENDARY",
] as const;

export type UnbindRarity = (typeof UNBIND_RARITIES)[number];

// Players' findings: the cost grows with the level up to a cap, then the
// rarity multiplies it.
const UNBIND_RARITY_RULES: Record<
  UnbindRarity,
  { maxBase: number; multiplier: number }
> = {
  COMMON: { maxBase: Number.POSITIVE_INFINITY, multiplier: 1 },
  UNIQUE: { maxBase: 4950, multiplier: 1.2 },
  HEROIC: { maxBase: 2250, multiplier: 1.5 },
  LEGENDARY: { maxBase: 2250, multiplier: 3 },
};

/**
 * The dragon scales unbinding an item costs, as players found it:
 * `ceil(min(750 + 7.5 * lvl, cap) * multiplier)`.
 */
export const unbindCost = (itemLevel: number, rarity: UnbindRarity) => {
  const { maxBase, multiplier } = UNBIND_RARITY_RULES[rarity];

  return Math.ceil(Math.min(750 + 7.5 * itemLevel, maxBase) * multiplier);
};

/**
 * The dragon scales a profession change costs, as players found it: 75 for
 * every two levels begun.
 */
export const professionChangeCost = (level: number) =>
  Math.ceil(level / 2) * 75;

/**
 * A quest's experience with a blessing and a clan bonus, as players found
 * it: the bonuses multiply rather than add, and the fraction is dropped.
 */
export const questExperience = ({
  experience,
  blessingPercent,
  clanPercent,
}: {
  experience: number;
  blessingPercent: number;
  clanPercent: number;
}) =>
  Math.floor(
    experience * (1 + blessingPercent / 100) * (1 + clanPercent / 100),
  );
