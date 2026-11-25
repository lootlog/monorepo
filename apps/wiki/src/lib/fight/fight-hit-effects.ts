import { addBuff, buffTotal, hasBuff, type ActionPlan } from "./fight-skills";
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

const SKILL_SLOWS: ReadonlySet<string> = new Set([
  "allslow_per",
  "lightshield_slow",
]);

export const clearDamageOverTime = (state: FighterState) => {
  state.poison = null;
  state.wound = null;
  state.injure = null;
  state.critWound = null;
  state.anguish = null;
  state.skillDots.clear();
};

const cleanse = (defender: FighterState) => {
  clearDamageOverTime(defender);
  defender.frostSlow = null;
  defender.slowBySource.clear();
  defender.critSlowTurns = 0;
  defender.stunned = false;
  defender.buffs = defender.buffs.filter((buff) => !SKILL_SLOWS.has(buff.key));
};

const hasLingeringEffects = (defender: FighterState) =>
  defender.stunned ||
  defender.poison !== null ||
  defender.wound !== null ||
  defender.injure !== null ||
  defender.critWound !== null ||
  defender.anguish !== null ||
  defender.skillDots.size > 0 ||
  defender.frostSlow !== null ||
  defender.slowBySource.size > 0 ||
  defender.critSlowTurns > 0 ||
  defender.buffs.some((buff) => SKILL_SLOWS.has(buff.key));

export const onHitEffects = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
) => {
  const a = attacker.combatant.legendary;
  const d = defender.combatant.legendary;
  const curse = chance(random, a.curse);
  const glare = chance(random, d.glare);
  const anguish = a.anguish.damage > 0 && chance(random, a.anguish.chance);

  if (curse) defender.cursed = true;

  if (glare) attacker.cursed = true;

  if (anguish) {
    defender.anguish = {
      damage: a.anguish.damage * weaponlessUnavoidableFactor(attacker),
      turnsLeft: ANGUISH_TURNS,
      source: attacker.index,
    };
  }

  return { curse, glare, anguish };
};

export const cleanseOnHit = (defender: FighterState, random: () => number) => {
  const cleansed =
    hasLingeringEffects(defender) &&
    chance(random, defender.combatant.legendary.cleanse);

  if (cleansed) cleanse(defender);

  return cleansed;
};

export const unavoidableFactor = (state: FighterState) =>
  1 + state.combatant.unavoidableBonus / 100;

export const weaponlessUnavoidableFactor = (state: FighterState) =>
  unavoidableFactor(state) * (1 + state.combatant.allDamageBonus / 100);

export const skillDamageFactor = ({ combatant }: FighterState) =>
  1 +
  (combatant.allDamageBonus +
    combatant.physicalBonus +
    combatant.unavoidableBonus) /
    100;

const WEAKENING_SOURCES = 2;

const ATTACK_WEAKENINGS: ReadonlySet<string> = new Set([
  "lowdmg_enemy",
  "combo_lowdmg_enemy",
]);

export const poisonWeakeningOf = (attacker: FighterState) =>
  attacker.poison ? buffTotal(attacker, "poison_lowdmg_per") : 0;

export const weakeningFactor = (
  attacker: FighterState,
  defender: FighterState,
) => {
  const lowered = [
    ...attacker.buffs
      .filter((buff) => ATTACK_WEAKENINGS.has(buff.key))
      .map((buff) => buff.value),
    poisonWeakeningOf(attacker),
    -defender.combatant.damageTakenBonus,
  ]
    .filter((value) => value > 0)
    .sort((left, right) => right - left)
    .slice(0, WEAKENING_SOURCES)
    .reduce((total, value) => total + value, 0);

  return Math.max(0, 1 - (lowered + buffTotal(attacker, "alllowdmg")) / 100);
};

export const NO_HIT_EFFECTS = {
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
        damage:
          (share / 100) * defender.combatant.hp * skillDamageFactor(attacker),
        turnsLeft: plan.turns(key),
        source: attacker.index,
      });
    }
  }

  return burnEnergy(attacker, defender);
};

export const stunOnHit = (
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
  hit: { readonly damaging: boolean; readonly frost: boolean },
) => {
  const stun = hit.damaging && chance(random, plan.effect("stun"));
  const freeze = hit.frost && chance(random, plan.effect("freeze"));

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
  const [strongest = 0, second = 0] = defender.buffs
    .filter((buff) => buff.key === "lightshield_per")
    .map((buff) => buff.value)
    .sort((left, right) => right - left);

  const sources = (strongest > 0 ? 1 : 0) + (second > 0 ? 1 : 0);

  if (sources === 0 || done <= 0 || !defender.alive) return 0;

  addBuff(
    attacker,
    "lightshield_slow",
    strongest + SECOND_REFLECT_SHARE * second,
    1,
    defender.index,
  );

  if (isImmune(attacker)) return 0;

  const reflected = Math.round(
    done *
      (REFLECT_MIN + random() * REFLECT_SPREAD) *
      (sources > 1 ? 1 + SECOND_REFLECT_SHARE : 1) *
      weakeningFactor(defender, attacker) *
      weaponlessUnavoidableFactor(defender),
  );

  takeDamage(attacker, reflected);
  defender.damageDealt += reflected;

  return reflected;
};

