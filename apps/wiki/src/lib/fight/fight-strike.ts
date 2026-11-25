import {
  applyWeaponDamageOverTime,
  NO_WEAPON_WOUNDS,
  chance,
  counters,
  poisonWeakeningOf,
  weakeningFactor,
  debuffOnHit,
  enrage,
  ragePercent,
  NO_HIT_EFFECTS,
  NO_STUN,
  onHitEffects,
  parries,
  reflectFrom,
  stunOnHit,
  vampire,
} from "./fight-hit-effects";
import { rollCrit } from "./fight-crit";
import { takenDamageBonus, unavoidableDamage } from "./fight-unavoidable";
import {
  critValueBonus,
  magicDamage,
  magicStrength,
  physicalDamage,
  physicalStrength,
  type ElementalDamage,
  type Hit,
} from "./fight-damage";
import {
  armorAgainst,
  armorReduced,
  blockChance,
  currentArmor,
  destroyAbsorb,
  destroyArmor,
  destroyResistance,
  drain,
  evadeChance,
  isArmorBroken,
  NO_DRAIN,
  renewAbsorb,
  type Drained,
} from "./fight-defence";
import { buffTotal, gainCombo, type ActionPlan } from "./fight-skills";
import {
  arrowBlocks,
  crushOf,
  NO_THIRD_ATTACK,
  passiveTriggers,
  thirdAttack,
  vultureShare,
  type PassiveTriggers,
} from "./fight-passives";
import {
  isImmune,
  MELEE,
  randomPick,
  roll,
  takeDamage,
  type FighterState,
} from "./fight-state";

type StrikeDamage = ElementalDamage & {
  readonly physical: number;
  readonly offhand: number;
  readonly third: number;
};

type SwingHit = { readonly target: number; readonly damage: number };

export type Strike = {
  readonly rage: number;
  readonly crit: boolean;
  readonly offhandCrit: boolean;
  readonly veryCrit: boolean;
  readonly critSlow: number;
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
  readonly arrowBlocked: boolean;
  readonly countered: boolean;
  readonly blocked: number;
  readonly pierced: boolean;
  readonly pierceShown: boolean;
  readonly pierceBlocked: boolean;
  readonly wounds: {
    readonly main: boolean;
    readonly offhand: boolean;
    readonly halved: boolean;
  };
  readonly stun: boolean;
  readonly freeze: boolean;
  readonly immune: boolean;
  readonly armorDestroyed: number;
  readonly armorBroken: boolean;
  readonly armorDestructionReduction: number;
  readonly armorDestructionResisted: number;
  readonly critValueReduced: number;
  readonly enemyHealingCut: number;
  readonly resistanceDestroyed: number;
  readonly absorbDestroyed: number;
  readonly absorbed: number;
  readonly absorbedMagic: number;
  readonly absorbRenewed: number;
  readonly absorbMagicRenewed: number;
  readonly energyDrained: Drained;
  readonly manaDrained: Drained;
  readonly energyBurned: number;
  readonly takenBonus: number;
  readonly crush: number;
  readonly unavoidable: number;
  readonly vulture: number;
  readonly poisonWeakened: number;
  readonly triggers: PassiveTriggers;
  readonly reflected: number;
  readonly vamp: number | null;
  readonly swung: boolean;
  readonly swings: readonly SwingHit[];
  readonly strength: StrikeDamage;
  readonly damage: StrikeDamage;
};

const BLOCK_REDUCTION = 0.3;

const FROST_SLOW_TURNS = 3;

const SWING_TARGETS = 3;

const HOLY_TOUCH_TURNS = 3;

const LOWERED_PIERCE_FLOOR = 1;

export const pierceChance = (attacker: FighterState) => {
  const { pierce } = attacker.combatant;
  const lowered = buffTotal(attacker, "disturb_pierce", "stinkbomb_pierce");

  return lowered > 0
    ? Math.max(Math.min(pierce, LOWERED_PIERCE_FLOOR), pierce - lowered)
    : pierce;
};

const ENEMY_HEALING_CUT_TURNS = 2;

