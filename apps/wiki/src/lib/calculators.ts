import { groupBy } from "es-toolkit";
import { parseItemStatEntries } from "@lootlog/domain/item-stat";
import {
  isUpgradeLevel,
  itemStatUpgradeLevel,
  upgradedItemLevel,
  type UpgradeLevel,
} from "@lootlog/domain/item-upgrade";

export type FormulaSource = "official" | "community";

export const MECHANICS_DOCUMENTATION_URL =
  "https://pomoc.margonem.pl/index/view,372";

export const SERVICES_DOCUMENTATION_URL =
  "https://pomoc.margonem.pl/index/view,322";

const LEVEL_CAP = 300;

const MAX_DEFENCE_CHANCE = 50;

export const defenceChance = (points: number, enemyLevel: number) =>
  Math.min(MAX_DEFENCE_CHANCE, (points * 20) / Math.min(enemyLevel, LEVEL_CAP));

export const pointsForMaxDefence = (enemyLevel: number) =>
  Math.ceil((MAX_DEFENCE_CHANCE * Math.min(enemyLevel, LEVEL_CAP)) / 20);

export const evadeFromAgility = (agility: number) => Math.round(agility / 30);

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

const WEAKENING_LEVELS = 50;

const SCALED_WEAKENING_FROM_LEVEL = 120;

const weakeningStartLevel = (itemLevel: number) =>
  itemLevel < SCALED_WEAKENING_FROM_LEVEL ? 30 + itemLevel : 1.25 * itemLevel;

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

export const LEGENDARY_BONUS_PARAMETERS: Record<
  CalculableLegendaryBonus,
  "chance" | "reduction" | "ignore"
> = {
  verycrit: "chance",
  holytouch: "chance",
  curse: "chance",
  glare: "chance",
  cleanse: "chance",
  anguish: "chance",
  critred: "reduction",
  facade: "reduction",
  puncture: "ignore",
};

export const isCalculableLegendaryBonus = (
  name: string,
): name is CalculableLegendaryBonus =>
  CALCULABLE_LEGENDARY_BONUSES.some((bonus) => bonus === name);

const OPERATIONAL_LEVEL_CAP = 300;

const LEGENDARY_BONUS_STATS = new Set([
  "legbon",
  "socket_fleeting_legbon",
  "socket_injection_legbon",
]);

export type WornLegendaryBonus = {
  name: string;
  items: number;
  value: number | undefined;
  isWeakened: boolean;
};

const upgradeLevelOf = (stat: string): UpgradeLevel => {
  const level = itemStatUpgradeLevel(stat);

  return isUpgradeLevel(level) ? level : 0;
};

export const wornLegendaryBonusItems = (
  stats: ReadonlyArray<string>,
  characterLevel: number,
) => {
  const level = Math.min(characterLevel, OPERATIONAL_LEVEL_CAP);

  return stats.flatMap((stat) =>
    parseItemStatEntries(stat).flatMap(({ key, value }) => {
      if (!LEGENDARY_BONUS_STATS.has(key) || value === true) {
        return [];
      }

      const [name, itemLevel] = value.split(",");

      return name
        ? [
            {
              name,
              itemLevel: Number(itemLevel),
              upgrade: upgradeLevelOf(stat),
              strength: legendaryBonusStrength(level, Number(itemLevel)),
            },
          ]
        : [];
    }),
  );
};

export const wornLegendaryBonuses = (
  stats: ReadonlyArray<string>,
  characterLevel: number,
): WornLegendaryBonus[] => {
  const worn = wornLegendaryBonusItems(stats, characterLevel);

  return Object.entries(groupBy(worn, ({ name }) => name)).map(
    ([name, items]) => {
      const strengths = items.map(({ strength }) =>
        Number.isNaN(strength) ? 1 : strength,
      );

      return {
        name,
        items: items.length,
        value: isCalculableLegendaryBonus(name)
          ? legendaryBonusValue(LEGENDARY_BONUS_START_VALUES[name], strengths)
          : undefined,
        isWeakened: strengths.some((strength) => strength < 1),
      };
    },
  );
};

export const ANGUISH_TURNS = 5;

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

export const HOLY_TOUCH_TURNS = 3;

export const holyTouchHeal = (maxHealth: number) =>
  Math.round(0.06 * maxHealth);

export type TransferRoute = "standard" | "uniaToPrivate";

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

const UNBIND_RARITY_RULES: Record<
  UnbindRarity,
  { maxBase: number; multiplier: number }
> = {
  COMMON: { maxBase: Number.POSITIVE_INFINITY, multiplier: 1 },
  UNIQUE: { maxBase: 4950, multiplier: 1.2 },
  HEROIC: { maxBase: 2250, multiplier: 1.5 },
  LEGENDARY: { maxBase: 2250, multiplier: 3 },
};

export const unbindCost = (itemLevel: number, rarity: UnbindRarity) => {
  const { maxBase, multiplier } = UNBIND_RARITY_RULES[rarity];

  return Math.ceil(Math.min(750 + 7.5 * itemLevel, maxBase) * multiplier);
};

export const professionChangeCost = (level: number) =>
  Math.ceil(level / 2) * 75;

export const questExperience = ({
  experience,
  blessingPercent,
  clanPercent,
}: {
  experience: number;
  blessingPercent: number;
  clanPercent: number;
}) => {
  const exact =
    (experience * (100 + blessingPercent) * (100 + clanPercent)) / 10_000;

  return Math.floor(exact * (1 + 1e-12));
};
