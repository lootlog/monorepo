import { applyCast } from "./fight-cast";
import type {
  FightEvent,
  FightRecorder,
  FightResult,
  FightSetup,
  Targeting,
} from "./fight-events";
import {
  addBuff,
  buffTotal,
  endSkillTurn,
  NO_SKILL,
  paySkill,
  takeAction,
  tickCooldowns,
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
  inMeleeContact,
  reaches,
  takeDamage,
  type FighterState,
} from "./fight-state";
import { tickDamageOverTime } from "./fight-damage-over-time";
import { strikeChances } from "./fight-chances";
import {
  weaponlessUnavoidableFactor,
  weakeningFactor,
} from "./fight-hit-effects";
import { strike, type Strike } from "./fight-strike";

type EventSink = (event: FightEvent) => void;

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

export const attackTime = (state: FighterState) => {
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

  const poisonSlow = state.poison ? state.poison.slow * (1 - reduction) : 0;

  const frostSlow = state.frostSlow
    ? state.frostSlow.slow *
      (1 +
        (state.frostSlow.boostTurnsLeft > 0 ? state.frostSlow.boost : 0) -
        reduction)
    : 0;

  const weaponSlow =
    state.poison?.source === state.frostSlow?.source
      ? Math.max(poisonSlow, frostSlow)
      : poisonSlow + frostSlow;

  const constantSlow = weaponSlow + strongestEnemySlow(state) * (1 - reduction);

  const modified = attackSpeed * (1 + additive) - constantSlow;

  return Math.min(
    1 / Math.max(modified, 1e-9),
    SLOW_FLOOR_FACTOR / attackSpeed,
  );
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

const lastHealsOf = (
  states: readonly FighterState[],
  random: () => number,
  hits: readonly { readonly target: number }[],
) =>
  hits.map(({ target }) => {
    const state = states[target];

    return state ? tryLastHeal(state, random) : 0;
  });

const lastHealsAfter = (
  { states, random }: Turn,
  attacker: FighterState,
  defender: FighterState,
  hit: Strike,
) => ({
  lastHeal: tryLastHeal(defender, random),
  reflectLastHeal: hit.reflected > 0 ? tryLastHeal(attacker, random) : 0,
  swingLastHeals: lastHealsOf(states, random, hit.swings),
});

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
  (state.combatant.healingBonus +
    buffTotal(state, "sunshield_per") +
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
    Math.max(
      0,
      state.combatant.healing - (state.enemyHealingCut?.amount ?? 0),
    ) * Math.max(0, healingModifier(state, allies, enemies));

  if (base <= 0 || state.hp >= state.combatant.hp) return 0;

  const decayed = base * (1 - HEAL_DECAY * state.healTriggers);

  if (decayed <= 0) return 0;

  state.healTriggers += 1;

  const healed = Math.min(
    state.combatant.hp - state.hp,
    Math.max(0, Math.floor(decayed)),
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
  inRange: (enemy: FighterState) => boolean = (enemy) => reaches(actor, enemy),
) => {
  const alive = enemies.filter((enemy) => enemy.alive);

  const taunting = alive.find((enemy) =>
    actor.buffs.some(
      (buff) => buff.key === "shout" && buff.source === enemy.index,
    ),
  );

  const reachable = (taunting ? [taunting] : alive).filter(inRange);

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
    state.frostSlow.boostTurnsLeft -= 1;

    if (state.frostSlow.turnsLeft <= 0) state.frostSlow = null;
  }

  if (state.critSlowTurns > 0) state.critSlowTurns -= 1;

  if (state.enemyHealingCut) {
    state.enemyHealingCut.turnsLeft -= 1;

    if (state.enemyHealingCut.turnsLeft <= 0) state.enemyHealingCut = null;
  }

  state.mana = Math.min(
    state.combatant.mana,
    state.mana + state.combatant.passives.manaGain,
  );
};

const livingTeams = (states: readonly FighterState[]) =>
  new Set(states.flatMap((state) => (state.alive ? [state.team] : [])));

const MAX_STUN_REDUCTION = 90;

const stunReduction = (state: FighterState) =>
  clamp(
    state.combatant.stunReduction + buffTotal(state, "active_redstun"),
    0,
    MAX_STUN_REDUCTION,
  ) / 100;

const nextTurnTime = (state: FighterState) =>
  attackTime(state) * (state.stunned ? 1 - stunReduction(state) : 1);

type Turn = {
  actor: FighterState;
  states: readonly FighterState[];
  allies: readonly FighterState[];
  enemies: readonly FighterState[];
  targeting: Targeting;
  random: () => number;
  record: EventSink | undefined;
  openTurn: (() => EventSink) | undefined;
  inspect: boolean;
  hpOf: () => number[];
};

const nextActor = (states: readonly FighterState[]) => {
  let actor: FighterState | null = null;
  let actorPredicted = Infinity;

  for (const state of states) {
    if (!state.alive) continue;

    const predicted = state.clock + nextTurnTime(state);

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

  actor.healCut = 0;

  if (record && healed > 0) {
    record({
      kind: "heal",
      actor: actor.index,
      amount: healed,
      cut: healCut,
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

  const ticks = tickDamageOverTime(actor, turn.states);

  takeDamage(
    actor,
    ticks.reduce((total, tick) => total + tick.damage, 0),
  );

  const lastHeal = tryLastHeal(actor, random);

  if (record && (ticks.length > 0 || lastHeal > 0)) {
    record({
      kind: "damageOverTime",
      actor: actor.index,
      ticks,
      immune: isImmune(actor),
      lastHeal,
      hp: hpOf(),
    });
  }
};

const comboDamageTo = (
  actor: FighterState,
  target: FighterState,
  plan: ActionPlan,
) =>
  plan.comboSpent > 0
    ? Math.round(
        ((plan.effect("combo_dmg_hpp-target") * plan.comboSpent) / 100) *
          target.combatant.hp *
          weaponlessUnavoidableFactor(actor) *
          weakeningFactor(actor, target),
      )
    : 0;

const castSkill = (
  { actor, allies, enemies, states, random, record, hpOf }: Turn,
  skill: ActiveSkill,
  plan: ActionPlan,
  enemy: FighterState | null,
) => {
  paySkill(actor, skill, plan);

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
    target === actor || isImmune(target)
      ? 0
      : comboDamageTo(actor, target, plan);

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
    swingLastHeals: lastHealsOf(states, random, outcome.swings),
    hp: hpOf(),
  });

  return 1 - plan.effect("red-sa") / 100;
};

const MAX_COUNTER_CHAIN = 10;

const forcedTurnOf = (turn: Turn, actor: FighterState): Turn => {
  const sameTeam = actor.team === turn.actor.team;

  return {
    ...turn,
    actor,
    allies: sameTeam ? turn.allies : turn.enemies,
    enemies: sameTeam ? turn.enemies : turn.allies,
    record: turn.openTurn?.(),
  };
};

const takeForcedTurn = (
  turn: Turn,
  attacker: FighterState,
  defender: FighterState,
): Strike | null => {
  const forcedTurn = forcedTurnOf(turn, attacker);
  const { random, record, hpOf } = forcedTurn;

  startTurn(forcedTurn);

  if (!attacker.alive) return null;

  if (attacker.cursed) {
    attacker.cursed = false;
    record?.({ kind: "lostTurn", actor: attacker.index, stunReduction: 0 });

    return null;
  }

  if (!reaches(attacker, defender)) {
    if (canStepForward(attacker)) stepForward(forcedTurn);

    return null;
  }

  const chances = turn.inspect
    ? strikeChances(attacker, defender, NO_SKILL)
    : null;

  const hit = strike(attacker, defender, NO_SKILL, random);
  const lastHeals = lastHealsAfter(forcedTurn, attacker, defender, hit);

  record?.({
    kind: "strike",
    chances,
    actor: attacker.index,
    target: defender.index,
    fastArrow: false,
    ...hit,
    ...lastHeals,
    hp: hpOf(),
  });

  return hit;
};

const counterAttack = (
  turn: Turn,
  countering: FighterState,
  target: FighterState,
) => {
  let attacker = countering;
  let defender = target;

  for (let chain = 0; chain < MAX_COUNTER_CHAIN; chain += 1) {
    if (!attacker.alive || !defender.alive) return;

    const hit = takeForcedTurn(turn, attacker, defender);

    endTurn(attacker);

    if (!hit?.countered) return;

    [attacker, defender] = [defender, attacker];
  }
};

const attack = (
  turn: Turn,
  plan: ActionPlan,
  skillTarget: FighterState | null,
) => {
  const { actor, enemies, targeting, random, record, hpOf } = turn;
  const attacks = 1 + plan.effect("add_attacks");
  const fastArrow = random() < actor.combatant.fastArrowChance / 100;

  for (let index = 0; index < attacks; index += 1) {
    const target = skillTarget?.alive
      ? skillTarget
      : pickTarget(actor, enemies, targeting, random);

    if (target === null || !actor.alive) break;

    const chances = turn.inspect ? strikeChances(actor, target, plan) : null;

    const hit = strike(
      actor,
      target,
      plan,
      random,
      enemies.filter((enemy) => enemy !== target),
      index === attacks - 1,
    );

    const lastHeals = lastHealsAfter(turn, actor, target, hit);

    record?.({
      kind: "strike",
      chances,
      actor: actor.index,
      target: target.index,
      fastArrow: fastArrow && index === 0,
      ...hit,
      ...lastHeals,
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

const meleeEnemies = ({ actor, enemies }: Turn) =>
  enemies.filter((enemy) => enemy.alive && inMeleeContact(actor, enemy));

const skillRange =
  (actor: FighterState, skill: ActiveSkill) => (enemy: FighterState) => {
    if (skill.melee) return inMeleeContact(actor, enemy);

    return skill.attacks ? reaches(actor, enemy) : true;
  };

const act = (turn: Turn) => {
  const plan = takeAction(turn.actor, {
    reachesEnemy: reachesEnemy(turn.actor, turn.enemies),
    meleeContact: meleeEnemies(turn).length > 0,
    canStep: canStepForward(turn.actor),
  });

  if (plan === "step") return stepForward(turn);

  const skillTarget =
    plan.skill && !plan.skill.selfCast
      ? pickTarget(
          turn.actor,
          turn.enemies,
          "lowestLevel",
          () => 0,
          skillRange(turn.actor, plan.skill),
        )
      : null;

  const skillFactor = plan.skill
    ? castSkill(turn, plan.skill, plan, skillTarget)
    : 1;

  const attackFactor =
    plan.skill === null || plan.skill.attacks
      ? attack(turn, plan, skillTarget)
      : 1;

  return skillFactor * attackFactor;
};

const teammates = (
  states: readonly FighterState[],
  same: boolean,
): readonly (readonly FighterState[])[] =>
  states.map((state) =>
    states.filter((other) => (other.team === state.team) === same),
  );

export const createFightStates = (setup: FightSetup): FighterState[] => {
  const states = withAllyHealth(setup.teams).flatMap((team, teamIndex) =>
    team.map((combatant) => createState(combatant, teamIndex, 0)),
  );

  states.forEach((state, index) => {
    state.index = index;
    state.levelAdvantage = setup.levelAdvantage ?? true;
    state.clock = attackTime(state);
  });

  const enemiesOf = teammates(states, false);

  for (const state of states) {
    const weakening = state.combatant.passives.poisonWeakening;

    if (weakening <= 0) continue;

    for (const enemy of enemiesOf[state.index] ?? []) {
      addBuff(enemy, "poison_lowdmg_per", weakening, Infinity, state.index);
    }
  }

  return states;
};

export const simulateFight = (
  setup: FightSetup,
  random: () => number,
  record?: FightRecorder,
  inspect = false,
): FightResult => {
  const targeting = setup.targeting ?? "lowestLevel";
  const states = createFightStates(setup);
  const enemiesOf = teammates(states, false);
  const alliesOf = teammates(states, true);

  let turns = 0;

  const openTurn =
    record &&
    (() => {
      const number = turns;

      turns += 1;

      return (event: FightEvent) => record(event, states, number);
    });

  const hpOf = () => states.map((state) => state.hp);
  const maxMoves = MOVES_PER_PLAYER * states.length;
  let moves = 0;

  while (moves < maxMoves && livingTeams(states).size > 1) {
    const actor = nextActor(states);

    if (actor === null) break;

    const turn: Turn = {
      actor,
      states,
      allies: alliesOf[actor.index] ?? [],
      enemies: enemiesOf[actor.index] ?? [],
      targeting,
      random,
      record: openTurn?.(),
      openTurn,
      inspect,
      hpOf,
    };

    startTurn(turn);

    if (!actor.alive) continue;

    const stunned = actor.stunned;
    const lost = stunned || actor.cursed;
    const reduction = stunned ? stunReduction(actor) : 0;

    if (stunned) actor.stunned = false;
    else actor.cursed = false;

    if (lost) {
      turn.record?.({
        kind: "lostTurn",
        actor: actor.index,
        stunReduction: Math.round(100 * reduction),
      });
    }

    const timeFactor = lost ? 1 - reduction : act(turn);

    actor.clock += attackTime(actor) * timeFactor;
    actor.moves += 1;
    moves += 1;
    tickCooldowns(actor);
    endTurn(actor);
  }

  const alive = livingTeams(states);

  return {
    winner: alive.size === 1 ? ([...alive][0] ?? null) : null,
    moves,
    fighters: states.map((state) => ({
      name: state.combatant.name,
      team: state.team,
      alive: state.alive,
      hpLeft: state.hp,
      moves: state.moves,
      damageDealt: state.damageDealt,
      healed: state.healed,
      skillUses: state.skillUses,
    })),
  };
};