const cutEnemyHealing = (attacker: FighterState, defender: FighterState) => {
  const amount = attacker.combatant.enemyHealingCut;

  if (amount <= 0) return 0;

  defender.enemyHealingCut = {
    amount: Math.max(amount, defender.enemyHealingCut?.amount ?? 0),
    turnsLeft: ENEMY_HEALING_CUT_TURNS,
  };

  return amount;
};

const weaponWounds = (
  { attacker, defender, plan, random }: Hit,
  missed: boolean,
  landed: { readonly main: boolean; readonly offhand: boolean },
) => {
  if (missed) return NO_WEAPON_WOUNDS;

  const wounds = applyWeaponDamageOverTime(
    attacker,
    defender,
    plan,
    random,
    landed,
  );

  if (wounds.main || wounds.offhand) {
    gainCombo(attacker, attacker.combatant.comboGain.wound);
  }

  return wounds;
};

const cursedStatEffects = (
  attacker: FighterState,
  defender: FighterState,
  outcome: { missed: boolean; struck: boolean; anyCrit: boolean },
) => ({
  armorDestructionResisted: outcome.missed
    ? 0
    : Math.min(
        attacker.combatant.armorDestruction,
        defender.combatant.armorDestructionResist,
      ),
  critValueReduced: outcome.anyCrit ? defender.combatant.critValueReduction : 0,
  enemyHealingCut: outcome.struck ? cutEnemyHealing(attacker, defender) : 0,
});

const slowWithFrost = (
  defender: FighterState,
  slow: number,
  plan: ActionPlan,
) => {
  const current = defender.frostSlow;
  const boost = plan.effect("slowfreeze_per") / 100;

  const replaced = current === null || slow >= current.slow;

  defender.frostSlow = {
    slow: replaced ? slow : current.slow,
    turnsLeft: replaced ? FROST_SLOW_TURNS : current.turnsLeft,
    boost: boost > 0 ? boost : (current?.boost ?? 0),
    boostTurnsLeft:
      boost > 0 ? plan.turns("slowfreeze_per") : (current?.boostTurnsLeft ?? 0),
  };
};

const mainWeaponHit = (hit: Hit) => {
  const { attacker, defender, plan, random } = hit;
  const a = attacker.combatant;
  const d = defender.combatant;

  const blocked =
    random() <
    blockChance(defender, attacker, plan.effect("active_decblock_per"));

  const pierceRolled = random() < pierceChance(attacker) / 100;

  const pierceBlocked =
    pierceRolled && !defender.stunned && random() < d.pierceBlock / 100;

  const pierced = pierceRolled && !blocked && !pierceBlocked;
  const blockFactor = blocked ? 1 - BLOCK_REDUCTION : 1;

  if (blocked) gainCombo(defender, d.comboGain.block);

  if (pierced) gainCombo(attacker, a.comboGain.pierce);

  const itemArmorDestruction = destroyArmor(
    defender,
    Math.max(0, a.armorDestruction - d.armorDestructionResist) +
      (plan.effect("active_acdmg_per") / 100) * currentArmor(defender),
  );

  const resistanceDestroyed = destroyResistance(attacker, defender);
  const absorbDestroyed = destroyAbsorb(attacker, defender);
  const physicalHit = physicalDamage(hit, pierced, blockFactor);
  const magic = magicDamage(hit, pierced, blockFactor);

  const strength = {
    physical: Math.round(physicalHit.strength),
    fire: Math.round(magic.strength.fire),
    frost: Math.round(magic.strength.frost),
    light: Math.round(magic.strength.light),
  };

  const physical = Math.round(physicalHit.taken);
  const fire = Math.round(magic.taken.fire);
  const frost = Math.round(magic.taken.frost);
  const light = Math.round(magic.taken.light);
  const damaging = physical + fire + frost + light > 0;

  if (damaging && a.enemySlow > 0) {
    defender.slowBySource.set(attacker.index, a.enemySlow);
  }

  if (magic.strength.frost > 0 && a.frostSlow > 0) {
    slowWithFrost(defender, a.frostSlow, plan);
  }

  return {
    rolled: physicalHit.rolled,
    armorDestruction: Math.round(
      itemArmorDestruction + physicalHit.armorDestruction,
    ),
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
    pierceShown: pierceRolled && !pierceBlocked,
    pierceBlocked,
    damaging,
    resistanceDestroyed,
    absorbed: Math.round(physicalHit.absorbed),
    absorbedMagic: Math.round(magic.absorbed),
    absorbDestroyed,
  };
};

