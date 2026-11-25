import {
  applyWeaponDamageOverTime,
  NO_WEAPON_WOUNDS,
  chance,
  cleanseOnHit,
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
  MIN_CRIT_VALUE,
  physicalDamage,
  physicalStrength,
  type ElementalDamage,
  type Hit,
} from "./fight-damage";
import {
  armorAgainst,
  armorReduced,
  blockChance,
  destroyAbsorb,
  destroyAbsorbShare,
  destroyArmor,
  destroyResistance,
  drain,
  evadeChance,
  isArmorBroken,
  NO_ABSORB_SHARE_DESTROYED,
  NO_DRAIN,
  renewAbsorb,
  type Drained,
} from "./fight-defence";
import { buffTotal, gainCombo, type ActionPlan } from "./fight-skills";
import { swingAt, swingsAround, type SwingHit } from "./fight-swing";
import {
  arrowBlocks,
  crushOf,
  NO_THIRD_ATTACK,
  passiveTriggers,
  thirdAttack,
  vultureShare,
  type PassiveTriggers,
} from "./fight-passives";
import { isImmune, roll, takeDamage, type FighterState } from "./fight-state";

type StrikeDamage = ElementalDamage & {
  readonly physical: number;
  readonly offhand: number;
  readonly third: number;
};

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
  readonly absorbShareDestroyed: {
    readonly absorb: number;
    readonly absorbMagic: number;
  };
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
  landed: { readonly main: boolean; readonly offhand: boolean },
) => {
  if (!landed.main && !landed.offhand) return NO_WEAPON_WOUNDS;

  const wounds = applyWeaponDamageOverTime(
    attacker,
    defender,
    plan,
    random,
    landed,
  );

  gainCombo(
    attacker,
    attacker.combatant.comboGain.wound *
      ((wounds.main ? 1 : 0) + (wounds.offhand ? 1 : 0)),
  );

  return wounds;
};

const cursedStatEffects = (
  attacker: FighterState,
  defender: FighterState,
  outcome: { missed: boolean; anyCrit: boolean },
) => ({
  armorDestructionResisted: outcome.missed
    ? 0
    : Math.min(
        attacker.combatant.armorDestruction,
        defender.combatant.armorDestructionResist,
      ),
  critValueReduced: outcome.anyCrit ? defender.combatant.critValueReduction : 0,
  enemyHealingCut: outcome.missed ? 0 : cutEnemyHealing(attacker, defender),
});

const slowWithFrost = (
  defender: FighterState,
  source: number,
  slow: number,
  plan: ActionPlan,
) => {
  const current = defender.frostSlow;
  const boost = plan.effect("slowfreeze_per") / 100;

  const replaced = current === null || slow >= current.slow;

  defender.frostSlow = {
    source: replaced ? source : current.source,
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
      (plan.effect("active_acdmg_per") / 100) * d.armor,
  );

  const resistanceDestroyed = destroyResistance(attacker, defender);
  const absorbDestroyed = destroyAbsorb(attacker, defender);

  const absorbShareDestroyed = destroyAbsorbShare(
    defender,
    plan.effect("active_absorbdest_per"),
  );

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
    slowWithFrost(defender, attacker.index, a.frostSlow, plan);
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
      ? [strength.physical, strength.fire, strength.frost, strength.light]
          .map((part) => Math.round(BLOCK_REDUCTION * part))
          .reduce((total, part) => total + part, 0)
      : 0,
    pierced,
    pierceShown: pierceRolled && !pierceBlocked,
    pierceBlocked,
    damaging,
    resistanceDestroyed,
    absorbed: Math.round(physicalHit.absorbed),
    absorbedMagic: Math.round(magic.absorbed),
    absorbDestroyed,
    absorbShareDestroyed,
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
  absorbShareDestroyed: NO_ABSORB_SHARE_DESTROYED,
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
  parried: false,
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
          Math.max(
            MIN_CRIT_VALUE,
            a.offhandCritValue + critValueBonus(attacker, defender),
          )) /
        100
      : 1;

  const strength = roll(random, a.offhand) * critFactor * hit.scale;

  const parried = !mainParried && parries(attacker, defender, random);

  return {
    crit: crit.crit,
    veryCrit: crit.veryCrit,
    parried,
    strength,
    taken: parried
      ? 0
      : armorReduced(strength, armorAgainst(defender, attacker)),
  };
};

const gainCritCombo = (
  attacker: FighterState,
  crit: boolean,
  offhandCrit: boolean,
) =>
  gainCombo(
    attacker,
    attacker.combatant.comboGain.crit *
      ((crit ? 1 : 0) + (offhandCrit ? 1 : 0)),
  );

