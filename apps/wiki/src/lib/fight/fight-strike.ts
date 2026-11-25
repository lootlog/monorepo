import {
  applyWeaponDamageOverTime,
  NO_WEAPON_WOUNDS,
  chance,
  counters,
  damageLoweredBy,
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
import { critValueShift, rollCrit } from "./fight-crit";
import {
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
  vultureOf,
  type PassiveTriggers,
} from "./fight-passives";
import {
  isImmune,
  MELEE,
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
  readonly crit: boolean;
  readonly offhandCrit: boolean;
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
  readonly crushDamage: number;
  readonly vulture: number;
  readonly poisonWeakened: number;
  readonly triggers: PassiveTriggers;
  readonly reflected: number;
  readonly vamp: number;
  readonly swung: boolean;
  readonly swings: readonly SwingHit[];
  readonly strength: StrikeDamage;
  readonly damage: StrikeDamage;
};

const BLOCK_REDUCTION = 0.3;

const FROST_SLOW_TURNS = 3;

const SWING_TARGETS = 3;

const HOLY_TOUCH_TURNS = 3;

type DamageScale = {
  readonly dealt: number;
  readonly taken: number;
};

export const pierceChance = (attacker: FighterState) =>
  Math.max(
    0,
    attacker.combatant.pierce -
      buffTotal(attacker, "disturb_pierce", "stinkbomb_pierce"),
  );

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

const mainWeaponHit = (hit: Hit, scale: DamageScale) => {
  const { attacker, defender, plan, random } = hit;
  const a = attacker.combatant;
  const d = defender.combatant;

  const blocked =
    random() <
    blockChance(defender, attacker, plan.effect("active_decblock_per"));

  const pierceRolled = random() < pierceChance(attacker) / 100;

  const pierceBlocked =
    pierceRolled && !blocked && random() < d.pierceBlock / 100;

  const pierced = pierceRolled && !blocked && !pierceBlocked;
  const blockFactor = blocked ? 1 - BLOCK_REDUCTION : 1;

  if (blocked) gainCombo(defender, d.comboGain.block);

  if (pierced) gainCombo(attacker, a.comboGain.pierce);

  destroyArmor(
    defender,
    Math.max(0, a.armorDestruction - d.armorDestructionResist) +
      attacker.pendingArmorDestruction +
      (plan.effect("active_acdmg_per") / 100) * currentArmor(defender),
  );

  attacker.pendingArmorDestruction = 0;

  const resistanceDestroyed = destroyResistance(attacker, defender);
  const absorbDestroyed = destroyAbsorb(attacker, defender);
  const physicalHit = physicalDamage(hit, pierced, blockFactor);
  const magic = magicDamage(hit, pierced, blockFactor);
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
  const damaging = physical + fire + frost + light > 0;

  if (damaging && a.enemySlow > 0) {
    defender.slowBySource.set(attacker.index, a.enemySlow);
  }

  if (magic.strength.frost > 0 && a.frostSlow > 0) {
    defender.frostSlow = {
      slow: a.frostSlow,
      boost: plan.effect("slowfreeze_per") / 100,
      turnsLeft: Math.max(FROST_SLOW_TURNS, plan.turns("slowfreeze_per")),
    };
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
    pierceShown: pierceRolled && !pierceBlocked,
    pierceBlocked,
    damaging,
    resistanceDestroyed,
    absorbed: taken(physicalHit.absorbed),
    absorbedMagic: taken(magic.absorbed),
    absorbDestroyed,
  };
};

const MISSED = {
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

const missedHit = (hit: Hit, scale: DamageScale) => {
  const dealt = (value: number) => Math.round(value * scale.dealt);
  const physical = physicalStrength(hit);
  const magic = magicStrength(hit);

  return {
    ...MISSED,
    pierceShown: hit.random() < pierceChance(hit.attacker) / 100,
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
  random: () => number,
) => {
  const a = attacker.combatant;
  const candidates = others.filter((other) => other.alive);
  const targets: FighterState[] = [];

  while (targets.length < SWING_TARGETS && candidates.length > 0) {
    targets.push(
      ...candidates.splice(Math.floor(random() * candidates.length), 1),
    );
  }

  return targets.map((other) => {
    const damage = isImmune(other)
      ? 0
      : Math.round(
          armorReduced(
            roll(random, a.physical),
            armorAgainst(other, attacker),
          ) *
            (1 + a.physicalBonus / 100),
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
): DamageScale => {
  const dealt =
    (1 - plan.effect("lowdmg_self") / 100) *
    (1 +
      (buffTotal(attacker, "perdmg", "perdmg-allies") +
        buffTotal(attacker, "rage")) /
        100) *
    (1 + attacker.combatant.damageBonus / 100) *
    damageLoweredBy(attacker) *
    (1 - poisonWeakeningOf(attacker) / 100);

  return {
    dealt,
    taken: dealt * (1 + defender.combatant.damageTakenBonus / 100),
  };
};

const NO_OFFHAND = {
  crit: false,
  veryCrit: false,
  strength: 0,
  taken: 0,
};

const offhandHit = (hit: Hit, scale: DamageScale, mainParried: boolean) => {
  const { attacker, defender, random } = hit;
  const a = attacker.combatant;

  if (a.offhand.max <= 0) return NO_OFFHAND;

  const crit = rollCrit(attacker, defender, random, a.offhandCritChance);

  const critFactor =
    crit.strength > 0
      ? (crit.strength *
          (a.offhandCritValue + critValueShift(attacker, defender))) /
        100
      : 1;

  const rolled = roll(random, a.offhand) * critFactor;
  const parried = !mainParried && parries(attacker, defender, random);

  return {
    crit: crit.crit,
    veryCrit: crit.veryCrit,
    strength: rolled * scale.dealt,
    taken: parried
      ? 0
      : armorReduced(rolled, armorAgainst(defender, attacker)) * scale.taken,
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

  const energyBurned = struck ? debuffOnHit(attacker, defender, plan) : 0;

  takeDamage(defender, dealt + extra);
  attacker.damageDealt += dealt + extra;

  return { ...stunned, energyBurned };
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
  {
    anyCrit,
    immune,
    scale,
  }: { anyCrit: boolean; immune: boolean; scale: DamageScale },
) => {
  const { legendary } = defender.combatant;
  const thirdTaken = third.taken * scale.taken;

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
  const keep = (value: number) => (immune ? 0 : Math.round(value * kept));

  const damage = {
    physical: keep(main.physical),
    offhand: keep(offhand.taken),
    fire: keep(main.fire),
    frost: keep(main.frost),
    light: keep(main.light),
    third: keep(thirdTaken),
  };

  return {
    critred,
    facade,
    damage,
    dealt: Object.values(damage).reduce((total, value) => total + value, 0),
    done:
      main.strength.physical +
      main.strength.fire +
      main.strength.frost +
      main.strength.light +
      offhand.strength +
      third.strength * scale.dealt,
  };
};

const NO_BONUS_DAMAGE = { crush: { value: 0, damage: 0 }, vulture: 0 };

const bonusDamage = (
  attacker: FighterState,
  defender: FighterState,
  unscaledStrength: number,
  main: { strength: number; taken: number },
) => ({
  crush: crushOf(attacker, main.strength, main.taken),
  vulture: vultureOf(attacker, defender, unscaledStrength),
});

const poisonWeakeningOf = (attacker: FighterState) =>
  attacker.poison ? buffTotal(attacker, "poison_lowdmg_per") : 0;

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

  const armorBefore = currentArmor(defender);
  const lostBefore = defender.armorLost;
  const hit = { attacker, defender, plan, crit: strength, random };
  const main = missed ? missedHit(hit, scale) : mainWeaponHit(hit, scale);
  const offhand = offhandHit(hit, scale, parried);

  const third = arrowBlocked
    ? NO_THIRD_ATTACK
    : thirdAttack(attacker, defender, random, main.pierced);

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

  const { critred, facade, damage, dealt, done } = defendedDamage(
    defender,
    { main, offhand, third },
    { anyCrit, immune, scale },
  );

  const takenBonus = struck
    ? Math.round(
        (done * buffTotal(defender, "taken_dmg_per", "taken_dmg_per-all")) /
          100,
      )
    : 0;

  const bonus = struck
    ? bonusDamage(attacker, defender, main.strength.physical / scale.dealt, {
        strength: main.strength.physical,
        taken: damage.physical,
      })
    : NO_BONUS_DAMAGE;

  const { stun, freeze, energyBurned } = land(
    attacker,
    defender,
    plan,
    random,
    {
      crit: anyCrit,
      struck,
      dealt,
      extra: takenBonus + bonus.crush.damage + bonus.vulture,
      blocked: main.blocked > 0,
      frost: main.frost,
    },
  );

  const landed = struck ? afterLanding(attacker, defender, random) : NOT_LANDED;
  const armorDestroyed = armorBefore - currentArmor(defender);

  const triggers = passiveTriggers(attacker, defender, random, {
    crit: anyCrit,
    struck,
    mainTaken: damage.physical,
    dealt,
    pierced: main.pierced,
    armorDestroyed: Math.round(armorDestroyed),
  });

  const reflected = reflectFrom(attacker, defender, done, random);
  const vamp = vampire(attacker, dealt);
  const swung = !evaded && swingsAround(attacker, defender, random);
  const swings = swung ? swingAt(attacker, others, random) : [];
  const shown = showOnce(attacker, defender, facade);
  const destroyed = defender.armorLost - lostBefore;
  const reduction = d.armorDestructionReduction;

  return {
    crit,
    offhandCrit: offhand.crit,
    veryCrit: veryCrit || offhand.veryCrit,
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
    armorDestructionReduction: destroyed > 0 ? reduction : 0,
    ...cursed,
    resistanceDestroyed: main.resistanceDestroyed,
    absorbed: main.absorbed + Math.round(third.absorbed * scale.taken),
    absorbedMagic: main.absorbedMagic,
    absorbDestroyed: main.absorbDestroyed,
    absorbRenewed: landed.renewed.absorb,
    absorbMagicRenewed: landed.renewed.absorbMagic,
    energyDrained: landed.energyDrained,
    manaDrained: landed.manaDrained,
    energyBurned,
    takenBonus,
    crush: bonus.crush.value,
    crushDamage: bonus.crush.damage,
    vulture: bonus.vulture,
    poisonWeakened: poisonWeakeningOf(attacker),
    triggers,
    reflected,
    vamp,
    swung,
    swings,
    strength: {
      ...main.strength,
      offhand: Math.round(offhand.strength),
      third: Math.round(third.strength * scale.dealt),
    },
    damage,
  };
};
