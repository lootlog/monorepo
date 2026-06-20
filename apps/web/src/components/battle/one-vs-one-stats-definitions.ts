import type {
  BattleStatCategoryDefinition,
  BattleStatDefinition,
} from "@/types/stats-customization.types";

const createStatDefinition = (
  key: BattleStatDefinition["key"],
  options: Omit<BattleStatDefinition, "key" | "labelKey"> = {},
): BattleStatDefinition => ({
  key,
  labelKey: `battleUi.oneVsOne.stats.${String(key)}`,
  ...options,
});

export const STAT_CATEGORIES: BattleStatCategoryDefinition[] = [
  {
    id: "turnStats",
    labelKey: "battleUi.oneVsOne.categories.turnStats",
    stats: [
      createStatDefinition("turns", { color: "text-blue-400" }),
      createStatDefinition("steps", { color: "text-green-400" }),
      createStatDefinition("turnsLost", { color: "text-red-400" }),
      createStatDefinition("normalAttacks", { color: "text-orange-400" }),
      createStatDefinition("spellsUsed", { color: "text-purple-400" }),
    ],
  },
  {
    id: "damageDealt",
    labelKey: "battleUi.oneVsOne.categories.damageDealt",
    stats: [
      createStatDefinition("damageDealt", { color: "text-white" }),
      createStatDefinition("distanceDamage", { color: "text-green-400" }),
      createStatDefinition("meleeDamage", { color: "text-blue-300" }),
      createStatDefinition("auxiliaryDamage", { color: "text-orange-300" }),
      createStatDefinition("fireDamage", { color: "text-red-400" }),
      createStatDefinition("frostDamage", { color: "text-cyan-400" }),
      createStatDefinition("lightningDamage", { color: "text-yellow-400" }),
      createStatDefinition("thirdAttDamage", { color: "text-orange-400" }),
      createStatDefinition("rageDamageDealt", { color: "text-red-300" }),
      createStatDefinition("trueDamageDealt", { color: "text-white" }),
      createStatDefinition("stigmaDamageDealt", { color: "text-purple-400" }),
      createStatDefinition("reflectedDamage", { color: "text-purple-400" }),
      createStatDefinition("damageDealtAfterDefensive"),
      createStatDefinition("damageDealtAfterDefensivePercentage", {
        format: (value) => `${value}%`,
      }),
    ],
  },
  {
    id: "damageTaken",
    labelKey: "battleUi.oneVsOne.categories.damageTaken",
    stats: [
      createStatDefinition("damageTaken", { color: "text-white" }),
      createStatDefinition("distanceDamageTaken", { color: "text-green-400" }),
      createStatDefinition("meleeDamageTaken", { color: "text-blue-300" }),
      createStatDefinition("auxiliaryDamageTaken", {
        color: "text-orange-300",
      }),
      createStatDefinition("fireDamageTaken", { color: "text-red-400" }),
      createStatDefinition("frostDamageTaken", { color: "text-cyan-400" }),
      createStatDefinition("lightningDamageTaken", {
        color: "text-yellow-400",
      }),
      createStatDefinition("thirdAttDamageTaken", {
        color: "text-orange-400",
      }),
      createStatDefinition("flatDamageTaken"),
      createStatDefinition("trueDamageTaken", { color: "text-white" }),
      createStatDefinition("stigmaDamageTaken", { color: "text-purple-400" }),
      createStatDefinition("woundDamageTaken", { color: "text-orange-600" }),
      createStatDefinition("poisonDamageTaken", { color: "text-green-600" }),
      createStatDefinition("injureDamageTaken", { color: "text-red-300" }),
      createStatDefinition("critWoundDamageTaken", {
        color: "text-orange-400",
      }),
      createStatDefinition("firePassiveDamageTaken", {
        color: "text-red-500",
      }),
      createStatDefinition("lightningPassiveDamageTaken", {
        color: "text-yellow-500",
      }),
      createStatDefinition("legbonAnguishDamageTaken", {
        color: "text-red-600",
      }),
      createStatDefinition("reflectedDamageTaken"),
    ],
  },
  {
    id: "turns",
    labelKey: "battleUi.oneVsOne.categories.turns",
    stats: [
      createStatDefinition("criticalHits"),
      createStatDefinition("armorPierces", { color: "text-yellow-400" }),
      createStatDefinition("injures"),
      createStatDefinition("fastArrows", { color: "text-yellow-400" }),
    ],
  },
  {
    id: "legendaryBonuses",
    labelKey: "battleUi.oneVsOne.categories.legendaryBonuses",
    stats: [
      createStatDefinition("legbons"),
      createStatDefinition("legbonCurse", { color: "text-yellow-400" }),
      createStatDefinition("legbonCleanse", { color: "text-blue-400" }),
      createStatDefinition("legbonLastheal", { color: "text-green-400" }),
      createStatDefinition("legbonLasthealValue", { color: "text-gray-400" }),
      createStatDefinition("legbonGlare", { color: "text-yellow-400" }),
      createStatDefinition("legbonHolytouch", { color: "text-blue-300" }),
      createStatDefinition("legbonHolytouchValue", {
        color: "text-blue-300",
      }),
      createStatDefinition("legbonCritredValue", { color: "text-sky-400" }),
      createStatDefinition("legbonFacadeValue", { color: "text-sky-400" }),
      createStatDefinition("legbonVerycrit", { color: "text-red-600" }),
      createStatDefinition("legbonAnguish", { color: "text-red-600" }),
      createStatDefinition("legbonPunctureValue", { color: "text-red-300" }),
    ],
  },
  {
    id: "defenseDestroy",
    labelKey: "battleUi.oneVsOne.categories.defenseDestroy",
    stats: [
      createStatDefinition("reducedArmor", { color: "text-yellow-400" }),
      createStatDefinition("magicResistanceDestroyed", {
        color: "text-yellow-400",
      }),
      createStatDefinition("reducedPoisonResistance", {
        color: "text-yellow-400",
      }),
    ],
  },
  {
    id: "defense",
    labelKey: "battleUi.oneVsOne.categories.defense",
    stats: [
      createStatDefinition("evasions"),
      createStatDefinition("counters", { color: "text-blue-400" }),
      createStatDefinition("blocks", { color: "text-blue-400" }),
      createStatDefinition("blockedDamage", { color: "text-green-400" }),
    ],
  },
  {
    id: "healing",
    labelKey: "battleUi.oneVsOne.categories.healing",
    stats: [
      createStatDefinition("passiveHealing", { color: "text-green-400" }),
      createStatDefinition("activeHealing", { color: "text-green-400" }),
    ],
  },
  {
    id: "resources",
    labelKey: "battleUi.oneVsOne.categories.resources",
    stats: [
      createStatDefinition("destroyedEnergy", { color: "text-cyan-400" }),
      createStatDefinition("destroyedMana", { color: "text-blue-400" }),
      createStatDefinition("regeneratedEnergy", { color: "text-cyan-400" }),
    ],
  },
];
