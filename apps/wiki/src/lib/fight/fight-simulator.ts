import { applyCast, type CastOutcome } from "./fight-cast";
import {
  addBuff,
  buffTotal,
  endSkillTurn,
  NO_SKILL,
  paySkill,
  takeAction,
  type ActionPlan,
  type ActiveSkill,
} from "./fight-skills";
import {
  canStepForward,
  clamp,
  createState,
  isBelow,
  withAllyHealth,
  type PassiveEffects,
  healBy,
  isImmune,
  MAX_RESISTANCE,
  reaches,
  takeDamage,
  type Combatant,
  type FighterState,
} from "./fight-state";
import { elementResistance } from "./fight-defence";
import { strike, type Strike } from "./fight-strike";

type Targeting = "lowestLevel" | "random";

export type FightSetup = {
  readonly teams: readonly (readonly Combatant[])[];
  readonly targeting?: Targeting;
};

type FighterOutcome = {
  readonly name: string;
  readonly team: number;
  readonly alive: boolean;
  readonly hpLeft: number;
  readonly moves: number;
  readonly damageDealt: number;
  readonly hits: number;
  readonly crits: number;
  readonly evaded: number;
  readonly pierced: number;
  readonly healed: number;
  readonly skillUses: ReadonlyMap<string, number>;
};

export type FightEvent =
  | {
      readonly kind: "damageOverTime";
      readonly actor: number;
      readonly poison: number;
      readonly poisonReduction: number;
      readonly wound: number;
      readonly woundReduction: number;
      readonly injure: number;
      readonly critWound: number;
      readonly lingeringReduction: number;
      readonly anguish: number;
      readonly fire: number;
      readonly fireReduction: number;
      readonly light: number;
      readonly lightReduction: number;
      readonly absolute: number;
      readonly lastHeal: number;
      readonly hp: readonly number[];
    }
  | {
      readonly kind: "energyRegen";
      readonly actor: number;
      readonly amount: number;
      readonly hp: readonly number[];
    }
  | {
      readonly kind: "holyTouchHeal";
      readonly actor: number;
      readonly amount: number;
      readonly hp: readonly number[];
    }
  | { readonly kind: "lostTurn"; readonly actor: number }
  | {
      readonly kind: "step";
      readonly actor: number;
      readonly hp: readonly number[];
    }
  | {
      readonly kind: "heal";
      readonly actor: number;
      readonly amount: number;
      readonly cut: number;
      readonly hp: readonly number[];
    }
  | (CastOutcome & {
      readonly kind: "skill";
      readonly actor: number;
      readonly target: number;
      readonly skill: ActiveSkill;
      readonly comboSpent: number;
      readonly comboDamage: number;
      readonly lastHeal: number;
      readonly hp: readonly number[];
    })
  | (Strike & {
      readonly kind: "strike";
      readonly actor: number;
      readonly target: number;
      readonly fastArrow: boolean;
      readonly lastHeal: number;
      readonly hp: readonly number[];
    });

export type FightRecorder = (event: FightEvent) => void;

export type FightResult = {
  readonly winner: number | null;
  readonly time: number;
  readonly moves: number;
  readonly fighters: readonly FighterOutcome[];
};

const MOVES_PER_PLAYER = 75;

const SLOW_FLOOR_FACTOR = 3;

const FAST_ARROW_TIME_FACTOR = 0.25;

const HEAL_DECAY = 0.05;

const strongestEnemySlow = (state: FighterState) => {
  let strongest = 0;

  for (const value of state.slowBySource.values())
    strongest = Math.max(strongest, value);

  return strongest;
};

