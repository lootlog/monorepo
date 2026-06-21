import type {
  BattleStatCategoryDefinition,
  BattleStatDefinition,
} from "@/types/stats-customization.types";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";

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
      createStatDefinition("turns", { color: BATTLE_TEXT_COLORS.turn.total }),
      createStatDefinition("steps", { color: BATTLE_TEXT_COLORS.turn.steps }),
      createStatDefinition("turnsLost", {
        color: BATTLE_TEXT_COLORS.turn.lost,
      }),
      createStatDefinition("normalAttacks", {
        color: BATTLE_TEXT_COLORS.turn.normalAttack,
      }),
      createStatDefinition("spellsUsed", {
        color: BATTLE_TEXT_COLORS.turn.spell,
      }),
    ],
  },
  {
    id: "damageDealt",
    labelKey: "battleUi.oneVsOne.categories.damageDealt",
    stats: [
      createStatDefinition("damageDealt", {
        color: BATTLE_TEXT_COLORS.neutral,
      }),
      createStatDefinition("distanceDamage", {
        color: BATTLE_TEXT_COLORS.damage.distance,
      }),
      createStatDefinition("meleeDamage", {
        color: BATTLE_TEXT_COLORS.damage.melee,
      }),
      createStatDefinition("auxiliaryDamage", {
        color: BATTLE_TEXT_COLORS.damage.auxiliary,
      }),
      createStatDefinition("fireDamage", {
        color: BATTLE_TEXT_COLORS.damage.fire,
      }),
      createStatDefinition("frostDamage", {
        color: BATTLE_TEXT_COLORS.damage.frost,
      }),
      createStatDefinition("lightningDamage", {
        color: BATTLE_TEXT_COLORS.damage.lightning,
      }),
      createStatDefinition("thirdAttDamage", {
        color: BATTLE_TEXT_COLORS.damage.thirdAttack,
      }),
      createStatDefinition("rageDamageDealt", {
        color: BATTLE_TEXT_COLORS.damage.rage,
      }),
      createStatDefinition("trueDamageDealt", {
        color: BATTLE_TEXT_COLORS.damage.trueDamage,
      }),
      createStatDefinition("stigmaDamageDealt", {
        color: BATTLE_TEXT_COLORS.damage.stigma,
      }),
      createStatDefinition("reflectedDamage", {
        color: BATTLE_TEXT_COLORS.damage.reflected,
      }),
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
      createStatDefinition("damageTaken", {
        color: BATTLE_TEXT_COLORS.neutral,
      }),
      createStatDefinition("distanceDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.distance,
      }),
      createStatDefinition("meleeDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.melee,
      }),
      createStatDefinition("auxiliaryDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.auxiliary,
      }),
      createStatDefinition("fireDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.fire,
      }),
      createStatDefinition("frostDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.frost,
      }),
      createStatDefinition("lightningDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.lightning,
      }),
      createStatDefinition("thirdAttDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.thirdAttack,
      }),
      createStatDefinition("flatDamageTaken"),
      createStatDefinition("trueDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.trueDamage,
      }),
      createStatDefinition("stigmaDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.stigma,
      }),
      createStatDefinition("woundDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.wound,
      }),
      createStatDefinition("poisonDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.poison,
      }),
      createStatDefinition("injureDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.injure,
      }),
      createStatDefinition("critWoundDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.criticalWound,
      }),
      createStatDefinition("firePassiveDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.firePassive,
      }),
      createStatDefinition("lightningPassiveDamageTaken", {
        color: BATTLE_TEXT_COLORS.damage.lightningPassive,
      }),
      createStatDefinition("legbonAnguishDamageTaken", {
        color: BATTLE_TEXT_COLORS.legendary.anguish,
      }),
      createStatDefinition("reflectedDamageTaken"),
    ],
  },
  {
    id: "turns",
    labelKey: "battleUi.oneVsOne.categories.turns",
    stats: [
      createStatDefinition("criticalHits"),
      createStatDefinition("armorPierces", {
        color: BATTLE_TEXT_COLORS.defense.destroy,
      }),
      createStatDefinition("injures"),
      createStatDefinition("fastArrows", {
        color: BATTLE_TEXT_COLORS.defense.destroy,
      }),
    ],
  },
  {
    id: "legendaryBonuses",
    labelKey: "battleUi.oneVsOne.categories.legendaryBonuses",
    stats: [
      createStatDefinition("legbons"),
      createStatDefinition("legbonCurse", {
        color: BATTLE_TEXT_COLORS.legendary.curse,
      }),
      createStatDefinition("legbonCleanse", {
        color: BATTLE_TEXT_COLORS.legendary.cleanse,
      }),
      createStatDefinition("legbonLastheal", {
        color: BATTLE_TEXT_COLORS.legendary.lastHeal,
      }),
      createStatDefinition("legbonLasthealValue", {
        color: BATTLE_TEXT_COLORS.muted,
      }),
      createStatDefinition("legbonGlare", {
        color: BATTLE_TEXT_COLORS.legendary.glare,
      }),
      createStatDefinition("legbonHolytouch", {
        color: BATTLE_TEXT_COLORS.legendary.holyTouch,
      }),
      createStatDefinition("legbonHolytouchValue", {
        color: BATTLE_TEXT_COLORS.legendary.holyTouch,
      }),
      createStatDefinition("legbonCritredValue", {
        color: BATTLE_TEXT_COLORS.legendary.critShield,
      }),
      createStatDefinition("legbonFacadeValue", {
        color: BATTLE_TEXT_COLORS.legendary.facade,
      }),
      createStatDefinition("legbonVerycrit", {
        color: BATTLE_TEXT_COLORS.legendary.veryCrit,
      }),
      createStatDefinition("legbonAnguish", {
        color: BATTLE_TEXT_COLORS.legendary.anguish,
      }),
      createStatDefinition("legbonPunctureValue", {
        color: BATTLE_TEXT_COLORS.legendary.puncture,
      }),
    ],
  },
  {
    id: "defenseDestroy",
    labelKey: "battleUi.oneVsOne.categories.defenseDestroy",
    stats: [
      createStatDefinition("reducedArmor", {
        color: BATTLE_TEXT_COLORS.defense.destroy,
      }),
      createStatDefinition("magicResistanceDestroyed", {
        color: BATTLE_TEXT_COLORS.defense.destroy,
      }),
      createStatDefinition("reducedPoisonResistance", {
        color: BATTLE_TEXT_COLORS.defense.destroy,
      }),
    ],
  },
  {
    id: "defense",
    labelKey: "battleUi.oneVsOne.categories.defense",
    stats: [
      createStatDefinition("evasions"),
      createStatDefinition("counters", {
        color: BATTLE_TEXT_COLORS.defense.counter,
      }),
      createStatDefinition("blocks", {
        color: BATTLE_TEXT_COLORS.defense.block,
      }),
      createStatDefinition("blockedDamage", {
        color: BATTLE_TEXT_COLORS.defense.blockedDamage,
      }),
    ],
  },
  {
    id: "healing",
    labelKey: "battleUi.oneVsOne.categories.healing",
    stats: [
      createStatDefinition("passiveHealing", {
        color: BATTLE_TEXT_COLORS.healing.passive,
      }),
      createStatDefinition("activeHealing", {
        color: BATTLE_TEXT_COLORS.healing.active,
      }),
    ],
  },
  {
    id: "resources",
    labelKey: "battleUi.oneVsOne.categories.resources",
    stats: [
      createStatDefinition("destroyedEnergy", {
        color: BATTLE_TEXT_COLORS.resources.energy,
      }),
      createStatDefinition("destroyedMana", {
        color: BATTLE_TEXT_COLORS.resources.mana,
      }),
      createStatDefinition("regeneratedEnergy", {
        color: BATTLE_TEXT_COLORS.resources.energy,
      }),
    ],
  },
];
