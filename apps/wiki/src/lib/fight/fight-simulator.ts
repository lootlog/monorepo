import {
  buffTotal,
  chooseAction,
  endSkillTurn,
  isAttackSkill,
  payAndActivate,
  type ActionPlan,
  type ActiveSkill,
} from "./fight-skills";
import {
  clamp,
  createState,
  MAX_RESISTANCE,
  type Combatant,
  type FighterState,
} from "./fight-state";
import { strike, type Strike } from "./fight-strike";

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
      readonly wound: number;
      readonly anguish: number;
      readonly hp: readonly number[];
    }
  | {
      readonly kind: "bonusHeal";
      readonly bonus: "holytouch" | "lastheal";
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
  | {
      readonly kind: "skill";
      readonly actor: number;
      readonly target: number;
      readonly skill: ActiveSkill;
      readonly hp: readonly number[];
    }
  | (Strike & {
      readonly kind: "strike";
      readonly actor: number;
      readonly target: number;
      readonly fastArrow: boolean;
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
    buffTotal(state, "sa_per") / 100 -
    (state.critSlowTurns > 0 ? state.critSlowValue / 100 : 0);

  const reduction = clamp(slowReduction, 0, 100) / 100;
  const weaponSlow = state.poison ? state.poison.slow : 0;

  const constantSlow =
    (weaponSlow + strongestEnemySlow(state)) * (1 - reduction);

  const modified = attackSpeed * (1 + additive) - constantSlow;

  return Math.min(
    1 / Math.max(modified, 1e-9),
    SLOW_FLOOR_FACTOR / attackSpeed,
  );
};

const tickDamageOverTime = (state: FighterState) => {
  let poison = 0;
  let wound = 0;

  if (state.poison) {
    poison = Math.round(
      state.poison.damage *
        (1 - clamp(state.combatant.resistPoison, 0, MAX_RESISTANCE) / 100),
    );
    state.poison.turnsLeft -= 1;

    if (state.poison.turnsLeft <= 0) state.poison = null;
  }

  if (state.wound) {
    wound = Math.round(
      state.wound.damage *
        (1 - clamp(state.combatant.resistWound, 0, MAX_RESISTANCE) / 100),
    );
    state.wound.turnsLeft -= 1;

    if (state.wound.turnsLeft <= 0) state.wound = null;
  }

  let anguish = 0;

  if (state.anguish) {
    anguish = Math.round(state.anguish.damage);
    state.anguish.turnsLeft -= 1;

    if (state.anguish.turnsLeft <= 0) state.anguish = null;
  }

  return { poison, wound, anguish };
};

const LAST_HEAL_THRESHOLD = 0.18;

const HOLY_TOUCH_HEAL = 0.06;

const healBy = (state: FighterState, amount: number) => {
  const healed = Math.min(state.combatant.hp - state.hp, Math.round(amount));

  state.hp += healed;
  state.healed += healed;

  return healed;
};

const tryLastHeal = (
  state: FighterState,
  { random, record, hpOf }: Pick<Turn, "random" | "record" | "hpOf">,
) => {
  const range = state.combatant.legendary.lastheal;

  if (
    !range ||
    !state.alive ||
    state.lastHealUsed ||
    state.hp >= LAST_HEAL_THRESHOLD * state.combatant.hp
  ) {
    return;
  }

  state.lastHealUsed = true;

  const share = range.min + random() * (range.max - range.min);
  const amount = healBy(state, (share / 100) * state.combatant.hp);

  record?.({
    kind: "bonusHeal",
    bonus: "lastheal",
    actor: state.index,
    amount,
    hp: hpOf(),
  });
};

const applyHealing = (
  state: FighterState,
  enemies: readonly FighterState[],
) => {
  const base = state.combatant.healing;

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
  enemies: readonly FighterState[],
  targeting: Targeting,
  random: () => number,
) => {
  const alive = enemies.filter((enemy) => enemy.alive);

  if (alive.length === 0) return null;

  if (targeting === "random")
    return alive[Math.floor(random() * alive.length)] ?? null;

  return alive.reduce((target, enemy) =>
    enemy.hp < target.hp ? enemy : target,
  );
};

const endTurn = (state: FighterState) => {
  endSkillTurn(state);

  if (state.critSlowTurns > 0) state.critSlowTurns -= 1;
};

const livingTeams = (states: readonly FighterState[]) =>
  new Set(states.flatMap((state) => (state.alive ? [state.team] : [])));

type Turn = {
  actor: FighterState;
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
  const { actor, enemies, record, hpOf } = turn;
  const overTime = tickDamageOverTime(actor);
  const overTimeDamage = overTime.poison + overTime.wound + overTime.anguish;

  actor.hp -= overTimeDamage;

  if (actor.hp < 1) {
    actor.alive = false;
    actor.hp = 0;
  }

  if (record && overTimeDamage > 0) {
    record({
      kind: "damageOverTime",
      actor: actor.index,
      ...overTime,
      hp: hpOf(),
    });
  }

  if (!actor.alive) return;

  tryLastHeal(actor, turn);

  if (actor.holyTouchTurns > 0) {
    actor.holyTouchTurns -= 1;

    const amount = healBy(actor, HOLY_TOUCH_HEAL * actor.combatant.hp);

    record?.({
      kind: "bonusHeal",
      bonus: "holytouch",
      actor: actor.index,
      amount,
      hp: hpOf(),
    });
  }

  const healed = applyHealing(actor, enemies);

  if (record && healed > 0) {
    record({ kind: "heal", actor: actor.index, amount: healed, hp: hpOf() });
  }

  actor.energy = Math.min(
    actor.combatant.energy,
    actor.energy + actor.combatant.energyGain,
  );
};

const castSkill = (
  { actor, enemies, targeting, record, hpOf }: Turn,
  skill: ActiveSkill,
  plan: ActionPlan,
) => {
  payAndActivate(actor, skill, plan);

  record?.({
    kind: "skill",
    actor: actor.index,
    target: isAttackSkill(skill)
      ? (pickTarget(enemies, targeting, () => 0)?.index ?? actor.index)
      : actor.index,
    skill,
    hp: hpOf(),
  });

  return 1 - plan.effect("red-sa") / 100;
};

const attack = (turn: Turn, plan: ActionPlan) => {
  const { actor, enemies, targeting, random, record, hpOf } = turn;
  const attacks = 1 + plan.effect("add_attacks");
  const fastArrow = random() < actor.combatant.fastArrowChance / 100;

  for (let index = 0; index < attacks; index += 1) {
    const target = pickTarget(enemies, targeting, random);

    if (target === null) break;

    const hit = strike(actor, target, plan, random);

    record?.({
      kind: "strike",
      actor: actor.index,
      target: target.index,
      fastArrow: fastArrow && index === 0,
      ...hit,
      hp: hpOf(),
    });

    tryLastHeal(target, turn);
  }

  return fastArrow ? FAST_ARROW_TIME_FACTOR : 1;
};

const act = (turn: Turn) => {
  const plan = chooseAction(turn.actor);
  const skillFactor = plan.skill ? castSkill(turn, plan.skill, plan) : 1;

  const attackFactor =
    plan.skill === null || isAttackSkill(plan.skill) ? attack(turn, plan) : 1;

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

  const hpOf = () => states.map((state) => state.hp);
  const maxMoves = MOVES_PER_PLAYER * states.length;
  let moves = 0;
  let time = 0;

  while (moves < maxMoves && livingTeams(states).size > 1) {
    const actor = nextActor(states);

    if (actor === null) break;

    const turn: Turn = {
      actor,
      enemies: enemiesOf[actor.index] ?? [],
      targeting,
      random,
      record,
      hpOf,
    };

    startTurn(turn);

    if (!actor.alive) continue;

    const lost = actor.turnLost;

    actor.turnLost = false;

    if (lost) record?.({ kind: "lostTurn", actor: actor.index });

    const timeFactor = lost ? 1 : act(turn);

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
