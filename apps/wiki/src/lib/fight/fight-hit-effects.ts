import { addBuff, buffTotal, type ActionPlan } from "./fight-skills";
import {
  healBy,
  healthShare,
  isImmune,
  MELEE,
  takeDamage,
  type FighterState,
} from "./fight-state";

export const chance = (random: () => number, percent: number) =>
  percent > 0 && random() < percent / 100;

const DOT_TURNS = 5;

const WOUND_EXTENSION_TURNS = 2;

const WOUND_GROWTH = 0.5;

const WOUND_CAP_FACTOR = 2;

const REFLECT_MIN = 0.06;

const REFLECT_SPREAD = 0.08;

const SECOND_REFLECT_SHARE = 0.5;

const ANGUISH_TURNS = 5;

const cleanse = (defender: FighterState) => {
  defender.poison = null;
  defender.wound = null;
  defender.anguish = null;
  defender.skillDots.clear();
  defender.frostSlow = null;
  defender.slowBySource.clear();
  defender.critSlowTurns = 0;
  defender.stunned = false;
};

const hasLingeringEffects = (defender: FighterState) =>
  defender.poison !== null ||
  defender.wound !== null ||
  defender.anguish !== null ||
  defender.skillDots.size > 0 ||
  defender.frostSlow !== null ||
  defender.slowBySource.size > 0 ||
  defender.critSlowTurns > 0 ||
  defender.stunned;

export const onHitEffects = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
) => {
  const a = attacker.combatant.legendary;
  const d = defender.combatant.legendary;

  const cleansed = hasLingeringEffects(defender) && chance(random, d.cleanse);

  if (cleansed) cleanse(defender);

  const curse = chance(random, a.curse);
  const glare = chance(random, d.glare);
  const anguish = a.anguish.damage > 0 && chance(random, a.anguish.chance);

  if (curse) defender.cursed = true;

  if (glare) attacker.cursed = true;

  if (anguish) {
    defender.anguish = {
      damage:
        a.anguish.damage * (1 + defender.combatant.damageTakenBonus / 100),
      turnsLeft: ANGUISH_TURNS,
    };
  }

  return { cleansed, curse, glare, anguish };
};

export const damageLoweredBy = (state: FighterState) =>
  Math.max(
    0,
    1 -
      buffTotal(state, "lowdmg_enemy", "combo_lowdmg_enemy", "alllowdmg") / 100,
  );

export const NO_HIT_EFFECTS = {
  cleansed: false,
  curse: false,
  glare: false,
  anguish: false,
};

const burnEnergy = (attacker: FighterState, defender: FighterState) => {
  const burned = Math.min(defender.energy, buffTotal(attacker, "energyout"));

  defender.energy -= burned;

  return burned;
};

export const debuffOnHit = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
) => {
  const lowered = plan.effect("lowdmg_enemy");

  if (lowered > 0) {
    addBuff(
      defender,
      "lowdmg_enemy",
      lowered,
      plan.turns("lowdmg_enemy"),
      attacker.index,
    );
  }

  const comboLowered = plan.effect("combo_lowdmg_enemy") * plan.comboSpent;

  if (comboLowered > 0)
    addBuff(defender, "combo_lowdmg_enemy", comboLowered, 1, attacker.index);

  for (const [key, dot] of [
    ["dmg_evade_hpp-target_light", "light"],
    ["dmg_evade_hpp-target", "absolute"],
  ] as const) {
    const share = plan.effect(key);

    if (share > 0) {
      defender.skillDots.set(dot, {
        damage: (share / 100) * defender.combatant.hp,
        turnsLeft: plan.turns(key),
      });
    }
  }

  return burnEnergy(attacker, defender);
};

export const stunOnHit = (
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
  frost: number,
) => {
  const stun = chance(random, plan.effect("stun"));
  const freeze = frost > 0 && chance(random, plan.effect("freeze"));

  if (stun || freeze) defender.stunned = true;

  return { stun, freeze };
};

export const NO_STUN = { stun: false, freeze: false };