const MISSED = {
  armorDestruction: 0,
  physical: 0,
  fire: 0,
  frost: 0,
  light: 0,
  blocked: 0,
  pierced: false,
  pierceShown: false,
  pierceBlocked: false,
  damaging: false,
  resistanceDestroyed: 0,
  absorbDestroyed: 0,
  absorbed: 0,
  absorbedMagic: 0,
};

const missedHit = (hit: Hit) => {
  const physical = physicalStrength(hit);
  const magic = magicStrength(hit);

  return {
    ...MISSED,
    rolled: physical.rolled,
    pierceShown: hit.random() < pierceChance(hit.attacker) / 100,
    strength: {
      physical: Math.round(physical.strength),
      fire: Math.round(magic.fire),
      frost: Math.round(magic.frost),
      light: Math.round(magic.light),
    },
  };
};

const swingAt = (
  attacker: FighterState,
  others: readonly FighterState[],
  random: () => number,
) => {
  const a = attacker.combatant;

  const targets = randomPick(
    others.filter((other) => other.alive),
    SWING_TARGETS,
    random,
  );

  return targets.map((other) => {
    const damage = isImmune(other)
      ? 0
      : Math.round(
          armorReduced(
            roll(random, a.physical) *
              (1 + a.physicalBonus / 100) *
              weakeningFactor(attacker, other),
            armorAgainst(other, attacker),
          ),
        );

    takeDamage(other, damage);
    attacker.damageDealt += damage;

    return { target: other.index, damage };
  });
};

const damageScaleOf = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
) =>
  (1 - plan.effect("lowdmg_self") / 100) *
  (1 + buffTotal(attacker, "perdmg", "perdmg-allies") / 100) *
  weakeningFactor(attacker, defender);

const NO_OFFHAND = {
  crit: false,
  veryCrit: false,
  strength: 0,
  taken: 0,
};

const offhandHit = (hit: Hit, mainParried: boolean) => {
  const { attacker, defender, random } = hit;
  const a = attacker.combatant;

  if (a.offhand.max <= 0) return NO_OFFHAND;

  const crit = rollCrit(attacker, defender, random, a.offhandCritChance);

  const critFactor =
    crit.strength > 0
      ? (crit.strength *
          (a.offhandCritValue + critValueBonus(attacker, defender))) /
        100
      : 1;

  const strength =
    roll(random, a.offhand) *
    (1 + a.physicalBonus / 100) *
    critFactor *
    hit.scale;

  const parried = !mainParried && parries(attacker, defender, random);

  return {
    crit: crit.crit,
    veryCrit: crit.veryCrit,
    strength,
    taken: parried
      ? 0
      : armorReduced(strength, armorAgainst(defender, attacker)),
  };
};

const rollAttemptEffects = (
  attacker: FighterState,
  random: () => number,
  crit: boolean,
) => {
  const a = attacker.combatant;
  const holyTouch = chance(random, a.legendary.holytouch);

  if (holyTouch) attacker.holyTouchTurns = HOLY_TOUCH_TURNS;

  if (crit) gainCombo(attacker, a.comboGain.crit);

  return holyTouch;
};

type Landing = {
  crit: boolean;
  struck: boolean;
  dealt: number;
  extra: number;
  blocked: boolean;
  frost: number;
};

const land = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
  { crit, struck, dealt, extra, blocked, frost }: Landing,
) => {
  const critSlow = crit ? attacker.combatant.critSlow : 0;

  if (critSlow > 0) {
    defender.critSlowValue = critSlow;
    defender.critSlowTurns = 1;
  }

  if (crit && dealt > 0) enrage(defender);

  const stunned =
    struck && dealt > 0 && !blocked
      ? stunOnHit(defender, plan, random, frost)
      : NO_STUN;

  const energyBurned = struck ? debuffOnHit(attacker, defender, plan) : 0;

  takeDamage(defender, dealt + extra);
  attacker.damageDealt += dealt + extra;

  return { ...stunned, energyBurned, critSlow };
};

