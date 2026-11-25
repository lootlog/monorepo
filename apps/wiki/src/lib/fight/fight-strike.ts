import { buffTotal, gainCombo, type ActionPlan } from "./fight-skills";
import {
  clamp,
  MAX_RESISTANCE,
  type DamageRange,
  type FighterState,
  type Profession,
} from "./fight-state";

type ElementalDamage = {
  readonly fire: number;
  readonly frost: number;
  readonly light: number;
};

type StrikeDamage = ElementalDamage & {
  readonly physical: number;
  readonly offhand: number;
};

export type Strike = {
  readonly crit: boolean;
  readonly veryCrit: boolean;
  readonly curse: boolean;
  readonly glare: boolean;
  readonly anguish: boolean;
  readonly holyTouch: boolean;
  readonly cleansed: boolean;
  readonly puncture: number;
  readonly critred: number;
  readonly facade: number;
  readonly evaded: boolean;
  readonly blocked: number;
  readonly pierced: boolean;
  readonly pierceBlocked: boolean;
  readonly wounded: boolean;
  readonly armorDestroyed: number;
  readonly damage: StrikeDamage;
};

const LEVEL_CAP_FOR_CHANCES = 300;

const MAX_EVADE_OR_BLOCK = 50;

const EVADE_OR_BLOCK_PER_POINT = 20;

const BLOCK_REDUCTION = 0.3;

const MIN_CRIT = 1;

const ARMOR_FLOOR = 0.5;

const MAGIC_ARMOR_FACTOR = 0.5;

const ARMOR_FORMULA_VERTEX = 1.13 / 0.62;

const PHYSICAL_ABSORB_SHARE = 0.75;

const MAGIC_ABSORB_SHARE = 0.9;

const LIGHT_RAMP_PER_ATTACK = 0.025;

const LIGHT_RAMP_MAX = 0.5;

const DOT_TURNS = 5;

const WOUND_EXTENSION_TURNS = 2;

const WOUND_GROWTH = 0.5;

const WOUND_CAP_FACTOR = 2;

const MELEE_ABSORBED: ReadonlySet<Profession> = new Set(["w", "p", "b"]);

const SHIELD_BEARERS: ReadonlySet<Profession> = new Set(["w", "p"]);

const UNAVOIDABLE: ReadonlySet<Profession> = new Set(["m"]);

const VERY_CRIT_FACTOR = 1.75;

const HOLY_TOUCH_TURNS = 3;

const puncture = (attacker: FighterState) =>
  attacker.combatant.legendary.puncture / 100;

const chance = (random: () => number, percent: number) =>
  percent > 0 && random() < percent / 100;

export const armorReduced = (damage: number, armor: number) => {
  if (damage <= 0 || armor <= 0) return Math.max(0, damage);

  const effectiveArmor = Math.min(armor, ARMOR_FORMULA_VERTEX * damage);

  return Math.max(
    0,
    damage - effectiveArmor * (1.13 - (0.31 * effectiveArmor) / damage),
  );
};

const roll = (random: () => number, range: DamageRange) =>
  range.max <= range.min
    ? range.min
    : range.min + Math.floor(random() * (range.max - range.min + 1));

const evadeChance = (
  defender: FighterState,
  attacker: FighterState,
  activeReduction: number,
) => {
  if (UNAVOIDABLE.has(attacker.combatant.profession)) return 0;

  const points = Math.max(
    0,
    defender.combatant.evadePoints * (1 - puncture(attacker)) -
      attacker.combatant.evadeReduction,
  );

  const chance = Math.min(
    MAX_EVADE_OR_BLOCK,
    (points * EVADE_OR_BLOCK_PER_POINT) /
      Math.min(attacker.combatant.level, LEVEL_CAP_FOR_CHANCES),
  );

  return Math.max(0, chance - activeReduction) / 100;
};

const blockChance = (
  defender: FighterState,
  attacker: FighterState,
  activeReduction: number,
) => {
  if (!SHIELD_BEARERS.has(defender.combatant.profession)) return 0;

  const chance = Math.min(
    MAX_EVADE_OR_BLOCK,
    (defender.combatant.blockPoints *
      (1 - puncture(attacker)) *
      EVADE_OR_BLOCK_PER_POINT) /
      Math.min(attacker.combatant.level, LEVEL_CAP_FOR_CHANCES),
  );

  return Math.max(0, chance - activeReduction) / 100;
};

const currentArmor = (defender: FighterState) =>
  Math.max(
    ARMOR_FLOOR * defender.combatant.armor,
    defender.combatant.armor - defender.armorLost,
  );

const armorAgainst = (defender: FighterState, attacker: FighterState) =>
  currentArmor(defender) * (1 - puncture(attacker));

const resistance = (
  defender: FighterState,
  attacker: FighterState,
  base: number,
  buffKey: string,
) =>
  clamp(base + buffTotal(defender, buffKey), 0, MAX_RESISTANCE) / 100 -
  puncture(attacker);