const attackTime = (state: FighterState) => {
  const { attackSpeed, slowReduction } = state.combatant;

  const additive =
    (buffTotal(state, "sa_per") +
      buffTotal(state, "sa2_per") +
      buffTotal(state, "aura-sa_per") +
      buffTotal(state, "critsa") +
      (isBelow(state, state.combatant.passives.adrenalinSpeed)
        ? state.combatant.passives.adrenalinSpeed.value
        : 0) -
      buffTotal(state, "allslow_per") -
      buffTotal(state, "lightshield_slow")) /
      100 -
    (state.critSlowTurns > 0 ? state.critSlowValue / 100 : 0);

  const reduction = clamp(slowReduction, 0, 100) / 100;

  const weaponSlow = Math.max(
    state.poison ? state.poison.slow * (1 - reduction) : 0,
    state.frostSlow
      ? state.frostSlow.slow * (1 + state.frostSlow.boost - reduction)
      : 0,
  );

  const constantSlow = weaponSlow + strongestEnemySlow(state) * (1 - reduction);

  const modified = attackSpeed * (1 + additive) - constantSlow;

  return Math.min(
    1 / Math.max(modified, 1e-9),
    SLOW_FLOOR_FACTOR / attackSpeed,
  );
};

const SKILL_DOT_RESISTANCE = {
  fire: (state: FighterState) =>
    elementResistance(state, state.combatant.resistFire, "resfire_per"),
  light: (state: FighterState) =>
    elementResistance(state, state.combatant.resistLight, "reslight_per"),
  absolute: () => 0,
};

const NO_TICK = { damage: 0, reduction: 0 };

const tickSkillDot = (
  state: FighterState,
  kind: keyof typeof SKILL_DOT_RESISTANCE,
) => {
  const dot = state.skillDots.get(kind);

  if (!dot) return NO_TICK;

  dot.turnsLeft -= 1;

  if (dot.turnsLeft <= 0) state.skillDots.delete(kind);

  const resistance = SKILL_DOT_RESISTANCE[kind](state);

  return {
    damage: Math.round(dot.damage * (1 - resistance)),
    reduction: Math.round(100 * resistance),
  };
};

const NO_DAMAGE_OVER_TIME = {
  poison: 0,
  poisonReduction: 0,
  wound: 0,
  woundReduction: 0,
  injure: 0,
  critWound: 0,
  lingeringReduction: 0,
  anguish: 0,
  fire: 0,
  fireReduction: 0,
  light: 0,
  lightReduction: 0,
  absolute: 0,
};

const tickLingering = (
  state: FighterState,
  kind: "injure" | "critWound",
  reduction: number,
) => {
  const lingering = state[kind];

  if (!lingering) return 0;

  lingering.turnsLeft -= 1;

  if (lingering.turnsLeft <= 0) state[kind] = null;

  return Math.round(lingering.damage * (1 - reduction / 100));
};

const tickDamageOverTime = (state: FighterState) => {
  const poisonReduction = clamp(
    state.combatant.resistPoison -
      state.poisonResistanceLost +
      buffTotal(state, "antidote"),
    0,
    MAX_RESISTANCE,
  );

  const woundReduction = clamp(state.combatant.resistWound, 0, MAX_RESISTANCE);
  let poison = 0;
  let wound = 0;

  if (state.poison) {
    poison = Math.round(state.poison.damage * (1 - poisonReduction / 100));
    state.poison.turnsLeft -= 1;

    if (state.poison.turnsLeft <= 0) state.poison = null;
  }

  if (state.wound) {
    wound = Math.round(state.wound.damage * (1 - woundReduction / 100));
    state.wound.turnsLeft -= 1;

    if (state.wound.turnsLeft <= 0) state.wound = null;
  }

  const injure = tickLingering(state, "injure", woundReduction);
  const critWound = tickLingering(state, "critWound", woundReduction);
  let anguish = 0;

  if (state.anguish) {
    anguish = Math.round(state.anguish.damage);
    state.anguish.turnsLeft -= 1;

    if (state.anguish.turnsLeft <= 0) state.anguish = null;
  }

  const fire = tickSkillDot(state, "fire");
  const light = tickSkillDot(state, "light");

  const ticks = {
    poison,
    poisonReduction: poison > 0 ? poisonReduction : 0,
    wound,
    woundReduction: wound > 0 ? woundReduction : 0,
    injure,
    critWound,
    lingeringReduction: injure + critWound > 0 ? woundReduction : 0,
    anguish,
    fire: fire.damage,
    fireReduction: fire.damage > 0 ? fire.reduction : 0,
    light: light.damage,
    lightReduction: light.damage > 0 ? light.reduction : 0,
    absolute: tickSkillDot(state, "absolute").damage,
  };

  return isImmune(state) ? NO_DAMAGE_OVER_TIME : ticks;
};

