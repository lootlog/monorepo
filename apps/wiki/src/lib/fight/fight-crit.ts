import { LEVEL_CAP_FOR_CHANCES } from "./fight-defence";
import { chance } from "./fight-hit-effects";
import { buffTotal } from "./fight-skills";
import { isBelow, type FighterState } from "./fight-state";

const LEVEL_GAP_GRACE = 5;

const CRIT_PER_LEVEL = 3;

const CRIT_VALUE_PER_LEVEL = 10;

const MAX_CRIT_VALUE_GAIN = 300;

const MIN_CRIT = 1;

const VERY_CRIT_FACTOR = 1.75;

const levelGap = (attacker: FighterState, defender: FighterState) => {
  if (!attacker.levelAdvantage) return 0;

  const gap =
    Math.min(attacker.combatant.level, LEVEL_CAP_FOR_CHANCES) -
    Math.min(defender.combatant.level, LEVEL_CAP_FOR_CHANCES);

  return Math.sign(gap) * Math.max(Math.abs(gap) - LEVEL_GAP_GRACE, 0);
};

export const critValueShift = (
  attacker: FighterState,
  defender: FighterState,
) =>
  Math.min(
    MAX_CRIT_VALUE_GAIN,
    levelGap(attacker, defender) * CRIT_VALUE_PER_LEVEL,
  ) - defender.combatant.critValueReduction;

export const critChances = (
  attacker: FighterState,
  defender: FighterState,
  ownChance: number,
) => {
  const ownCritChance =
    ownChance +
    buffTotal(attacker, "active_crit", "active_crit-allies") +
    levelGap(attacker, defender) * CRIT_PER_LEVEL;

  const { lastCrit } = attacker.combatant.passives;
  const finishing = isBelow(defender, lastCrit) ? lastCrit.value : 0;

  return {
    veryCrit:
      (attacker.combatant.legendary.verycrit *
        Math.max(0, ownCritChance + finishing)) /
      100,
    crit:
      Math.max(
        MIN_CRIT,
        ownCritChance -
          buffTotal(attacker, "disturb_crit", "stinkbomb_crit") -
          defender.combatant.critReduction,
      ) + finishing,
  };
};

export const rollCrit = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
  ownChance: number,
) => {
  const chances = critChances(attacker, defender, ownChance);
  const veryCrit = chance(random, chances.veryCrit);
  const crit = veryCrit || random() < chances.crit / 100;

  return {
    crit,
    veryCrit,
    strength: veryCrit ? VERY_CRIT_FACTOR : crit ? 1 : 0,
  };
};
