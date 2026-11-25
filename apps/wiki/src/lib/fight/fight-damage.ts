import { critValueShift } from "./fight-crit";
import {
  absorbFrom,
  armorAgainst,
  armorReduced,
  destroyArmor,
  elementResistance,
  PHYSICAL_ABSORB_SHARE,
  puncture,
} from "./fight-defence";
import { isDistance } from "./fight-passives";
import { buffTotal, type ActionPlan } from "./fight-skills";
import {
  MELEE,
  roll,
  type DamageRange,
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
  random: () => number;
};

const critValue = ({ attacker, defender }: Hit) =>
  attacker.combatant.critValue +
  buffTotal(attacker, "critval-allies", "critval-enemies") +
  critValueShift(attacker, defender);

const critMagicValue = ({ attacker, defender }: Hit, element: number) =>
  attacker.combatant.critMagicValue +
  element +
  buffTotal(attacker, "critmval-allies", "critmval-enemies") +
  critValueShift(attacker, defender);

export const physicalStrength = (hit: Hit) => {
  const { attacker, plan, crit, random } = hit;
  const added = plan.effect("adddmg_physical-perw") / 100;

  return (
    roll(random, attacker.combatant.physical) *
    (crit > 0 ? (crit * critValue(hit)) / 100 + added : 1 + added) *
    (1 + buffTotal(attacker, "aura-adddmg2_per-meele_physical") / 100) *
    (1 + attacker.combatant.physicalBonus / 100)
  );
};

export const magicStrength = (hit: Hit) => {
  const { attacker, defender, plan, crit, random } = hit;
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
    range.max <= 0 ? 0 : roll(random, range) * factor;

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
  const strength = physicalStrength(hit);

  destroyArmor(
    defender,
    (plan.effect("active_acdmg_physical-perw") / 100) * strength,
  );

  const raw = strength * blockFactor;

  const reduced = pierced
    ? raw
    : armorReduced(raw, armorAgainst(defender, attacker));

  const share = physicalAbsorbShare(attacker, defender);

  if (share <= 0 || reduced <= 0) {
    return { strength, taken: reduced, absorbed: 0 };
  }

  const absorbed = absorbFrom(
    reduced,
    share,
    defender.absorbLeft,
    puncture(attacker),
  );

  defender.absorbLeft -= absorbed.absorbed;

  return { strength, taken: absorbed.damage, absorbed: absorbed.absorbed };
};

const NO_ELEMENTAL_DAMAGE: ElementalDamage = { fire: 0, frost: 0, light: 0 };

export const magicDamage = (
  hit: Hit,
  pierced: boolean,
  blockFactor: number,
) => {
  const { attacker, defender, plan } = hit;
  const d = defender.combatant;
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

  const resisted = (value: number, base: number, buffKey: string) =>
    value *
    kept *
    (1 - (elementResistance(defender, base, buffKey) - puncture(attacker)));

  return {
    strength,
    absorbed: absorbed.absorbed,
    taken: {
      fire: resisted(fire, d.resistFire, "resfire_per"),
      frost: resisted(frost, d.resistFrost, "resfrost_per"),
      light: resisted(light, d.resistLight, "reslight_per"),
    },
  };
};