const LAST_HEAL_THRESHOLD = 0.18;

const HOLY_TOUCH_HEAL = 0.06;

const tryLastHeal = (state: FighterState, random: () => number) => {
  const range = state.combatant.legendary.lastheal;

  if (
    !range ||
    !state.alive ||
    state.lastHealUsed ||
    state.hp >= LAST_HEAL_THRESHOLD * state.combatant.hp
  ) {
    return 0;
  }

  state.lastHealUsed = true;

  const share =
    Math.round(range.min) +
    Math.floor(random() * (Math.round(range.max) - Math.round(range.min) + 1));

  return healBy(state, (share / 100) * state.combatant.hp - state.hp);
};

const teamTotal = (
  team: readonly FighterState[],
  effect: (passives: PassiveEffects) => number,
) =>
  team.reduce(
    (total, member) =>
      member.alive ? total + effect(member.combatant.passives) : total,
    0,
  );

const healingModifier = (
  state: FighterState,
  allies: readonly FighterState[],
  enemies: readonly FighterState[],
) =>
  1 +
  (buffTotal(state, "sunshield_per") +
    teamTotal(allies, (passives) => passives.allyHealing) -
    teamTotal(enemies, (passives) => passives.enemyHealing) -
    state.healCut) /
    100;

const applyHealing = (
  state: FighterState,
  allies: readonly FighterState[],
  enemies: readonly FighterState[],
) => {
  const base =
    state.combatant.healing *
    Math.max(0, healingModifier(state, allies, enemies));

  if (base <= 0 || state.hp >= state.combatant.hp) return 0;

  const decayed = base * (1 - HEAL_DECAY * state.healTriggers);

  if (decayed <= 0) return 0;

  let reduction = 0;

  for (const enemy of enemies) {
    if (enemy.alive)
      reduction = Math.max(reduction, enemy.combatant.healingReduction);
  }

  state.healTriggers += 1;
  state.healCut = 0;

  const healed = Math.min(
    state.combatant.hp - state.hp,
    Math.max(0, Math.round(decayed - reduction)),
  );

  state.hp += healed;
  state.healed += healed;

  return healed;
};

const pickTarget = (
  actor: FighterState,
  enemies: readonly FighterState[],
  targeting: Targeting,
  random: () => number,
) => {
  const alive = enemies.filter((enemy) => enemy.alive);

  const taunting = alive.find((enemy) =>
    actor.buffs.some(
      (buff) => buff.key === "shout" && buff.source === enemy.index,
    ),
  );

  const reachable = (taunting ? [taunting] : alive).filter((enemy) =>
    reaches(actor, enemy),
  );

  if (reachable.length === 0) return null;

  if (targeting === "random")
    return reachable[Math.floor(random() * reachable.length)] ?? null;

  return reachable.reduce((target, enemy) =>
    enemy.combatant.level <= target.combatant.level ? enemy : target,
  );
};

const reachesEnemy = (actor: FighterState, enemies: readonly FighterState[]) =>
  pickTarget(actor, enemies, "lowestLevel", () => 0) !== null;

const endTurn = (state: FighterState) => {
  endSkillTurn(state);

  if (state.frostSlow) {
    state.frostSlow.turnsLeft -= 1;

    if (state.frostSlow.turnsLeft <= 0) state.frostSlow = null;
  }

  if (state.critSlowTurns > 0) state.critSlowTurns -= 1;

  state.mana = Math.min(
    state.combatant.mana,
    state.mana + state.combatant.passives.manaGain,
  );
};

const livingTeams = (states: readonly FighterState[]) =>
  new Set(states.flatMap((state) => (state.alive ? [state.team] : [])));

const stunReduction = (state: FighterState) =>
  clamp(
    state.combatant.stunReduction + buffTotal(state, "active_redstun"),
    0,
    100,
  ) / 100;

type Turn = {
  actor: FighterState;
  allies: readonly FighterState[];
  enemies: readonly FighterState[];
  targeting: Targeting;
  random: () => number;
  record: FightRecorder | undefined;
  hpOf: () => number[];
};