const absorbFrom = (
  damage: number,
  share: number,
  pool: number,
  ignored: number,
) => {
  const absorbed = Math.min(pool * (1 - ignored), damage * share);

  return { damage: damage - absorbed, absorbed };
};

type Hit = {
  attacker: FighterState;
  defender: FighterState;
  plan: ActionPlan;
  crit: number;
  random: () => number;
};

const physicalDamage = (
  { attacker, defender, plan, crit, random }: Hit,
  pierced: boolean,
  blockFactor: number,
) => {
  const a = attacker.combatant;

  const raw =
    roll(random, a.physical) *
    (1 + plan.effect("adddmg_physical-perw") / 100) *
    (1 + a.physicalBonus / 100) *
    (crit > 0 ? (crit * a.critValue) / 100 : 1) *
    blockFactor;

  const reduced = pierced
    ? raw
    : armorReduced(raw, armorAgainst(defender, attacker));

  if (!MELEE_ABSORBED.has(a.profession) || reduced <= 0) return reduced;

  const absorbed = absorbFrom(
    reduced,
    PHYSICAL_ABSORB_SHARE,
    defender.absorbLeft,
    puncture(attacker),
  );

  defender.absorbLeft -= absorbed.absorbed;

  return absorbed.damage;
};

const NO_ELEMENTAL_DAMAGE: ElementalDamage = { fire: 0, frost: 0, light: 0 };

const magicDamage = (
  { attacker, defender, crit, random }: Hit,
  blockFactor: number,
): ElementalDamage => {
  const a = attacker.combatant;
  const d = defender.combatant;
  const armor = armorAgainst(defender, attacker);
  const previousAttacks = attacker.lightAttacks.get(defender.index) ?? 0;

  const lightRamp = Math.min(
    LIGHT_RAMP_MAX,
    LIGHT_RAMP_PER_ATTACK * previousAttacks,
  );

  const magicCrit = crit > 0 ? (crit * a.critMagicValue) / 100 : 1;

  attacker.lightAttacks.set(defender.index, previousAttacks + 1);

  const element = (
    range: DamageRange,
    ramp: number,
    base: number,
    buffKey: string,
  ) => {
    if (range.max <= 0) return 0;

    const raw = roll(random, range) * (1 + ramp) * magicCrit * blockFactor;

    return (
      armorReduced(raw, MAGIC_ARMOR_FACTOR * armor) *
      (1 - resistance(defender, attacker, base, buffKey))
    );
  };

  const fire = element(a.fire, 0, d.resistFire, "resfire_per");
  const frost = element(a.frost, 0, d.resistFrost, "resfrost_per");
  const light = element(a.light, lightRamp, d.resistLight, "reslight_per");
  const magic = fire + frost + light;

  if (magic <= 0) return NO_ELEMENTAL_DAMAGE;

  const absorbed = absorbFrom(
    magic,
    MAGIC_ABSORB_SHARE,
    defender.absorbMagicLeft,
    puncture(attacker),
  );

  defender.absorbMagicLeft -= absorbed.absorbed;

  const kept = absorbed.damage / magic;

  return { fire: fire * kept, frost: frost * kept, light: light * kept };
};

const mainWeaponHit = (hit: Hit, damageScale: number) => {
  const { attacker, defender, plan, random } = hit;
  const a = attacker.combatant;
  const d = defender.combatant;

  const blocked =
    random() <
    blockChance(defender, attacker, plan.effect("active_decblock_per"));

  const pierceAttempted = !blocked && random() < a.pierce / 100;
  const pierceBlocked = pierceAttempted && random() < d.pierceBlock / 100;
  const pierced = pierceAttempted && !pierceBlocked;
  const blockFactor = blocked ? 1 - BLOCK_REDUCTION : 1;

  if (blocked) gainCombo(defender, d.comboGain.block);

  if (pierced) {
    attacker.pierced += 1;
    gainCombo(attacker, a.comboGain.pierce);
  }

  defender.armorLost += a.armorDestruction;

  const physical = Math.round(
    physicalDamage(hit, pierced, blockFactor) * damageScale,
  );

  const magic = magicDamage(hit, blockFactor);
  const fire = Math.round(magic.fire * damageScale);
  const frost = Math.round(magic.frost * damageScale);
  const light = Math.round(magic.light * damageScale);
  let wounded = false;

  if (physical + fire + frost + light > 0) {
    const poisonApplied = applyPoison(attacker, defender, plan);

    wounded = applyWound(attacker, defender, plan, poisonApplied, random);

    if (wounded) gainCombo(attacker, a.comboGain.wound);

    if (a.enemySlow > 0) defender.slowBySource.set(attacker.index, a.enemySlow);
  }

  return {
    physical,
    fire,
    frost,
    light,
    blocked: blocked
      ? Math.round(physical * (BLOCK_REDUCTION / (1 - BLOCK_REDUCTION)))
      : 0,
    pierced,
    pierceBlocked,
    wounded,
  };
};