export const vampire = (attacker: FighterState, dealt: number) =>
  hasBuff(attacker, "vamp_time_per")
    ? healBy(
        attacker,
        dealt *
          (buffTotal(attacker, "vamp_time_per") / 100) *
          (1 - buffTotal(attacker, "lowheal_per-enemies") / 100),
      )
    : null;

type WeaponsLanded = { readonly main: boolean; readonly offhand: boolean };

const applyPoison = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  landed: WeaponsLanded,
) => {
  const { poison, offhandPoison } = attacker.combatant;

  const applied = [
    ...(landed.main ? [poison] : []),
    ...(landed.offhand ? [offhandPoison] : []),
  ].filter((weapon) => weapon.damage > 0);

  if (applied.length === 0) return false;

  const boost = plan.effect("poisonbon_poison-perw");

  const damage =
    applied.reduce((total, weapon) => total + weapon.damage, 0) *
    (1 + boost / 100);

  const slow = Math.max(...applied.map((weapon) => weapon.slow));
  const current = defender.poison;

  if (!current || damage >= current.damage) {
    defender.poison = {
      damage,
      slow: Math.max(slow, current?.slow ?? 0),
      turnsLeft: DOT_TURNS,
      source: attacker.index,
      boosted: boost > 0,
    };
  } else {
    if (boost > 0 || !current.boosted) current.turnsLeft = DOT_TURNS;

    current.slow = Math.max(current.slow, slow);
  }

  return true;
};

const applyWound = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
  landed: WeaponsLanded,
  poisonApplied: boolean,
) => {
  const { wound, offhandWound } = attacker.combatant;

  const mainChance =
    wound.chance +
    (defender.wound === null ? plan.effect("active_wound_per") : 0);

  const main = landed.main && wound.damage > 0 && chance(random, mainChance);

  const offhand =
    landed.offhand &&
    offhandWound.damage > 0 &&
    chance(random, offhandWound.chance);

  const damage =
    (main ? wound.damage : 0) + (offhand ? offhandWound.damage : 0);

  if (damage <= 0) return { main, offhand, halved: false };

  const cap = WOUND_CAP_FACTOR * damage;
  const applied = damage / (poisonApplied ? 2 : 1);

  if (defender.wound === null) {
    defender.wound = {
      damage: applied,
      cap,
      turnsLeft: DOT_TURNS,
      source: attacker.index,
    };
  } else {
    defender.wound.cap = Math.max(defender.wound.cap, cap);
    defender.wound.damage = Math.min(
      defender.wound.cap,
      defender.wound.damage + WOUND_GROWTH * applied,
    );
    defender.wound.turnsLeft += WOUND_EXTENSION_TURNS;
  }

  return { main, offhand, halved: poisonApplied };
};

export const NO_WEAPON_WOUNDS = { main: false, offhand: false, halved: false };

export const applyWeaponDamageOverTime = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
  landed: WeaponsLanded,
) => {
  const poisonApplied = applyPoison(attacker, defender, plan, landed);

  return applyWound(attacker, defender, plan, random, landed, poisonApplied);
};

const RAGE_3TURNS_TURNS = 3;

const RAGE_BONUS = 10;

export const parryChance = (attacker: FighterState, defender: FighterState) =>
  MELEE.has(attacker.combatant.profession) && !defender.stunned
    ? defender.combatant.parryChance
    : 0;

export const parries = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
) => chance(random, parryChance(attacker, defender));

const CRIT_RAGE_HEALTH = 25;

export const enrage = (defender: FighterState) => {
  const { rageTurns, rageBonus } = defender.combatant;

  if (rageTurns > 0) {
    addBuff(defender, "rage", RAGE_BONUS, rageTurns, defender.index);
  } else if (rageBonus > 0) {
    addBuff(defender, "rage", rageBonus, RAGE_3TURNS_TURNS, defender.index);
  }
};

export const ragePercent = (attacker: FighterState) =>
  hasBuff(attacker, "rage")
    ? buffTotal(attacker, "rage") +
      (healthShare(attacker) < CRIT_RAGE_HEALTH
        ? attacker.combatant.passives.critRage
        : 0)
    : 0;

const isTauntedAwayFrom = (defender: FighterState, attacker: FighterState) =>
  hasBuff(defender, "shout") &&
  !defender.buffs.some(
    (buff) => buff.key === "shout" && buff.source === attacker.index,
  );

export const counters = (
  defender: FighterState,
  attacker: FighterState,
  random: () => number,
  crit: boolean,
  parried: boolean,
) => {
  if (
    !defender.alive ||
    defender.stunned ||
    isTauntedAwayFrom(defender, attacker)
  ) {
    return false;
  }

  const { counterChance, parryCounterChance } = defender.combatant;

  if (parried) return chance(random, counterChance + parryCounterChance);

  return crit && chance(random, counterChance);
};
