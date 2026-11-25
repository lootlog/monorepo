import { armorAgainst, armorReduced } from "./fight-defence";
import { chance } from "./fight-hit-effects";
import { addBuff } from "./fight-skills";
import {
  clamp,
  healthShare,
  MELEE,
  roll,
  type Combatant,
  type FighterState,
  type Profession,
} from "./fight-state";

const DISTANCE: ReadonlySet<Profession> = new Set(["h", "t"]);

const INJURE_SHARE = 0.15;

const CRIT_WOUND_SHARE = 0.1;

const LINGERING_TURNS = 3;

const CRIT_SPEED_TURNS = 3;

const VULTURE_HEALTH = 20;

export const isDistance = (state: FighterState) =>
  DISTANCE.has(state.combatant.profession);

export const arrowBlockChance = (
  attacker: FighterState,
  defender: FighterState,
) =>
  isDistance(attacker) && !defender.stunned
    ? defender.combatant.passives.arrowBlockChance
    : 0;

export const arrowBlocks = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
) => chance(random, arrowBlockChance(attacker, defender));

export const NO_THIRD_ATTACK = { strength: 0, taken: 0 };

export const thirdAttack = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
  scale: number,
) => {
  const a = attacker.combatant;

  if (a.offhand.max <= 0 || !chance(random, a.passives.thirdAttackChance)) {
    return NO_THIRD_ATTACK;
  }

  const strength = roll(random, a.physical) * scale;

  return {
    strength,
    taken: armorReduced(strength, armorAgainst(defender, attacker)),
  };
};

export const crushOf = (
  attacker: FighterState,
  strength: number,
  taken: number,
) => {
  const { value, bound } = attacker.combatant.passives.crush;

  if (value <= 0 || strength <= 0 || taken / strength < bound / 100) {
    return { value: 0, damage: 0 };
  }

  return { value, damage: Math.round((value * taken) / 100) };
};

export const crushKey = (combatant: Combatant) =>
  DISTANCE.has(combatant.profession) ? "+crush_distance" : "+crush_physical";

export const vultureShare = (attacker: FighterState, defender: FighterState) =>
  healthShare(defender) < VULTURE_HEALTH &&
  (MELEE.has(attacker.combatant.profession) || isDistance(attacker))
    ? attacker.combatant.passives.vulture / 100
    : 0;

export type PassiveTriggers = {
  readonly energyBack: number;
  readonly injure: number;
  readonly critWound: boolean;
  readonly poisonResistanceDestroyed: number;
  readonly critSpeed: number;
  readonly critPoison: number;
  readonly critPierce: number;
  readonly distracted: boolean;
};

const NO_PASSIVE_TRIGGERS: PassiveTriggers = {
  energyBack: 0,
  injure: 0,
  critWound: false,
  poisonResistanceDestroyed: 0,
  critSpeed: 0,
  critPoison: 0,
  critPierce: 0,
  distracted: false,
};

type Landed = {
  readonly crit: boolean;
  readonly landed: boolean;
  readonly mainTaken: number;
  readonly dealt: number;
  readonly pierced: boolean;
  readonly armorDestroyed: number;
};

const restoreEnergy = (attacker: FighterState) => {
  const pool = attacker.combatant.energy;

  const restored = Math.max(
    0,
    Math.min(
      pool - attacker.energy,
      Math.round((attacker.combatant.passives.energyBack * pool) / 100),
    ),
  );

  attacker.energy += restored;

  return restored;
};

const lingering = (damage: number, source: FighterState) => ({
  damage,
  turnsLeft: LINGERING_TURNS,
  source: source.index,
});

const onCrit = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
  { landed, dealt, pierced, armorDestroyed }: Landed,
) => {
  const p = attacker.combatant.passives;
  const critWound = landed && dealt > 0 && chance(random, p.critWoundChance);

  if (critWound) {
    defender.critWound = lingering(CRIT_WOUND_SHARE * dealt, attacker);
  }

  const critSpeed = chance(random, p.critSpeed.bound) ? p.critSpeed.value : 0;

  if (critSpeed > 0) {
    addBuff(attacker, "critsa", critSpeed, CRIT_SPEED_TURNS, attacker.index);
  }

  const critPoison =
    landed && chance(random, p.critPoison.bound) ? p.critPoison.value : 0;

  if (critPoison > 0) defender.healCut = critPoison;

  const critPierce =
    pierced && p.critPierce > 0
      ? Math.round((p.critPierce * armorDestroyed) / 100)
      : 0;

  defender.armorLost += critPierce;

  const distracted = landed && chance(random, p.distractChance);

  if (distracted) defender.cursed = true;

  const poisonResistanceDestroyed = landed ? p.poisonResistanceDestruction : 0;

  defender.poisonResistanceLost += clamp(
    defender.combatant.resistPoison - defender.poisonResistanceLost,
    0,
    poisonResistanceDestroyed,
  );

  return {
    energyBack: attacker.alive ? restoreEnergy(attacker) : 0,
    critWound,
    critSpeed,
    critPoison,
    critPierce,
    distracted,
    poisonResistanceDestroyed,
  };
};

export const passiveTriggers = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
  landed: Landed,
): PassiveTriggers => {
  const injured =
    landed.landed &&
    landed.mainTaken > 0 &&
    chance(random, attacker.combatant.passives.injureChance);

  const injure = injured ? Math.floor(INJURE_SHARE * landed.mainTaken) : 0;

  if (injure > 0) defender.injure = lingering(injure, attacker);

  return landed.crit
    ? { ...onCrit(attacker, defender, random, landed), injure }
    : { ...NO_PASSIVE_TRIGGERS, injure };
};