const MISSED = {
  physical: 0,
  fire: 0,
  frost: 0,
  light: 0,
  blocked: 0,
  pierced: false,
  pierceBlocked: false,
  wounded: false,
};

const ANGUISH_TURNS = 5;

const cleanse = (defender: FighterState) => {
  defender.poison = null;
  defender.wound = null;
  defender.anguish = null;
  defender.slowBySource.clear();
  defender.critSlowTurns = 0;
};

const hasLingeringEffects = (defender: FighterState) =>
  defender.poison !== null ||
  defender.wound !== null ||
  defender.anguish !== null ||
  defender.slowBySource.size > 0 ||
  defender.critSlowTurns > 0;

const onHitEffects = (
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

  if (curse) defender.turnLost = true;

  if (glare) attacker.turnLost = true;

  if (anguish) {
    defender.anguish = {
      damage:
        a.anguish.damage * (1 + defender.combatant.damageTakenBonus / 100),
      turnsLeft: ANGUISH_TURNS,
    };
  }

  return { cleansed, curse, glare, anguish };
};

const NO_HIT_EFFECTS = {
  cleansed: false,
  curse: false,
  glare: false,
  anguish: false,
};

export const strike = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
): Strike => {
  const a = attacker.combatant;
  const d = defender.combatant;

  const damageScale =
    (1 - plan.effect("lowdmg_self") / 100) *
    (1 + buffTotal(attacker, "perdmg") / 100) *
    (1 + a.damageBonus / 100) *
    (1 + d.damageTakenBonus / 100);

  const ownCritChance = a.critChance + buffTotal(attacker, "active_crit");

  const veryCrit = chance(
    random,
    (a.legendary.verycrit * Math.max(0, ownCritChance)) / 100,
  );

  const critChance = Math.max(MIN_CRIT, ownCritChance - d.critReduction) / 100;

  const crit = veryCrit || random() < critChance;
  const critStrength = veryCrit ? VERY_CRIT_FACTOR : crit ? 1 : 0;

  const evaded =
    random() <
    evadeChance(defender, attacker, plan.effect("active_decevade_per"));

  const holyTouch = chance(random, a.legendary.holytouch);

  if (holyTouch) attacker.holyTouchTurns = HOLY_TOUCH_TURNS;

  attacker.hits += 1;

  if (crit) {
    attacker.crits += 1;
    gainCombo(attacker, a.comboGain.crit);
  }

  if (evaded) attacker.evaded += 1;

  const effects = evaded
    ? NO_HIT_EFFECTS
    : onHitEffects(attacker, defender, random);

  const armorBefore = currentArmor(defender);

  const main = evaded
    ? MISSED
    : mainWeaponHit(
        { attacker, defender, plan, crit: critStrength, random },
        damageScale,
      );

  const offhandRaw =
    a.offhand.max > 0
      ? armorReduced(
          roll(random, a.offhand) *
            (crit ? (critStrength * a.critValue) / 100 : 1),
          armorAgainst(defender, attacker),
        ) * damageScale
      : 0;

  const weaponDamage =
    main.physical + main.fire + main.frost + main.light + offhandRaw;

  const critred = crit ? d.legendary.critred : 0;
  const facade = weaponDamage > 0 ? d.legendary.facade : 0;
  const kept = (1 - critred / 100) * (1 - facade / 100);
  const keep = (value: number) => Math.round(value * kept);

  const comboDamage =
    plan.comboSpent > 0
      ? Math.round(
          ((plan.effect("combo_dmg_hpp-target") * plan.comboSpent) / 100) *
            d.hp *
            (1 + d.damageTakenBonus / 100),
        )
      : 0;

  const damage = {
    physical: keep(main.physical) + comboDamage,
    offhand: keep(offhandRaw),
    fire: keep(main.fire),
    frost: keep(main.frost),
    light: keep(main.light),
  };

  const total =
    damage.physical +
    damage.offhand +
    damage.fire +
    damage.frost +
    damage.light;

  if (crit && a.critSlow > 0) {
    defender.critSlowValue = a.critSlow;
    defender.critSlowTurns = 1;
  }

  defender.hp -= total;
  attacker.damageDealt += total;

  if (defender.hp < 1) {
    defender.alive = false;
    defender.hp = 0;
  }

  return {
    crit,
    veryCrit,
    ...effects,
    holyTouch,
    puncture: a.legendary.puncture,
    critred,
    facade,
    evaded,
    blocked: main.blocked,
    pierced: main.pierced,
    pierceBlocked: main.pierceBlocked,
    wounded: main.wounded,
    armorDestroyed: armorBefore - currentArmor(defender),
    damage,
  };
};

const applyPoison = (
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

const applyWound = (
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
