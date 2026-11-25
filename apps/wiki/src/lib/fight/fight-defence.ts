import { chance } from "./fight-hit-effects";
import { buffTotal } from "./fight-skills";
import {
  clamp,
  isBelow,
  MAX_RESISTANCE,
  type FighterState,
  type Profession,
  type ResourceDrain,
} from "./fight-state";

export type Drained = { readonly amount: number; readonly reduced: number };

export const LEVEL_CAP_FOR_CHANCES = 300;

const MAX_EVADE_OR_BLOCK = 50;

const EVADE_OR_BLOCK_PER_POINT = 20;

const ARMOR_FLOOR = 0.5;

const ARMOR_FORMULA_VERTEX = 1.13 / 0.62;

const SHIELD_BEARERS: ReadonlySet<Profession> = new Set(["w", "p"]);

const UNAVOIDABLE: ReadonlySet<Profession> = new Set(["m"]);

export const NO_DRAIN: Drained = { amount: 0, reduced: 0 };

export const PHYSICAL_ABSORB_SHARE = 0.75;

export const puncture = (attacker: FighterState) =>
  attacker.combatant.legendary.puncture / 100;

export const armorReduced = (damage: number, armor: number) => {
  if (damage <= 0 || armor <= 0) return Math.max(0, damage);

  const effectiveArmor = Math.min(armor, ARMOR_FORMULA_VERTEX * damage);

  return Math.max(
    0,
    damage - effectiveArmor * (1.13 - (0.31 * effectiveArmor) / damage),
  );
};

const cappedChance = (percent: number) =>
  clamp(percent, 0, MAX_EVADE_OR_BLOCK) / 100;

export const evadeChance = (
  defender: FighterState,
  attacker: FighterState,
  activeReduction: number,
) => {
  if (UNAVOIDABLE.has(attacker.combatant.profession) || defender.stunned)
    return 0;

  const points = Math.max(
    0,
    defender.combatant.evadePoints * (1 - puncture(attacker)) -
      attacker.combatant.evadeReduction,
  );

  const { adrenalinEvade } = defender.combatant.passives;

  const chance =
    (points * EVADE_OR_BLOCK_PER_POINT) /
      Math.min(attacker.combatant.level, LEVEL_CAP_FOR_CHANCES) +
    (isBelow(defender, adrenalinEvade) ? adrenalinEvade.value : 0);

  return cappedChance(chance - activeReduction);
};

export const blockChance = (
  defender: FighterState,
  attacker: FighterState,
  activeReduction: number,
) => {
  if (!SHIELD_BEARERS.has(defender.combatant.profession) || defender.stunned)
    return 0;

  const chance =
    (defender.combatant.blockPoints *
      (1 - puncture(attacker)) *
      EVADE_OR_BLOCK_PER_POINT) /
      Math.min(attacker.combatant.level, LEVEL_CAP_FOR_CHANCES) +
    buffTotal(defender, "active_block_per");

  return cappedChance(
    chance -
      activeReduction -
      attacker.combatant.passives.blockReduction -
      buffTotal(defender, "active_decblock_per-enemies"),
  );
};

const bonusArmor = (defender: FighterState) =>
  (defender.combatant.armor *
    buffTotal(
      defender,
      "achpp_per",
      "ac_per",
      "aura-ac_per",
      "sunshield_per",
    )) /
    100 +
  (defender.combatant.shieldArmor * buffTotal(defender, "acshield_per")) / 100;

export const currentArmor = (defender: FighterState) =>
  Math.max(
    ARMOR_FLOOR * defender.combatant.armor,
    defender.combatant.armor - defender.armorLost,
  ) + bonusArmor(defender);

export const armorAgainst = (defender: FighterState, attacker: FighterState) =>
  currentArmor(defender) * (1 - puncture(attacker));

export const destroyArmor = (defender: FighterState, amount: number) => {
  defender.armorLost +=
    amount * (1 - defender.combatant.armorDestructionReduction / 100);
};

export const elementResistance = (
  defender: FighterState,
  base: number,
  buffKey: string,
) =>
  clamp(
    base +
      buffTotal(defender, buffKey) +
      buffTotal(defender, "aura-resall") -
      defender.resistanceLost,
    0,
    MAX_RESISTANCE,
  ) / 100;

const highestResistance = (defender: FighterState) => {
  const d = defender.combatant;

  return Math.max(
    elementResistance(defender, d.resistFire, "resfire_per"),
    elementResistance(defender, d.resistFrost, "resfrost_per"),
    elementResistance(defender, d.resistLight, "reslight_per"),
  );
};

export const destroyResistance = (
  attacker: FighterState,
  defender: FighterState,
) => {
  const amount = attacker.combatant.resistanceDestruction;

  if (amount <= 0 || highestResistance(defender) <= 0) return 0;

  defender.resistanceLost += amount;

  return amount;
};

export const destroyAbsorb = (
  attacker: FighterState,
  defender: FighterState,
) => {
  const amount =
    attacker.combatant.absorbDestruction *
    (1 - defender.combatant.absorbDestructionReduction / 100);

  if (amount <= 0) return 0;

  const destroyed = Math.min(
    amount,
    Math.max(defender.absorbLeft, defender.absorbMagicLeft),
  );

  defender.absorbLeft = Math.max(0, defender.absorbLeft - amount);
  defender.absorbMagicLeft = Math.max(0, defender.absorbMagicLeft - amount);

  return Math.round(destroyed);
};

export const renewAbsorb = (attacker: FighterState) => {
  const share = attacker.combatant.absorbRenewal / 100;
  const { absorb, absorbMagic } = attacker.combatant;

  if (share <= 0) return { absorb: 0, absorbMagic: 0 };

  const absorbRenewed = Math.min(absorb - attacker.absorbLeft, share * absorb);

  const absorbMagicRenewed = Math.min(
    absorbMagic - attacker.absorbMagicLeft,
    share * absorbMagic,
  );

  attacker.absorbLeft += absorbRenewed;
  attacker.absorbMagicLeft += absorbMagicRenewed;

  return {
    absorb: Math.round(absorbRenewed),
    absorbMagic: Math.round(absorbMagicRenewed),
  };
};

export const drain = (
  attacker: FighterState,
  pool: "energy" | "mana",
  { chance: percent, amount }: ResourceDrain,
  random: () => number,
): Drained => {
  if (amount <= 0 || !chance(random, percent)) return NO_DRAIN;

  const { adrenalinDrainReduction } = attacker.combatant.passives;

  const reduction =
    attacker.combatant.drainReduction +
    (isBelow(attacker, adrenalinDrainReduction)
      ? adrenalinDrainReduction.value
      : 0);

  const resisted = Math.min(amount, attacker.combatant.drainResist[pool]);

  const reduced =
    resisted +
    Math.round(((amount - resisted) * Math.min(100, reduction)) / 100);

  const drained = Math.min(attacker[pool], amount - reduced);

  attacker[pool] -= drained;

  return { amount: Math.round(drained), reduced };
};

export const absorbFrom = (
  damage: number,
  share: number,
  pool: number,
  ignored: number,
) => {
  const absorbed = Math.min(pool * (1 - ignored), damage * share);

  return { damage: damage - absorbed, absorbed };
};