const NOT_LANDED = {
  renewed: { absorb: 0, absorbMagic: 0 },
  energyDrained: NO_DRAIN,
  manaDrained: NO_DRAIN,
};

const afterLanding = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
) => ({
  renewed: renewAbsorb(attacker),
  energyDrained: drain(
    attacker,
    "energy",
    defender.combatant.energyDrain,
    random,
  ),
  manaDrained: drain(attacker, "mana", defender.combatant.manaDrain, random),
});

const swingsAround = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
) =>
  defender.alive &&
  MELEE.has(attacker.combatant.profession) &&
  chance(random, attacker.combatant.swingChance);

const showOnce = (
  attacker: FighterState,
  defender: FighterState,
  facade: number,
) => {
  const shown = {
    puncture: attacker.punctureShown
      ? 0
      : attacker.combatant.legendary.puncture,
    facade: defender.facadeShown ? 0 : facade,
  };

  attacker.punctureShown = true;

  if (facade > 0) defender.facadeShown = true;

  return shown;
};

const rollMisses = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
) => {
  const evaded =
    random() <
    evadeChance(defender, attacker, plan.effect("active_decevade_per"));

  const parried = !evaded && parries(attacker, defender, random);

  const arrowBlocked =
    !evaded && !parried && arrowBlocks(attacker, defender, random);

  return {
    evaded,
    parried,
    arrowBlocked,
    missed: evaded || parried || arrowBlocked,
  };
};

type WeaponHits = {
  readonly main: ReturnType<typeof mainWeaponHit>;
  readonly offhand: { readonly strength: number; readonly taken: number };
  readonly third: { readonly strength: number; readonly taken: number };
};

const defendedDamage = (
  defender: FighterState,
  { main, offhand, third }: WeaponHits,
  { anyCrit, immune }: { anyCrit: boolean; immune: boolean },
) => {
  const { legendary } = defender.combatant;
  const thirdTaken = third.taken;

  const weaponDamage =
    main.physical +
    main.fire +
    main.frost +
    main.light +
    offhand.taken +
    thirdTaken;

  const critred = anyCrit ? legendary.critred : 0;
  const facade = weaponDamage > 0 ? legendary.facade : 0;
  const kept = (1 - critred / 100) * (1 - facade / 100);
  const keep = (value: number) => Math.round(value * kept);

  const unshielded = {
    physical: keep(main.physical),
    offhand: keep(offhand.taken),
    fire: keep(main.fire),
    frost: keep(main.frost),
    light: keep(main.light),
    third: keep(thirdTaken),
  };

  const total = (parts: StrikeDamage) =>
    Object.values(parts).reduce((sum, value) => sum + value, 0);

  const damage = immune ? NO_STRIKE_DAMAGE : unshielded;

  return {
    critred,
    facade,
    damage,
    unshielded,
    dealt: total(damage),
    unshieldedDealt: total(unshielded),
    done:
      main.strength.physical +
      main.strength.fire +
      main.strength.frost +
      main.strength.light +
      offhand.strength +
      third.strength,
  };
};

const NO_CRUSH = { value: 0, damage: 0 };

const NO_STRIKE_DAMAGE: StrikeDamage = {
  physical: 0,
  offhand: 0,
  fire: 0,
  frost: 0,
  light: 0,
  third: 0,
};

