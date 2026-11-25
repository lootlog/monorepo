import {
  applyPoison,
  applyWound,
  chance,
  counters,
  debuffOnHit,
  enrage,
  NO_HIT_EFFECTS,
  NO_STUN,
  onHitEffects,
  parries,
  reflectFrom,
  stunOnHit,
  vampire,
} from "./fight-hit-effects";
import { buffTotal, gainCombo, type ActionPlan } from "./fight-skills";
import {
  clamp,
  isImmune,
  MAX_RESISTANCE,
  MELEE,
  takeDamage,
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

type SwingHit = { readonly target: number; readonly damage: number };

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
  readonly parried: boolean;
  readonly countered: boolean;
  readonly blocked: number;
  readonly pierced: boolean;
  readonly pierceBlocked: boolean;
  readonly wounded: boolean;
  readonly stun: boolean;
  readonly freeze: boolean;
  readonly immune: boolean;
  readonly armorDestroyed: number;
  readonly armorDestructionReduction: number;
  readonly takenBonus: number;
  readonly reflected: number;
  readonly vamp: number;
  readonly swings: readonly SwingHit[];
  readonly strength: StrikeDamage;
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

const FROST_SLOW_TURNS = 2;

const SWING_TARGETS = 3;

const SHIELD_BEARERS: ReadonlySet<Profession> = new Set(["w", "p"]);

const UNAVOIDABLE: ReadonlySet<Profession> = new Set(["m"]);

const VERY_CRIT_FACTOR = 1.75;

const HOLY_TOUCH_TURNS = 3;

const puncture = (attacker: FighterState) =>
  attacker.combatant.legendary.puncture / 100;

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

const cappedChance = (percent: number) =>
  clamp(percent, 0, MAX_EVADE_OR_BLOCK) / 100;

const evadeChance = (
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

  const chance =
    (points * EVADE_OR_BLOCK_PER_POINT) /
    Math.min(attacker.combatant.level, LEVEL_CAP_FOR_CHANCES);

  return cappedChance(chance - activeReduction);
};

const blockChance = (
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

const currentArmor = (defender: FighterState) =>
  Math.max(
    ARMOR_FLOOR * defender.combatant.armor,
    defender.combatant.armor - defender.armorLost,
  ) + bonusArmor(defender);

const armorAgainst = (defender: FighterState, attacker: FighterState) =>
  currentArmor(defender) * (1 - puncture(attacker));

const destroyArmor = (defender: FighterState, amount: number) => {
  defender.armorLost +=
    amount * (1 - defender.combatant.armorDestructionReduction / 100);
};

export const elementResistance = (
  defender: FighterState,
  base: number,
  buffKey: string,
) =>
  clamp(
    base + buffTotal(defender, buffKey) + buffTotal(defender, "aura-resall"),
    0,
    MAX_RESISTANCE,
  ) / 100;

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

const critValue = (attacker: FighterState) =>
  attacker.combatant.critValue +
  buffTotal(attacker, "critval-allies", "critval-enemies");

const critMagicValue = (attacker: FighterState) =>
  attacker.combatant.critMagicValue +
  buffTotal(attacker, "critmval-allies", "critmval-enemies");

const physicalStrength = ({ attacker, plan, crit, random }: Hit) =>
  roll(random, attacker.combatant.physical) *
  (1 + plan.effect("adddmg_physical-perw") / 100) *
  (1 + buffTotal(attacker, "aura-adddmg2_per-meele_physical") / 100) *
  (1 + attacker.combatant.physicalBonus / 100) *
  (crit > 0 ? (crit * critValue(attacker)) / 100 : 1);

const magicStrength = ({ attacker, defender, plan, crit, random }: Hit) => {
  const a = attacker.combatant;

  const lightRamp = Math.min(
    LIGHT_RAMP_MAX,
    LIGHT_RAMP_PER_ATTACK * (attacker.lightAttacks.get(defender.index) ?? 0),
  );

  const magicCrit = crit > 0 ? (crit * critMagicValue(attacker)) / 100 : 1;

  const rolled = (range: DamageRange, bonus: number) =>
    range.max <= 0 ? 0 : roll(random, range) * (1 + bonus) * magicCrit;

  return {
    fire: rolled(a.fire, plan.effect("adddmg_fire-perw") / 100),
    frost: rolled(a.frost, 0),
    light: rolled(a.light, lightRamp),
  };
};

const physicalDamage = (hit: Hit, pierced: boolean, blockFactor: number) => {
  const { attacker, defender, plan } = hit;
  const a = attacker.combatant;
  const strength = physicalStrength(hit);

  destroyArmor(
    defender,
    (plan.effect("active_acdmg_physical-perw") / 100) * strength,
  );

  const raw = strength * blockFactor;

  const reduced = pierced
    ? raw
    : armorReduced(raw, armorAgainst(defender, attacker));

  if (!MELEE.has(a.profession) || reduced <= 0) {
    return { strength, taken: reduced };
  }

  const absorbed = absorbFrom(
    reduced,
    PHYSICAL_ABSORB_SHARE,
    defender.absorbLeft,
    puncture(attacker),
  );

  defender.absorbLeft -= absorbed.absorbed;

  return { strength, taken: absorbed.damage };
};

const NO_ELEMENTAL_DAMAGE: ElementalDamage = { fire: 0, frost: 0, light: 0 };

const magicDamage = (hit: Hit, blockFactor: number) => {
  const { attacker, defender, plan } = hit;
  const d = defender.combatant;
  const armor = armorAgainst(defender, attacker);
  const strength = magicStrength(hit);

  if (attacker.combatant.light.max > 0) {
    attacker.lightAttacks.set(
      defender.index,
      (attacker.lightAttacks.get(defender.index) ?? 0) +
        1 +
        plan.effect("active_add_light_cumulaction"),
    );
  }

  const taken = (value: number, base: number, buffKey: string) =>
    value <= 0
      ? 0
      : armorReduced(value * blockFactor, MAGIC_ARMOR_FACTOR * armor) *
        (1 - (elementResistance(defender, base, buffKey) - puncture(attacker)));

  const fire = taken(strength.fire, d.resistFire, "resfire_per");
  const frost = taken(strength.frost, d.resistFrost, "resfrost_per");
  const light = taken(strength.light, d.resistLight, "reslight_per");
  const magic = fire + frost + light;

  if (magic <= 0) return { strength, taken: NO_ELEMENTAL_DAMAGE };

  const absorbed = absorbFrom(
    magic,
    MAGIC_ABSORB_SHARE,
    defender.absorbMagicLeft,
    puncture(attacker),
  );

  defender.absorbMagicLeft -= absorbed.absorbed;

  const kept = absorbed.damage / magic;

  return {
    strength,
    taken: { fire: fire * kept, frost: frost * kept, light: light * kept },
  };
};

type DamageScale = {
  readonly dealt: number;
  readonly taken: number;
};

const pierceChance = (attacker: FighterState) =>
  Math.max(
    0,
    attacker.combatant.pierce -
      buffTotal(attacker, "disturb_pierce", "stinkbomb_pierce"),
  );

const mainWeaponHit = (hit: Hit, scale: DamageScale) => {
  const { attacker, defender, plan, random } = hit;
  const a = attacker.combatant;
  const d = defender.combatant;

  const blocked =
    random() <
    blockChance(defender, attacker, plan.effect("active_decblock_per"));

  const pierceAttempted = !blocked && random() < pierceChance(attacker) / 100;
  const pierceBlocked = pierceAttempted && random() < d.pierceBlock / 100;
  const pierced = pierceAttempted && !pierceBlocked;
  const blockFactor = blocked ? 1 - BLOCK_REDUCTION : 1;

  if (blocked) gainCombo(defender, d.comboGain.block);

  if (pierced) {
    attacker.pierced += 1;
    gainCombo(attacker, a.comboGain.pierce);
  }

  destroyArmor(
    defender,
    a.armorDestruction +
      (plan.effect("active_acdmg_per") / 100) * currentArmor(defender),
  );

  const physicalHit = physicalDamage(hit, pierced, blockFactor);
  const magic = magicDamage(hit, blockFactor);
  const dealt = (value: number) => Math.round(value * scale.dealt);
  const taken = (value: number) => Math.round(value * scale.taken);

  const strength = {
    physical: dealt(physicalHit.strength),
    fire: dealt(magic.strength.fire),
    frost: dealt(magic.strength.frost),
    light: dealt(magic.strength.light),
  };

  const physical = taken(physicalHit.taken);
  const fire = taken(magic.taken.fire);
  const frost = taken(magic.taken.frost);
  const light = taken(magic.taken.light);
  let wounded = false;

  if (physical + fire + frost + light > 0) {
    const poisonApplied = applyPoison(attacker, defender, plan);

    wounded = applyWound(attacker, defender, plan, poisonApplied, random);

    if (wounded) gainCombo(attacker, a.comboGain.wound);

    if (a.enemySlow > 0) defender.slowBySource.set(attacker.index, a.enemySlow);

    if (frost > 0 && a.frostSlow > 0) {
      defender.frostSlow = {
        slow: a.frostSlow,
        boost: plan.effect("slowfreeze_per") / 100,
        turnsLeft: Math.max(FROST_SLOW_TURNS, plan.turns("slowfreeze_per")),
      };
    }
  }

  return {
    strength,
    physical,
    fire,
    frost,
    light,
    blocked: blocked
      ? Math.round(
          BLOCK_REDUCTION *
            (strength.physical +
              strength.fire +
              strength.frost +
              strength.light),
        )
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

const missedHit = (hit: Hit, scale: DamageScale) => {
  const dealt = (value: number) => Math.round(value * scale.dealt);
  const physical = physicalStrength(hit);
  const magic = magicStrength(hit);

  return {
    ...MISSED,
    strength: {
      physical: dealt(physical),
      fire: dealt(magic.fire),
      frost: dealt(magic.frost),
      light: dealt(magic.light),
    },
  };
};

const swingAt = (
  attacker: FighterState,
  others: readonly FighterState[],
  plan: ActionPlan,
  random: () => number,
  killed: boolean,
) => {
  const flatShare = plan.effect("dmg-swing_absolute-perw") / 100;
  const swings = !killed && chance(random, plan.effect("swing"));

  if (flatShare <= 0 && !swings) return [];

  const a = attacker.combatant;
  const candidates = others.filter((other) => other.alive);
  const targets: FighterState[] = [];

  while (targets.length < SWING_TARGETS && candidates.length > 0) {
    targets.push(
      ...candidates.splice(Math.floor(random() * candidates.length), 1),
    );
  }

  return targets.map((other) => {
    const flat = roll(random, a.physical) * flatShare;

    const swing = swings
      ? armorReduced(roll(random, a.physical), armorAgainst(other, attacker))
      : 0;

    const damage = isImmune(other)
      ? 0
      : Math.round((flat + swing) * (1 + a.physicalBonus / 100));

    takeDamage(other, damage);
    attacker.damageDealt += damage;

    return { target: other.index, damage };
  });
};

const damageScaleOf = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
): DamageScale => {
  const lowered = buffTotal(
    attacker,
    "lowdmg_enemy",
    "combo_lowdmg_enemy",
    "alllowdmg",
  );

  const dealt =
    (1 - plan.effect("lowdmg_self") / 100) *
    (1 +
      (buffTotal(attacker, "perdmg", "perdmg-allies") +
        buffTotal(attacker, "rage")) /
        100) *
    (1 + attacker.combatant.damageBonus / 100) *
    Math.max(0, 1 - lowered / 100);

  return {
    dealt,
    taken: dealt * (1 + defender.combatant.damageTakenBonus / 100),
  };
};

const rollCrit = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
) => {
  const a = attacker.combatant;

  const ownCritChance =
    a.critChance + buffTotal(attacker, "active_crit", "active_crit-allies");

  const veryCrit = chance(
    random,
    (a.legendary.verycrit * Math.max(0, ownCritChance)) / 100,
  );

  const critChance =
    Math.max(
      MIN_CRIT,
      ownCritChance -
        buffTotal(attacker, "disturb_crit", "stinkbomb_crit") -
        defender.combatant.critReduction,
    ) / 100;

  const crit = veryCrit || random() < critChance;

  return {
    crit,
    veryCrit,
    strength: veryCrit ? VERY_CRIT_FACTOR : crit ? 1 : 0,
  };
};

const offhandHit = (hit: Hit, scale: DamageScale, mainParried: boolean) => {
  const { attacker, defender, crit, random } = hit;
  const { offhand } = attacker.combatant;

  if (offhand.max <= 0) return { strength: 0, taken: 0 };

  const rolled =
    roll(random, offhand) * (crit > 0 ? (crit * critValue(attacker)) / 100 : 1);

  const parried = !mainParried && parries(attacker, defender, random);

  return {
    strength: rolled * scale.dealt,
    taken: parried
      ? 0
      : armorReduced(rolled, armorAgainst(defender, attacker)) * scale.taken,
  };
};

const countAttempt = (
  attacker: FighterState,
  random: () => number,
  crit: boolean,
  evaded: boolean,
) => {
  const a = attacker.combatant;
  const holyTouch = chance(random, a.legendary.holytouch);

  if (holyTouch) attacker.holyTouchTurns = HOLY_TOUCH_TURNS;

  attacker.hits += 1;

  if (crit) {
    attacker.crits += 1;
    gainCombo(attacker, a.comboGain.crit);
  }

  if (evaded) attacker.evaded += 1;

  return holyTouch;
};

type Landing = {
  crit: boolean;
  struck: boolean;
  dealt: number;
  takenBonus: number;
  blocked: boolean;
  frost: number;
};

const land = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
  { crit, struck, dealt, takenBonus, blocked, frost }: Landing,
) => {
  const { critSlow } = attacker.combatant;

  if (crit && critSlow > 0) {
    defender.critSlowValue = critSlow;
    defender.critSlowTurns = 1;
  }

  if (crit && dealt > 0) enrage(defender);

  const stunned =
    struck && dealt > 0 && !blocked
      ? stunOnHit(defender, plan, random, frost)
      : NO_STUN;

  if (struck) debuffOnHit(attacker, defender, plan);

  takeDamage(defender, dealt + takenBonus);
  attacker.damageDealt += dealt + takenBonus;

  return stunned;
};

export const strike = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
  others: readonly FighterState[] = [],
): Strike => {
  const a = attacker.combatant;
  const d = defender.combatant;
  const scale = damageScaleOf(attacker, defender, plan);
  const { crit, veryCrit, strength } = rollCrit(attacker, defender, random);

  const evaded =
    random() <
    evadeChance(defender, attacker, plan.effect("active_decevade_per"));

  const parried = !evaded && parries(attacker, defender, random);
  const missed = evaded || parried;
  const holyTouch = countAttempt(attacker, random, crit, evaded);

  const effects = missed
    ? NO_HIT_EFFECTS
    : onHitEffects(attacker, defender, random);

  const armorBefore = currentArmor(defender);
  const lostBefore = defender.armorLost;
  const hit = { attacker, defender, plan, crit: strength, random };
  const main = missed ? missedHit(hit, scale) : mainWeaponHit(hit, scale);
  const offhand = offhandHit(hit, scale, parried);

  const weaponDamage =
    main.physical + main.fire + main.frost + main.light + offhand.taken;

  const critred = crit ? d.legendary.critred : 0;
  const facade = weaponDamage > 0 ? d.legendary.facade : 0;
  const kept = (1 - critred / 100) * (1 - facade / 100);
  const immune = isImmune(defender);
  const keep = (value: number) => (immune ? 0 : Math.round(value * kept));
  const struck = !missed && !immune;

  const done =
    main.strength.physical +
    main.strength.fire +
    main.strength.frost +
    main.strength.light +
    offhand.strength;

  const takenBonus = struck
    ? Math.round(
        (done * buffTotal(defender, "taken_dmg_per", "taken_dmg_per-all")) /
          100,
      )
    : 0;

  const damage = {
    physical: keep(main.physical),
    offhand: keep(offhand.taken),
    fire: keep(main.fire),
    frost: keep(main.frost),
    light: keep(main.light),
  };

  const dealt =
    damage.physical +
    damage.offhand +
    damage.fire +
    damage.frost +
    damage.light;

  const { stun, freeze } = land(attacker, defender, plan, random, {
    crit,
    struck,
    dealt,
    takenBonus,
    blocked: main.blocked > 0,
    frost: main.frost,
  });

  const reflected = reflectFrom(attacker, defender, done, random);
  const vamp = vampire(attacker, dealt);

  const swings = evaded
    ? []
    : swingAt(attacker, others, plan, random, !defender.alive);

  const armorDestroyed = armorBefore - currentArmor(defender);
  const destroyed = defender.armorLost - lostBefore;
  const reduction = d.armorDestructionReduction;

  return {
    crit,
    veryCrit,
    ...effects,
    holyTouch,
    puncture: a.legendary.puncture,
    critred,
    facade,
    evaded,
    parried,
    countered: counters(defender, random, crit && dealt > 0, parried),
    blocked: main.blocked,
    pierced: main.pierced,
    pierceBlocked: main.pierceBlocked,
    wounded: main.wounded,
    stun,
    freeze,
    immune: immune && !missed,
    armorDestroyed,
    armorDestructionReduction: destroyed > 0 ? reduction : 0,
    takenBonus,
    reflected,
    vamp,
    swings,
    strength: {
      ...main.strength,
      offhand: Math.round(offhand.strength),
    },
    damage,
  };
};