export const reflectFrom = (
  attacker: FighterState,
  defender: FighterState,
  done: number,
  random: () => number,
) => {
  const sources = Math.min(
    2,
    defender.buffs.filter((buff) => buff.key === "lightshield_per").length,
  );

  if (sources === 0 || done <= 0) return 0;

  addBuff(
    attacker,
    "lightshield_slow",
    buffTotal(defender, "lightshield_per"),
    1,
    defender.index,
  );

  if (isImmune(attacker)) return 0;

  const reflected = Math.round(
    done *
      (REFLECT_MIN + random() * REFLECT_SPREAD) *
      (sources > 1 ? 1 + SECOND_REFLECT_SHARE : 1) *
      damageLoweredBy(defender),
  );

  takeDamage(attacker, reflected);
  defender.damageDealt += reflected;

  return reflected;
};

export const vampire = (attacker: FighterState, dealt: number) =>
  healBy(
    attacker,
    dealt *
      (buffTotal(attacker, "vamp_time_per") / 100) *
      (1 - buffTotal(attacker, "lowheal_per-enemies") / 100),
  );

export const applyPoison = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
) => {
  const { poison } = attacker.combatant;

  if (poison.damage <= 0) return false;

  const damage =
    poison.damage * (1 + plan.effect("poisonbon_poison-perw") / 100);

  const slow = poison.slow;

  if (!defender.poison || damage >= defender.poison.damage) {
    defender.poison = {
      damage,
      slow: Math.max(slow, defender.poison?.slow ?? 0),
      turnsLeft: DOT_TURNS,
    };
  } else {
    defender.poison.turnsLeft = DOT_TURNS;
    defender.poison.slow = Math.max(defender.poison.slow, slow);
  }

  return true;
};

export const applyWound = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  poisonApplied: boolean,
  random: () => number,
) => {
  const { wound } = attacker.combatant;

  if (wound.damage <= 0) return false;

  const chance =
    wound.chance +
    (defender.wound === null ? plan.effect("active_wound_per") : 0);

  if (random() >= chance / 100) return false;

  const cap = WOUND_CAP_FACTOR * wound.damage;

  if (defender.wound === null) {
    defender.wound = { damage: wound.damage, cap, turnsLeft: DOT_TURNS };

    return true;
  }

  const growth = (WOUND_GROWTH * wound.damage) / (poisonApplied ? 2 : 1);
  defender.wound.cap = Math.max(defender.wound.cap, cap);
  defender.wound.damage = Math.min(
    defender.wound.cap,
    defender.wound.damage + growth,
  );
  defender.wound.turnsLeft = Math.min(
    DOT_TURNS,
    defender.wound.turnsLeft + WOUND_EXTENSION_TURNS,
  );

  return true;
};

const RAGE_3TURNS_TURNS = 3;

const RAGE_BONUS = 10;

export const parries = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
) =>
  MELEE.has(attacker.combatant.profession) &&
  !defender.stunned &&
  chance(random, defender.combatant.parryChance);

const CRIT_RAGE_HEALTH = 25;

export const enrage = (defender: FighterState) => {
  const { rageTurns, rageBonus, passives } = defender.combatant;

  const desperate =
    healthShare(defender) < CRIT_RAGE_HEALTH ? passives.critRage : 0;

  if (rageTurns > 0) {
    addBuff(
      defender,
      "rage",
      RAGE_BONUS + desperate,
      rageTurns,
      defender.index,
    );
  } else if (rageBonus + desperate > 0) {
    addBuff(
      defender,
      "rage",
      rageBonus + desperate,
      RAGE_3TURNS_TURNS,
      defender.index,
    );
  }
};

export const counters = (
  defender: FighterState,
  random: () => number,
  crit: boolean,
  parried: boolean,
) => {
  if (!defender.alive || defender.stunned) return false;

  const { counterChance, parryCounterChance } = defender.combatant;

  if (parried) return chance(random, counterChance + parryCounterChance);

  return crit && chance(random, counterChance);
};