const nextActor = (states: readonly FighterState[]) => {
  let actor: FighterState | null = null;
  let actorPredicted = Infinity;

  for (const state of states) {
    if (!state.alive) continue;

    const predicted = state.clock + attackTime(state);

    if (predicted < actorPredicted) {
      actor = state;
      actorPredicted = predicted;
    }
  }

  return actor;
};

const startTurn = (turn: Turn) => {
  const { actor, allies, enemies, random, record, hpOf } = turn;
  const healCut = actor.healCut;
  const healed = applyHealing(actor, allies, enemies);

  if (record && healed > 0) {
    record({
      kind: "heal",
      actor: actor.index,
      amount: healed,
      cut: healCut,
      hp: hpOf(),
    });
  }

  const overTime = tickDamageOverTime(actor);

  const overTimeDamage =
    overTime.poison +
    overTime.wound +
    overTime.injure +
    overTime.critWound +
    overTime.anguish +
    overTime.fire +
    overTime.light +
    overTime.absolute;

  takeDamage(actor, overTimeDamage);

  const lastHeal = tryLastHeal(actor, random);

  if (record && (overTimeDamage > 0 || lastHeal > 0)) {
    record({
      kind: "damageOverTime",
      actor: actor.index,
      ...overTime,
      lastHeal,
      hp: hpOf(),
    });
  }

  if (!actor.alive) return;

  if (actor.holyTouchTurns > 0) {
    actor.holyTouchTurns -= 1;

    const amount = healBy(actor, HOLY_TOUCH_HEAL * actor.combatant.hp);

    record?.({
      kind: "holyTouchHeal",
      actor: actor.index,
      amount,
      hp: hpOf(),
    });
  }

  const regenerated = buffTotal(actor, "en-regen");

  actor.energy = Math.min(
    actor.combatant.energy,
    actor.energy + actor.combatant.energyGain + regenerated,
  );

  if (record && regenerated > 0) {
    record({
      kind: "energyRegen",
      actor: actor.index,
      amount: regenerated,
      hp: hpOf(),
    });
  }
};

const comboDamageTo = (target: FighterState, plan: ActionPlan) =>
  plan.comboSpent > 0
    ? Math.round(
        ((plan.effect("combo_dmg_hpp-target") * plan.comboSpent) / 100) *
          target.combatant.hp *
          (1 + target.combatant.damageTakenBonus / 100),
      )
    : 0;

const castSkill = (
  { actor, allies, enemies, targeting, random, record, hpOf }: Turn,
  skill: ActiveSkill,
  plan: ActionPlan,
) => {
  paySkill(actor, skill, plan);

  const enemy = skill.selfCast
    ? null
    : pickTarget(actor, enemies, targeting, () => 0);

  const outcome = applyCast({
    caster: actor,
    target: enemy,
    allies,
    enemies,
    skill,
    plan,
    random,
  });

  const target = enemy ?? actor;

  const comboDamage =
    target === actor || isImmune(target) ? 0 : comboDamageTo(target, plan);

  takeDamage(target, comboDamage);
  actor.damageDealt += comboDamage;

  const lastHeal =
    comboDamage + outcome.flatDamage > 0 ? tryLastHeal(target, random) : 0;

  record?.({
    kind: "skill",
    actor: actor.index,
    target: target.index,
    skill,
    ...outcome,
    comboSpent: plan.comboSpent,
    comboDamage,
    lastHeal,
    hp: hpOf(),
  });

  return 1 - plan.effect("red-sa") / 100;
};

const MAX_COUNTER_CHAIN = 10;

const counterAttack = (
  { random, record, hpOf }: Turn,
  countering: FighterState,
  target: FighterState,
) => {
  let attacker = countering;
  let defender = target;

  for (let chain = 0; chain < MAX_COUNTER_CHAIN; chain += 1) {
    if (!attacker.alive || !defender.alive) return;

    const hit = strike(attacker, defender, NO_SKILL, random);
    const lastHeal = tryLastHeal(defender, random);

    record?.({
      kind: "strike",
      actor: attacker.index,
      target: defender.index,
      fastArrow: false,
      ...hit,
      lastHeal,
      hp: hpOf(),
    });

    if (!hit.countered) return;

    [attacker, defender] = [defender, attacker];
  }
};