const rollHolyTouch = (attacker: FighterState, random: () => number) => {
  const holyTouch = chance(random, attacker.combatant.legendary.holytouch);

  if (holyTouch) attacker.holyTouchTurns = HOLY_TOUCH_TURNS;

  return holyTouch;
};

type Landing = {
  crit: boolean;
  landed: boolean;
  dealt: number;
  defended: number;
  extra: number;
  blocked: boolean;
  frost: boolean;
};

const land = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
  random: () => number,
  { crit, landed, dealt, defended, extra, blocked, frost }: Landing,
) => {
  const critSlow = crit ? attacker.combatant.critSlow : 0;

  if (critSlow > 0) {
    defender.critSlowValue = critSlow;
    defender.critSlowTurns = 1;
  }

  if (crit && dealt > 0) enrage(defender);

  const stunned =
    landed && !blocked
      ? stunOnHit(defender, plan, random, { damaging: defended > 0, frost })
      : NO_STUN;

  const energyBurned = landed ? debuffOnHit(attacker, defender, plan) : 0;

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

const showOnce = (
  attacker: FighterState,
  defender: FighterState,
  { facade, armorDestroyed }: { facade: number; armorDestroyed: boolean },
) => {
  const armorProtected =
    armorDestroyed && !defender.armorProtectionShownTo.has(attacker.index);

  const shown = {
    puncture: attacker.punctureShown
      ? 0
      : attacker.combatant.legendary.puncture,
    facade: defender.facadeShown ? 0 : facade,
    armorDestructionReduction: armorProtected
      ? defender.combatant.armorDestructionReduction
      : 0,
  };

  attacker.punctureShown = true;

  if (facade > 0) defender.facadeShown = true;

  if (armorProtected) defender.armorProtectionShownTo.add(attacker.index);

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

  const holyTouch = rollHolyTouch(attacker, random);

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

  const wounds = weaponWounds(hit, {
    main: main.damaging,
    offhand: offhand.taken > 0,
  });

  gainCritCombo(attacker, crit, offhand.crit);

  const anyCrit = crit || offhand.crit;
  const anyParried = parried || offhand.parried;
  const immune = isImmune(defender);
  const struck = !missed && !immune;
  const cursed = cursedStatEffects(attacker, defender, { missed, anyCrit });

  const { critred, facade, damage, unshielded, dealt, unshieldedDealt, done } =
    defendedDamage(defender, { main, offhand, third }, { anyCrit, immune });

  const takenBonus = arrowBlocked
    ? 0
    : takenDamageBonus(
        defender,
        Object.values(main.strength),
        [offhand, third],
        missed,
      );

  const crush = struck
    ? crushOf(attacker, main.strength.physical, damage.physical)
    : NO_CRUSH;

  const unavoidable = immune
    ? 0
    : unavoidableDamage(attacker, takenBonus + crush.damage);

  const { stun, freeze, energyBurned, critSlow } = land(
    attacker,
    defender,
    plan,
    random,
    {
      crit: anyCrit,
      landed: !missed,
      dealt,
      defended: unshieldedDealt,
      extra: unavoidable,
      blocked: main.blocked > 0,
      frost: main.strength.frost > 0,
    },
  );

  const landed = missed ? NOT_LANDED : afterLanding(attacker, defender, random);
  const armorDestroyed = brokenBefore ? 0 : main.armorDestruction;

  const triggers = passiveTriggers(attacker, defender, random, {
    crit: anyCrit,
    landed: !missed,
    mainTaken: unshielded.physical,
    dealt: unshieldedDealt,
    pierced: main.pierced,
    armorDestroyed,
  });

  const cleansed = !missed && cleanseOnHit(defender, random);

  const reflected = reflectFrom(attacker, defender, done, random);
  const vamp = vampire(attacker, unshieldedDealt);
  const swung = swingsAround(attacker, defender, random);
  const swings = swung ? swingAt(attacker, others, random) : [];

  const shown = showOnce(attacker, defender, {
    facade,
    armorDestroyed: defender.armorLost > lostBefore,
  });

  return {
    rage: Math.round(rage * main.rolled),
    crit,
    offhandCrit: offhand.crit,
    veryCrit: veryCrit || offhand.veryCrit,
    critSlow,
    ...effects,
    cleansed,
    holyTouch,
    puncture: shown.puncture,
    critred,
    facade: shown.facade,
    evaded,
    parried: anyParried,
    arrowBlocked,
    countered:
      counterable && counters(defender, attacker, random, anyCrit, anyParried),
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
    armorDestructionReduction: shown.armorDestructionReduction,
    ...cursed,
    resistanceDestroyed: main.resistanceDestroyed,
    absorbed: main.absorbed,
    absorbedMagic: main.absorbedMagic,
    absorbDestroyed: main.absorbDestroyed,
    absorbShareDestroyed: main.absorbShareDestroyed,
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
