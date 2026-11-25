import { applyCast, type CastOutcome } from "./fight-cast";
import {
  buffTotal,
  endSkillTurn,
  NO_SKILL,
  paySkill,
  takeAction,
  type ActionPlan,
  type ActiveSkill,
} from "./fight-skills";
import {
  clamp,
  createState,
  healBy,
  isImmune,
  MAX_RESISTANCE,
  takeDamage,
  type Combatant,
  type FighterState,
} from "./fight-state";
import { elementResistance, strike, type Strike } from "./fight-strike";

type Targeting = "weakest" | "random";

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
      readonly anguish: number;
      readonly fire: number;
      readonly light: number;
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
      readonly kind: "heal";
      readonly actor: number;
      readonly amount: number;
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
      buffTotal(state, "aura-sa_per") -
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

const tickSkillDot = (
  state: FighterState,
  kind: keyof typeof SKILL_DOT_RESISTANCE,
) => {
  const dot = state.skillDots.get(kind);

  if (!dot) return 0;

  dot.turnsLeft -= 1;

  if (dot.turnsLeft <= 0) state.skillDots.delete(kind);

  return Math.round(dot.damage * (1 - SKILL_DOT_RESISTANCE[kind](state)));
};

const NO_DAMAGE_OVER_TIME = {
  poison: 0,
  poisonReduction: 0,
  wound: 0,
  woundReduction: 0,
  anguish: 0,
  fire: 0,
  light: 0,
  absolute: 0,
};

const tickDamageOverTime = (state: FighterState) => {
  const poisonReduction = clamp(
    state.combatant.resistPoison + buffTotal(state, "antidote"),
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

  let anguish = 0;

  if (state.anguish) {
    anguish = Math.round(state.anguish.damage);
    state.anguish.turnsLeft -= 1;

    if (state.anguish.turnsLeft <= 0) state.anguish = null;
  }

  const ticks = {
    poison,
    poisonReduction: poison > 0 ? poisonReduction : 0,
    wound,
    woundReduction: wound > 0 ? woundReduction : 0,
    anguish,
    fire: tickSkillDot(state, "fire"),
    light: tickSkillDot(state, "light"),
    absolute: tickSkillDot(state, "absolute"),
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

  const share = range.min + random() * (range.max - range.min);

  return healBy(state, (share / 100) * state.combatant.hp);
};

const applyHealing = (
  state: FighterState,
  enemies: readonly FighterState[],
) => {
  const base =
    state.combatant.healing * (1 + buffTotal(state, "sunshield_per") / 100);

  if (base <= 0 || state.hp >= state.combatant.hp) return 0;

  const decayed = base * (1 - HEAL_DECAY * state.healTriggers);

  if (decayed <= 0) return 0;

  let reduction = 0;

  for (const enemy of enemies) {
    if (enemy.alive)
      reduction = Math.max(reduction, enemy.combatant.healingReduction);
  }

  state.healTriggers += 1;

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

  if (alive.length === 0) return null;

  const taunting = alive.find((enemy) =>
    actor.buffs.some(
      (buff) => buff.key === "shout" && buff.source === enemy.index,
    ),
  );

  if (taunting) return taunting;

  if (targeting === "random")
    return alive[Math.floor(random() * alive.length)] ?? null;

  return alive.reduce((target, enemy) =>
    enemy.hp < target.hp ? enemy : target,
  );
};

const endTurn = (state: FighterState) => {
  endSkillTurn(state);

  if (state.frostSlow) {
    state.frostSlow.turnsLeft -= 1;

    if (state.frostSlow.turnsLeft <= 0) state.frostSlow = null;
  }

  if (state.critSlowTurns > 0) state.critSlowTurns -= 1;
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
  const { actor, enemies, random, record, hpOf } = turn;
  const healed = applyHealing(actor, enemies);

  if (record && healed > 0) {
    record({ kind: "heal", actor: actor.index, amount: healed, hp: hpOf() });
  }

  const overTime = tickDamageOverTime(actor);

  const overTimeDamage =
    overTime.poison +
    overTime.wound +
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

  actor.energy = Math.max(
    0,
    Math.min(
      actor.combatant.energy,
      actor.energy + actor.combatant.energyGain + regenerated,
    ) - buffTotal(actor, "energyout"),
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

const act = (turn: Turn) => {
  const plan = takeAction(turn.actor);
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
  const targeting = setup.targeting ?? "weakest";

  const states = setup.teams.flatMap((team, teamIndex) =>
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

    const lost = actor.turnLost;
    const lostTime = actor.stunned ? 1 - stunReduction(actor) : 1;

    actor.turnLost = false;
    actor.stunned = false;

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
