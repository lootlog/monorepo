import { MAX_RESISTANCE } from "@/lib/character-stats";
import { chance } from "./fight-hit-effects";
import { buffTotal } from "./fight-skills";
import {
  clamp,
  type Element,
  isBelow,
  type FighterState,
  type Profession,
  type ResourceDrain,
} from "./fight-state";

export type Drained = { readonly amount: number; readonly reduced: number };

export const LEVEL_CAP_FOR_CHANCES = 300;

export const MAX_EVADE_OR_BLOCK = 50;

const EVADE_OR_BLOCK_PER_POINT = 20;

const ARMOR_FLOOR = 0.5;

const ARMOR_FORMULA_VERTEX = 1.13 / 0.62;

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

export const evadeParts = (defender: FighterState, attacker: FighterState) => {
  if (UNAVOIDABLE.has(attacker.combatant.profession) || defender.stunned)
    return null;

  const perPoint =
    EVADE_OR_BLOCK_PER_POINT /
    Math.min(attacker.combatant.level, LEVEL_CAP_FOR_CHANCES);

  const { adrenalinEvade } = defender.combatant.passives;

  const adrenaline = isBelow(defender, adrenalinEvade)
    ? adrenalinEvade.value
    : 0;

  const own =
    defender.combatant.evadePoints * (1 - puncture(attacker)) * perPoint +
    defender.combatant.evadePercent;

  const lowered =
    attacker.combatant.evadeReduction * perPoint +
    attacker.combatant.evadeReductionPercent;

  return {
    points: Math.max(0, own - lowered),
    adrenaline: Math.max(0, adrenaline + Math.min(0, own - lowered)),
  };
};

export const evadeChance = (
  defender: FighterState,
  attacker: FighterState,
  activeReduction: number,
) => {
  const parts = evadeParts(defender, attacker);

  return parts
    ? cappedChance(parts.points + parts.adrenaline - activeReduction)
    : 0;
};

export const blockChance = (
  defender: FighterState,
  attacker: FighterState,
  activeReduction: number,
) => {
  if (!defender.combatant.hasShield || defender.stunned) return 0;

  const chance =
    (defender.combatant.blockPoints *
      (1 - puncture(attacker)) *
      EVADE_OR_BLOCK_PER_POINT) /
      Math.min(attacker.combatant.level, LEVEL_CAP_FOR_CHANCES) +
    defender.combatant.blockPercent +
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

export const isArmorBroken = (defender: FighterState) =>
  defender.combatant.armor - defender.armorLost <=
  ARMOR_FLOOR * defender.combatant.armor;

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

  return amount;
};

const ELEMENT_RESISTANCES: Record<
  Element,
  {
    readonly stat: "resistFire" | "resistFrost" | "resistLight";
    readonly buff: string;
  }
> = {
  fire: { stat: "resistFire", buff: "resfire_per" },
  frost: { stat: "resistFrost", buff: "resfrost_per" },
  light: { stat: "resistLight", buff: "reslight_per" },
};

const ELEMENTS: readonly Element[] = ["fire", "frost", "light"];

const heldResistance = (defender: FighterState, element: Element) => {
  const { stat, buff } = ELEMENT_RESISTANCES[element];

  return (
    defender.combatant[stat] +
    buffTotal(defender, buff) +
    buffTotal(defender, "aura-resall") -
    defender.resistanceLost[element]
  );
};

export const elementResistance = (defender: FighterState, element: Element) =>
  Math.max(0, heldResistance(defender, element)) / 100;

export const resistanceReduction = (resistance: number) =>
  Math.min(MAX_RESISTANCE / 100, resistance);

export const destroyResistance = (
  attacker: FighterState,
  defender: FighterState,
) => {
  const amount = attacker.combatant.resistanceDestruction;

  const ownLeft = (element: Element) =>
    defender.combatant[ELEMENT_RESISTANCES[element].stat] -
    defender.resistanceLost[element];

  if (amount <= 0 || ELEMENTS.every((element) => ownLeft(element) <= 0)) {
    return 0;
  }

  for (const element of ELEMENTS) {
    defender.resistanceLost[element] += clamp(ownLeft(element), 0, amount);
  }

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

export const NO_ABSORB_SHARE_DESTROYED = { absorb: 0, absorbMagic: 0 };

export const destroyAbsorbShare = (defender: FighterState, percent: number) => {
  const share =
    (percent / 100) * (1 - defender.combatant.absorbDestructionReduction / 100);

  if (share <= 0) return NO_ABSORB_SHARE_DESTROYED;

  const destroyed = {
    absorb: Math.round(defender.absorbLeft * share),
    absorbMagic: Math.round(defender.absorbMagicLeft * share),
  };

  defender.absorbLeft *= 1 - share;
  defender.absorbMagicLeft *= 1 - share;

  return destroyed;
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

export const destroyResource = (
  holder: FighterState,
  pool: "energy" | "mana",
  amount: number,
): Drained => {
  if (amount <= 0) return NO_DRAIN;

  const { adrenalinDrainReduction } = holder.combatant.passives;

  const reduction =
    holder.combatant.drainReduction +
    (isBelow(holder, adrenalinDrainReduction)
      ? adrenalinDrainReduction.value
      : 0);

  const resisted = Math.min(amount, holder.combatant.drainResist[pool]);

  const reduced =
    resisted +
    Math.round(((amount - resisted) * Math.min(100, reduction)) / 100);

  const destroyed = Math.min(holder[pool], amount - reduced);

  holder[pool] -= destroyed;

  return { amount: Math.round(destroyed), reduced };
};

export const drain = (
  attacker: FighterState,
  pool: "energy" | "mana",
  { chance: percent, amount }: ResourceDrain,
  random: () => number,
): Drained =>
  chance(random, percent) ? destroyResource(attacker, pool, amount) : NO_DRAIN;

export const absorbFrom = (
  damage: number,
  share: number,
  pool: number,
  ignored: number,
) => {
  const absorbed = Math.min(pool * (1 - ignored), damage * share);

  return { damage: damage - absorbed, absorbed };
};