export const strike = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
  others: readonly FighterState[] = [],
  counterable = true,
): Strike => {
  const a = attacker.combatant;
  const d = defender.combatant;
  const scale = damageScaleOf(attacker, defender, plan);

  const { crit, veryCrit, strength } = rollCrit(
    attacker,
    defender,
    random,
    a.critChance,
  );

  const { evaded, parried, arrowBlocked, missed } = rollMisses(
    attacker,
    defender,
    plan,
    random,
  );

  const holyTouch = rollAttemptEffects(attacker, random, crit);

  const effects = missed
    ? NO_HIT_EFFECTS
    : onHitEffects(attacker, defender, random);

  const lostBefore = defender.armorLost;
  const brokenBefore = isArmorBroken(defender);
  const vulture = vultureShare(attacker, defender);
  const rage = ragePercent(attacker) / 100;

  const hit = {
    attacker,
    defender,
    plan,
    crit: strength,
    scale,
    vulture,
    rage,
    random,
  };

  const main = missed ? missedHit(hit) : mainWeaponHit(hit);
  const offhand = offhandHit(hit, parried);

  const third = arrowBlocked
    ? NO_THIRD_ATTACK
    : thirdAttack(attacker, defender, random, scale);

  const wounds = weaponWounds(hit, missed, {
    main: main.damaging,
    offhand: offhand.taken > 0,
  });

  const anyCrit = crit || offhand.crit;
  const immune = isImmune(defender);
  const struck = !missed && !immune;

  const cursed = cursedStatEffects(attacker, defender, {
    missed,
    struck,
    anyCrit,
  });

  const { critred, facade, damage, unshielded, dealt, unshieldedDealt, done } =
    defendedDamage(defender, { main, offhand, third }, { anyCrit, immune });

  const takenBonus =
    immune || arrowBlocked
      ? 0
      : takenDamageBonus(
          defender,
          main.strength.physical +
            main.strength.fire +
            main.strength.frost +
            main.strength.light,
          [offhand, third],
          missed,
        );

  const crush = struck
    ? crushOf(attacker, main.strength.physical, damage.physical)
    : NO_CRUSH;

  const unavoidable = unavoidableDamage(attacker, takenBonus + crush.damage);

  const { stun, freeze, energyBurned, critSlow } = land(
    attacker,
    defender,
    plan,
    random,
    {
      crit: anyCrit,
      struck,
      dealt,
      extra: unavoidable,
      blocked: main.blocked > 0,
      frost: main.frost,
    },
  );

  const landed = struck ? afterLanding(attacker, defender, random) : NOT_LANDED;
  const armorDestroyed = brokenBefore ? 0 : main.armorDestruction;

  const triggers = passiveTriggers(attacker, defender, random, {
    crit: anyCrit,
    struck,
    landed: !missed,
    mainTaken: unshielded.physical,
    dealt,
    pierced: main.pierced,
    armorDestroyed,
  });

  const reflected = reflectFrom(attacker, defender, done, random);
  const vamp = vampire(attacker, unshieldedDealt);
  const swung = swingsAround(attacker, defender, random);
  const swings = swung ? swingAt(attacker, others, random) : [];
  const shown = showOnce(attacker, defender, facade);
  const destroyed = defender.armorLost - lostBefore;
  const reduction = d.armorDestructionReduction;

  return {
    rage: Math.round(rage * main.rolled),
    crit,
    offhandCrit: offhand.crit,
    veryCrit: veryCrit || offhand.veryCrit,
    critSlow,
    ...effects,
    holyTouch,
    puncture: shown.puncture,
    critred,
    facade: shown.facade,
    evaded,
    parried,
    arrowBlocked,
    countered: counterable && counters(defender, random, anyCrit, parried),
    blocked: main.blocked,
    pierced: main.pierced,
    pierceShown: main.pierceShown,
    pierceBlocked: main.pierceBlocked,
    wounds,
    stun,
    freeze,
    immune: immune && !missed,
    armorDestroyed,
    armorBroken: !brokenBefore && isArmorBroken(defender),
    armorDestructionReduction: destroyed > 0 ? reduction : 0,
    ...cursed,
    resistanceDestroyed: main.resistanceDestroyed,
    absorbed: main.absorbed,
    absorbedMagic: main.absorbedMagic,
    absorbDestroyed: main.absorbDestroyed,
    absorbRenewed: landed.renewed.absorb,
    absorbMagicRenewed: landed.renewed.absorbMagic,
    energyDrained: landed.energyDrained,
    manaDrained: landed.manaDrained,
    energyBurned,
    takenBonus,
    crush: crush.value,
    unavoidable,
    vulture: Math.round(main.strength.physical * (vulture / (1 + vulture))),
    poisonWeakened: poisonWeakeningOf(attacker),
    triggers,
    reflected,
    vamp,
    swung,
    swings,
    strength: {
      ...main.strength,
      offhand: Math.round(offhand.strength),
      third: Math.round(third.strength),
    },
    damage,
  };
};