const attack = (turn: Turn, plan: ActionPlan) => {
  const { actor, enemies, targeting, random, record, hpOf } = turn;
  const attacks = 1 + plan.effect("add_attacks");
  const fastArrow = random() < actor.combatant.fastArrowChance / 100;

  for (let index = 0; index < attacks; index += 1) {
    const target = pickTarget(actor, enemies, targeting, random);

    if (target === null || !actor.alive) break;

    const hit = strike(
      actor,
      target,
      plan,
      random,
      enemies.filter((enemy) => enemy !== target),
      index === attacks - 1,
    );

    const lastHeal = tryLastHeal(target, random);

    record?.({
      kind: "strike",
      actor: actor.index,
      target: target.index,
      fastArrow: fastArrow && index === 0,
      ...hit,
      lastHeal,
      hp: hpOf(),
    });

    if (hit.countered) counterAttack(turn, target, actor);
  }

  return fastArrow ? FAST_ARROW_TIME_FACTOR : 1;
};

const stepForward = ({ actor, record, hpOf }: Turn) => {
  actor.stepsForward += 1;
  record?.({ kind: "step", actor: actor.index, hp: hpOf() });

  return 1;
};

const act = (turn: Turn) => {
  const plan = takeAction(turn.actor, {
    reachesEnemy: reachesEnemy(turn.actor, turn.enemies),
    canStep: canStepForward(turn.actor),
  });

  if (plan === "step") return stepForward(turn);

  const skillFactor = plan.skill ? castSkill(turn, plan.skill, plan) : 1;

  const attackFactor =
    plan.skill === null || plan.skill.attacks ? attack(turn, plan) : 1;

  return skillFactor * attackFactor;
};

export const simulateFight = (
  setup: FightSetup,
  random: () => number,
  record?: FightRecorder,
): FightResult => {
  const targeting = setup.targeting ?? "lowestLevel";

  const states = withAllyHealth(setup.teams).flatMap((team, teamIndex) =>
    team.map((combatant) => createState(combatant, teamIndex, 0)),
  );

  states.forEach((state, index) => {
    state.index = index;
    state.clock = attackTime(state);
  });

  const enemiesOf = states.map((state) =>
    states.filter((other) => other.team !== state.team),
  );

  const alliesOf = states.map((state) =>
    states.filter((other) => other.team === state.team),
  );

  for (const state of states) {
    const weakening = state.combatant.passives.poisonWeakening;

    if (weakening <= 0) continue;

    for (const enemy of enemiesOf[state.index] ?? []) {
      addBuff(enemy, "poison_lowdmg_per", weakening, Infinity, state.index);
    }
  }

  const hpOf = () => states.map((state) => state.hp);
  const maxMoves = MOVES_PER_PLAYER * states.length;
  let moves = 0;
  let time = 0;

  while (moves < maxMoves && livingTeams(states).size > 1) {
    const actor = nextActor(states);

    if (actor === null) break;

    const turn: Turn = {
      actor,
      allies: alliesOf[actor.index] ?? [],
      enemies: enemiesOf[actor.index] ?? [],
      targeting,
      random,
      record,
      hpOf,
    };

    startTurn(turn);

    if (!actor.alive) continue;

    const stunned = actor.stunned;
    const lost = stunned || actor.cursed;
    const lostTime = stunned ? 1 - stunReduction(actor) : 1;

    if (stunned) actor.stunned = false;
    else actor.cursed = false;

    if (lost) record?.({ kind: "lostTurn", actor: actor.index });

    const timeFactor = lost ? lostTime : act(turn);

    actor.clock += attackTime(actor) * timeFactor;
    time = actor.clock;
    actor.moves += 1;
    moves += 1;
    endTurn(actor);
  }

  const alive = livingTeams(states);

  return {
    winner: alive.size === 1 ? ([...alive][0] ?? null) : null,
    time,
    moves,
    fighters: states.map((state) => ({
      name: state.combatant.name,
      team: state.team,
      alive: state.alive,
      hpLeft: state.hp,
      moves: state.moves,
      damageDealt: state.damageDealt,
      hits: state.hits,
      crits: state.crits,
      evaded: state.evaded,
      pierced: state.pierced,
      healed: state.healed,
      skillUses: state.skillUses,
    })),
  };
};
