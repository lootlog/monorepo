import { critValueShift } from "./fight-crit";
import {
  absorbFrom,
  armorAgainst,
  armorReduced,
  destroyArmor,
  elementResistance,
  PHYSICAL_ABSORB_SHARE,
  puncture,
  resistanceReduction,
} from "./fight-defence";
import { isDistance } from "./fight-passives";
import { buffTotal, type ActionPlan } from "./fight-skills";
import {
  MELEE,
  roll,
  type DamageRange,
  type Element,
  type ElementalBonus,
  type FighterState,
} from "./fight-state";

export type ElementalDamage = {
  readonly fire: number;
  readonly frost: number;
  readonly light: number;
};

const MAGIC_ARMOR_FACTOR = 0.5;

const MAGIC_ABSORB_SHARE = 0.9;

const LIGHT_RAMP_PER_ATTACK = 0.025;

const LIGHT_RAMP_MAX = 0.5;

export type Hit = {
  attacker: FighterState;
  defender: FighterState;
  plan: ActionPlan;
  crit: number;
  scale: number;
  vulture: number;
  rage: number;
  random: () => number;
};

export const critValueBonus = (
  attacker: FighterState,
  defender: FighterState,
) =>
  buffTotal(attacker, "critval-allies", "critval-enemies") +
  critValueShift(attacker, defender);

export const MIN_CRIT_VALUE = 100;

const critValue = ({ attacker, defender }: Hit) =>
  Math.max(
    MIN_CRIT_VALUE,
    attacker.combatant.critValue + critValueBonus(attacker, defender),
  );

const critMagicValue = ({ attacker, defender }: Hit, element: number) =>
  Math.max(
    MIN_CRIT_VALUE,
    attacker.combatant.critMagicValue +
      element +
      buffTotal(attacker, "critmval-allies", "critmval-enemies") +
      critValueShift(attacker, defender),
  );

export const physicalStrength = (hit: Hit) => {
  const { attacker, plan, crit, scale, vulture, rage, random } = hit;
  const added = plan.effect("adddmg_physical-perw") / 100;
  const rolled = roll(random, attacker.combatant.physical);

  return {
    rolled,
    strength:
      rolled *
      (crit > 0 ? (crit * critValue(hit)) / 100 + added : 1 + added) *
      (1 + buffTotal(attacker, "aura-adddmg2_per-meele_physical") / 100) *
      (1 + attacker.combatant.physicalBonus / 100) *
      (1 + rage) *
      scale *
      (1 + vulture),
  };
};

export const magicStrength = (hit: Hit) => {
  const { attacker, defender, plan, crit, scale, random } = hit;
  const a = attacker.combatant;

  const lightRamp = Math.min(
    LIGHT_RAMP_MAX,
    LIGHT_RAMP_PER_ATTACK * (attacker.lightAttacks.get(defender.index) ?? 0),
  );

  const multiplier = (element: keyof ElementalBonus, added: number) =>
    crit > 0
      ? (crit * critMagicValue(hit, a.critMagicBonus[element])) / 100 + added
      : 1 + added;

  const rolled = (range: DamageRange, factor: number) =>
    range.max <= 0 ? 0 : roll(random, range) * factor * scale;

  return {
    fire: rolled(
      a.fire,
      multiplier("fire", plan.effect("adddmg_fire-perw") / 100),
    ),
    frost: rolled(a.frost, multiplier("frost", 0)),
    light: rolled(a.light, (1 + lightRamp) * multiplier("light", 0)),
  };
};

const physicalAbsorbShare = (
  attacker: FighterState,
  defender: FighterState,
) => {
  const { profession } = attacker.combatant;

  if (MELEE.has(profession)) return PHYSICAL_ABSORB_SHARE;

  return isDistance(attacker)
    ? Math.min(PHYSICAL_ABSORB_SHARE, defender.combatant.absorbDistance / 100)
    : 0;
};

export const physicalDamage = (
  hit: Hit,
  pierced: boolean,
  blockFactor: number,
) => {
  const { attacker, defender, plan } = hit;
  const { rolled, strength } = physicalStrength(hit);

  const { physical, physicalBonus } = attacker.combatant;

  const armorDestruction = destroyArmor(
    defender,
    (plan.effect("active_acdmg_physical-perw") / 100) *
      ((physical.min + physical.max) / 2) *
      (1 + physicalBonus / 100),
  );

  const raw = strength * blockFactor;

  const reduced = pierced
    ? raw
    : armorReduced(raw, armorAgainst(defender, attacker));

  const share = physicalAbsorbShare(attacker, defender);

  if (share <= 0 || reduced <= 0) {
    return { rolled, strength, armorDestruction, taken: reduced, absorbed: 0 };
  }

  const absorbed = absorbFrom(
    reduced,
    share,
    defender.absorbLeft,
    puncture(attacker),
  );

  defender.absorbLeft -= absorbed.absorbed;

  return {
    rolled,
    strength,
    armorDestruction,
    taken: absorbed.damage,
    absorbed: absorbed.absorbed,
  };
};

const NO_ELEMENTAL_DAMAGE: ElementalDamage = { fire: 0, frost: 0, light: 0 };

export const magicDamage = (
  hit: Hit,
  pierced: boolean,
  blockFactor: number,
) => {
  const { attacker, defender, plan } = hit;
  const armor = MAGIC_ARMOR_FACTOR * armorAgainst(defender, attacker);
  const strength = magicStrength(hit);

  if (attacker.combatant.light.max > 0) {
    attacker.lightAttacks.set(
      defender.index,
      (attacker.lightAttacks.get(defender.index) ?? 0) +
        1 +
        plan.effect("active_add_light_cumulaction"),
    );
  }

  const armored = (value: number) =>
    value <= 0
      ? 0
      : pierced
        ? value * blockFactor
        : armorReduced(value * blockFactor, armor);

  const fire = armored(strength.fire);
  const frost = armored(strength.frost);
  const light = armored(strength.light);
  const magic = fire + frost + light;

  if (magic <= 0) {
    return { strength, taken: NO_ELEMENTAL_DAMAGE, absorbed: 0 };
  }

  const absorbed = absorbFrom(
    magic,
    MAGIC_ABSORB_SHARE,
    defender.absorbMagicLeft,
    puncture(attacker),
  );

  defender.absorbMagicLeft -= absorbed.absorbed;

  const kept = absorbed.damage / magic;

  const resisted = (value: number, element: Element) =>
    value *
    kept *
    (1 -
      resistanceReduction(
        elementResistance(defender, element) - puncture(attacker),
      ));

  return {
    strength,
    absorbed: absorbed.absorbed,
    taken: {
      fire: resisted(fire, "fire"),
      frost: resisted(frost, "frost"),
      light: resisted(light, "light"),
    },
  };
};
