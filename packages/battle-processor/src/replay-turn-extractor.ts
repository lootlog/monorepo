import { ACTOR_DAMAGE_TAKEN, readDamageKey } from "./action-keys.js";
import {
  parseActionValue,
  parseNamedWarrior,
  parseSignedActionValue,
  type ParsedMove,
} from "./battle-log.js";
import {
  ACTIVE_HEAL_KEYS,
  CRIT_KEYS,
  DEEP_WOUND_KEYS,
  DEFENDER_LEGENDARY_ACTIONS,
  FREEZE_KEYS,
  getInitialMargonemRow,
  HIGHLIGHT_LEGENDARIES,
  LEGENDARY_ACTION_MAP,
  PASSIVE_HEAL_KEYS,
  pickDominantDamageKind,
  RANGED_PROFESSIONS,
  resolveDamageKindFromAction,
  STUN_KEYS,
} from "./replay-action-classification.js";
import type {
  ReplayDamageKind,
  ReplayEvent,
  ReplayStatusTag,
  ReplayVictoryEvent,
} from "./replay-timeline.js";
import { normalizeName } from "./warrior.js";

export type ReplayWarriorInput = {
  readonly originalId: string;
  readonly name: string;
  readonly lvl: number;
  readonly prof: string;
  readonly icon: string;
  readonly team: number;
  readonly maxHp?: number | undefined;
  readonly damageDealt?: number | undefined;
  readonly passiveHealing?: number | undefined;
  readonly activeHealing?: number | undefined;
};

export type DraftEventWeight = "minor" | "normal" | "highlight";

type OmitTiming<T> = T extends ReplayEvent
  ? Omit<T, "tStart" | "tEnd" | "timeScale">
  : never;

type DraftReplayEvent = OmitTiming<Exclude<ReplayEvent, ReplayVictoryEvent>>;

export type DraftTurnBundle = {
  readonly turn: number;
  readonly weight: DraftEventWeight;
  readonly events: readonly DraftReplayEvent[];
  readonly hpById: Record<string, number>;
  readonly rowById: Record<string, number>;
  readonly deadIds: readonly string[];
  readonly shieldById: Record<string, number>;
  readonly statusesById: Record<string, readonly ReplayStatusTag[]>;
};

export type SimulationState = {
  readonly warriorsById: Map<string, ReplayWarriorInput>;
  readonly idByNormalizedName: Map<string, string>;
  readonly hpById: Map<string, number>;
  readonly rowById: Map<string, number>;
  readonly leftTeamNumber: number;
  readonly deadIds: Set<string>;
  readonly shieldById: Map<string, number>;
  readonly statusesById: Map<string, Set<ReplayStatusTag>>;
  readonly damageById: Map<string, number>;
  readonly healingById: Map<string, number>;
  readonly killsById: Map<string, number>;
  readonly lastOpponentById: Map<string, string>;
  eventCounter: number;
};

type TurnAccumulator = {
  readonly turn: number;
  readonly attackerId: string | null;
  readonly defenderId: string | null;
  readonly attacker: ReplayWarriorInput | undefined;
  readonly defender: ReplayWarriorInput | undefined;
  readonly hasTakenDamage: boolean;
  readonly damageKindTotals: Map<ReplayDamageKind, number>;
  readonly draftEvents: DraftReplayEvent[];
  attackDamage: number;
  isCrit: boolean;
  isVeryCrit: boolean;
  isEvade: boolean;
  isBlock: boolean;
  isParry: boolean;
  isArrowBlock: boolean;
  isPierce: boolean;
  isCounter: boolean;
  isDeepWound: boolean;
  isStun: boolean;
  isFreeze: boolean;
  absorbed: number;
  blocked: number;
  spellName: string | null;
  hasAttackSignal: boolean;
  hasStep: boolean;
};

export const createSimulationState = (
  warriors: readonly ReplayWarriorInput[],
  leftTeamNumber: number,
): SimulationState => {
  const warriorsById = new Map<string, ReplayWarriorInput>();
  const idByNormalizedName = new Map<string, string>();
  const hpById = new Map<string, number>();
  const rowById = new Map<string, number>();
  const shieldById = new Map<string, number>();
  const statusesById = new Map<string, Set<ReplayStatusTag>>();

  for (const warrior of warriors) {
    const isBottomTeam = warrior.team === leftTeamNumber;
    warriorsById.set(warrior.originalId, warrior);
    idByNormalizedName.set(normalizeName(warrior.name), warrior.originalId);
    hpById.set(warrior.originalId, 100);
    rowById.set(
      warrior.originalId,
      getInitialMargonemRow(warrior.prof, isBottomTeam),
    );
    shieldById.set(warrior.originalId, 0);
    statusesById.set(warrior.originalId, new Set());
  }

  return {
    warriorsById,
    idByNormalizedName,
    hpById,
    rowById,
    leftTeamNumber,
    deadIds: new Set(),
    shieldById,
    statusesById,
    damageById: new Map(),
    healingById: new Map(),
    killsById: new Map(),
    lastOpponentById: new Map(),
    eventCounter: 0,
  };
};

const nextEventId = (state: SimulationState, turn: number): string => {
  state.eventCounter += 1;

  return `t${turn}-e${state.eventCounter}`;
};

export const snapshotFromState = (
  state: SimulationState,
): Pick<
  DraftTurnBundle,
  "hpById" | "rowById" | "deadIds" | "shieldById" | "statusesById"
> => ({
  hpById: Object.fromEntries(state.hpById),
  rowById: Object.fromEntries(state.rowById),
  deadIds: Array.from(state.deadIds),
  shieldById: Object.fromEntries(state.shieldById),
  statusesById: Object.fromEntries(
    Array.from(state.statusesById, ([id, tags]) => [id, Array.from(tags)]),
  ),
});

const describeObservedState = (state: SimulationState) =>
  JSON.stringify(snapshotFromState(state));

const observeHpAndDeath = (
  state: SimulationState,
  draftEvents: DraftReplayEvent[],
  turn: number,
  victimId: string | null,
  hp: number | null,
  killerId: string | null,
): void => {
  if (!victimId || hp === null || Number.isNaN(hp)) return;

  const prevHp = state.hpById.get(victimId) ?? 100;
  state.hpById.set(victimId, Math.max(0, Math.min(100, hp)));

  if (hp > 0) {
    state.deadIds.delete(victimId);

    return;
  }

  if (prevHp > 0 && !state.deadIds.has(victimId)) {
    state.deadIds.add(victimId);
    state.statusesById.get(victimId)?.clear();
    addStat(state.killsById, killerId, 1);

    draftEvents.push({
      id: nextEventId(state, turn),
      turn,
      kind: "death",
      victimId,
      killerId,
      isHighlight: true,
    });
  }
};

const addStatus = (
  state: SimulationState,
  warriorId: string | null,
  tag: ReplayStatusTag,
): void => {
  if (warriorId) state.statusesById.get(warriorId)?.add(tag);
};

const addStat = (
  map: Map<string, number>,
  actorId: string | null,
  amount: number,
): void => {
  if (!actorId || amount <= 0) return;
  map.set(actorId, (map.get(actorId) ?? 0) + amount);
};

const findNamedWarriorId = (
  state: SimulationState,
  param: string,
  index: number,
) => {
  const named = parseNamedWarrior(param, index);

  if (!named) return { id: null, hpPercentage: null };

  return {
    id: state.idByNormalizedName.get(normalizeName(named.name)) ?? null,
    hpPercentage: named.hpPercentage,
  };
};

const processOtherDamageAction = (
  acc: TurnAccumulator,
  state: SimulationState,
  param: string,
  value: number,
): void => {
  const named = findNamedWarriorId(state, param, 2);
  const victim = named.id ? state.warriorsById.get(named.id) : acc.defender;

  const isReflected = Boolean(
    acc.attacker && victim && victim.team === acc.attacker.team,
  );

  if (named.id && named.hpPercentage !== null) {
    if (named.id === acc.attackerId || named.id === acc.defenderId) {
      observeHpAndDeath(
        state,
        acc.draftEvents,
        acc.turn,
        named.id,
        named.hpPercentage,
        named.id === acc.attackerId ? acc.defenderId : acc.attackerId,
      );
    } else {
      state.hpById.set(named.id, named.hpPercentage);
    }
  }

  if (!isReflected) {
    acc.hasAttackSignal = true;
    acc.attackDamage += value;
    acc.damageKindTotals.set(
      "true",
      (acc.damageKindTotals.get("true") ?? 0) + value,
    );

    return;
  }

  if (named.id) {
    acc.draftEvents.push({
      id: nextEventId(state, acc.turn),
      turn: acc.turn,
      kind: "dot",
      targetId: named.id,
      damage: value,
      damageKind: "true",
      isHighlight: false,
    });
  }
};

const processDamageAction = (
  acc: TurnAccumulator,
  state: SimulationState,
  actionType: string,
  param: string,
  value: number,
): boolean => {
  const damageKey = readDamageKey(actionType);

  if (damageKey) {
    acc.hasAttackSignal = true;

    if (
      damageKey.side === "taken" ||
      (damageKey.side === "dealt" && !acc.hasTakenDamage)
    ) {
      acc.attackDamage += value;
      const kind = resolveDamageKindFromAction(actionType);
      acc.damageKindTotals.set(
        kind,
        (acc.damageKindTotals.get(kind) ?? 0) + value,
      );
    }

    return true;
  }

  if (actionType === "+oth_dmg") {
    processOtherDamageAction(acc, state, param, value);

    return true;
  }

  if (ACTOR_DAMAGE_TAKEN.has(actionType) && acc.attackerId && value > 0) {
    const dotKind = resolveDamageKindFromAction(actionType);

    if (dotKind === "poison") addStatus(state, acc.attackerId, "poison");

    if (dotKind === "wound") addStatus(state, acc.attackerId, "wound");

    if (dotKind === "fire") addStatus(state, acc.attackerId, "burn");

    acc.draftEvents.push({
      id: nextEventId(state, acc.turn),
      turn: acc.turn,
      kind: "dot",
      targetId: acc.attackerId,
      damage: value,
      damageKind: dotKind,
      isHighlight: false,
    });

    return true;
  }

  return false;
};

const processCombatModifier = (
  acc: TurnAccumulator,
  state: SimulationState,
  actionType: string,
  value: number,
): void => {
  if (CRIT_KEYS.has(actionType)) {
    acc.isCrit = true;

    if (actionType === "+verycrit" || actionType === "+legbon_verycrit") {
      acc.isVeryCrit = true;
    }
  }

  if (actionType === "-evade") {
    acc.isEvade = true;
    acc.hasAttackSignal = true;
  } else if (actionType === "-blok" || actionType === "-pierceb") {
    acc.isBlock = true;
    acc.blocked += value;
    acc.hasAttackSignal = true;
  } else if (actionType === "-parry") {
    acc.isParry = true;
    acc.hasAttackSignal = true;
  } else if (actionType === "-arrowblock") {
    acc.isArrowBlock = true;
    acc.hasAttackSignal = true;
  } else if (actionType === "+pierce") {
    acc.isPierce = true;
  } else if (actionType === "-contra") {
    acc.isCounter = true;
  }

  if (DEEP_WOUND_KEYS.has(actionType)) {
    acc.isDeepWound = true;
    addStatus(state, acc.defenderId, "wound");
  }

  if (STUN_KEYS.has(actionType)) {
    acc.isStun = true;
    addStatus(state, acc.defenderId, "stun");
  }

  if (FREEZE_KEYS.has(actionType)) {
    acc.isFreeze = true;
    addStatus(state, acc.defenderId, "freeze");
  }
};

const processShieldAction = (
  acc: TurnAccumulator,
  state: SimulationState,
  actionType: string,
  value: number,
): void => {
  const targetId = acc.defenderId ?? acc.attackerId;

  if (!targetId) return;

  if (actionType === "-absorb" || actionType === "-absorbm") {
    acc.absorbed += value;
    state.shieldById.set(
      targetId,
      Math.max(0, (state.shieldById.get(targetId) ?? 0) - value),
    );

    return;
  }

  if ((actionType === "+absorb" || actionType === "+absorbm") && value > 0) {
    state.shieldById.set(
      targetId,
      (state.shieldById.get(targetId) ?? 0) + value,
    );
    acc.draftEvents.push({
      id: nextEventId(state, acc.turn),
      turn: acc.turn,
      kind: "shield",
      actorId: acc.attackerId,
      targetId,
      amount: value,
      isMagic: actionType === "+absorbm",
      isHighlight: false,
    });
  }
};

const processLegendaryAction = (
  acc: TurnAccumulator,
  state: SimulationState,
  actionType: string,
  param: string,
  value: number,
): void => {
  const legendaryKind = LEGENDARY_ACTION_MAP.get(actionType);

  if (!legendaryKind) return;

  const namedId =
    actionType === "legbon_lastheal"
      ? findNamedWarriorId(state, param, 1).id
      : null;

  const ownerId =
    namedId ??
    (DEFENDER_LEGENDARY_ACTIONS.has(actionType)
      ? (acc.defenderId ?? acc.attackerId)
      : (acc.attackerId ?? acc.defenderId));

  if (legendaryKind === "cleanse" && ownerId) {
    state.statusesById.get(ownerId)?.clear();
  }

  if (!ownerId) return;

  acc.draftEvents.push({
    id: nextEventId(state, acc.turn),
    turn: acc.turn,
    kind: "legendary_proc",
    actorId: ownerId,
    targetId: ownerId === acc.attackerId ? acc.defenderId : acc.attackerId,
    legendaryKind,
    value,
    isHighlight: HIGHLIGHT_LEGENDARIES.has(legendaryKind),
  });
};

const processHealingAction = (
  acc: TurnAccumulator,
  state: SimulationState,
  actionType: string,
  param: string,
  value: number,
): void => {
  if (!PASSIVE_HEAL_KEYS.has(actionType) && !ACTIVE_HEAL_KEYS.has(actionType)) {
    return;
  }

  const amount = actionType === "heal" ? parseSignedActionValue(param) : value;

  if (amount <= 0) return;

  const namedId =
    actionType === "legbon_lastheal"
      ? findNamedWarriorId(state, param, 1).id
      : null;

  const targetId =
    namedId ??
    (actionType === "heal_target" || actionType === "legbon_lastheal"
      ? (acc.defenderId ?? acc.attackerId)
      : acc.attackerId);

  if (!targetId) return;

  const healerId = namedId ?? acc.attackerId;
  addStat(state.healingById, healerId ?? targetId, amount);
  acc.draftEvents.push({
    id: nextEventId(state, acc.turn),
    turn: acc.turn,
    kind: "heal",
    actorId: healerId,
    targetId,
    amount,
    isPassive: PASSIVE_HEAL_KEYS.has(actionType),
    isLastHeal: actionType === "legbon_lastheal",
    isHighlight: actionType === "legbon_lastheal",
  });
};

const advanceStepRow = (
  state: SimulationState,
  actorId: string,
  team: number | undefined,
): void => {
  const currentRow = state.rowById.get(actorId);

  if (currentRow === undefined) return;

  const isBottomTeam = team === state.leftTeamNumber;

  const nextRow = isBottomTeam
    ? Math.max(1, currentRow - 1)
    : Math.min(4, currentRow + 1);

  state.rowById.set(actorId, nextRow);
};

const finalizeAttackOrStep = (
  acc: TurnAccumulator,
  state: SimulationState,
  prevDefenderHp: number,
  defenderHpAfter: number | null,
): void => {
  const nextDefenderHp = defenderHpAfter ?? prevDefenderHp;
  const hpDropPct = Math.max(0, prevDefenderHp - nextDefenderHp);

  if (acc.hasAttackSignal && acc.attackerId && acc.defenderId) {
    const prof = (acc.attacker?.prof ?? "").toLowerCase();

    const defaultKind: ReplayDamageKind = RANGED_PROFESSIONS.has(prof)
      ? "distance"
      : "physical";

    const damageKind = pickDominantDamageKind(
      acc.damageKindTotals,
      defaultKind,
    );

    const isRangedAttack =
      damageKind === "distance" ||
      damageKind === "fire" ||
      damageKind === "frost" ||
      damageKind === "lightning" ||
      RANGED_PROFESSIONS.has(prof);

    const isBigHighlight =
      acc.isVeryCrit || (acc.isCrit && hpDropPct >= 20) || hpDropPct >= 30;

    addStat(state.damageById, acc.attackerId, acc.attackDamage);

    acc.draftEvents.unshift({
      id: nextEventId(state, acc.turn),
      turn: acc.turn,
      kind: "attack",
      actorId: acc.attackerId,
      targetId: acc.defenderId,
      damage: acc.attackDamage,
      damageKind,
      isCrit: acc.isCrit,
      isVeryCrit: acc.isVeryCrit,
      isEvade: acc.isEvade,
      isBlock: acc.isBlock,
      isParry: acc.isParry,
      isArrowBlock: acc.isArrowBlock,
      isPierce: acc.isPierce,
      isCounter: acc.isCounter,
      isDeepWound: acc.isDeepWound,
      isStun: acc.isStun,
      isFreeze: acc.isFreeze,
      absorbed: acc.absorbed,
      blocked: acc.blocked,
      spellName: acc.spellName,
      hpDropPct,
      isRanged: isRangedAttack,
      isHighlight: isBigHighlight,
    });

    return;
  }

  if (acc.hasStep && acc.attackerId) {
    advanceStepRow(state, acc.attackerId, acc.attacker?.team);

    acc.draftEvents.push({
      id: nextEventId(state, acc.turn),
      turn: acc.turn,
      kind: "step",
      actorId: acc.attackerId,
      targetId: acc.defenderId,
      isHighlight: false,
    });
  }
};

const classifyBundleWeight = (
  draftEvents: readonly DraftReplayEvent[],
): DraftEventWeight => {
  if (draftEvents.some((event) => event.isHighlight)) return "highlight";

  const hasMainAction = draftEvents.some(
    (event) =>
      event.kind === "attack" ||
      event.kind === "legendary_proc" ||
      (event.kind === "heal" && !event.isPassive),
  );

  return hasMainAction ? "normal" : "minor";
};

const processTurnAction = (
  acc: TurnAccumulator,
  state: SimulationState,
  actionType: string,
  param: string,
): void => {
  if (actionType === "tspell") {
    acc.spellName = param || null;

    return;
  }

  if (actionType === "step") {
    acc.hasStep = true;

    return;
  }

  if (actionType === "flee" && acc.attackerId) {
    acc.draftEvents.push({
      id: nextEventId(state, acc.turn),
      turn: acc.turn,
      kind: "flee",
      actorId: acc.attackerId,
      isHighlight: true,
    });

    return;
  }

  const value = parseActionValue(param);

  if (processDamageAction(acc, state, actionType, param, value)) return;

  processCombatModifier(acc, state, actionType, value);
  processShieldAction(acc, state, actionType, value);
  processLegendaryAction(acc, state, actionType, param, value);
  processHealingAction(acc, state, actionType, param, value);
};

export const extractTurnBundle = (
  turn: number,
  move: ParsedMove,
  state: SimulationState,
): DraftTurnBundle | null => {
  const { attackerId, defenderId } = move;
  const attacker = attackerId ? state.warriorsById.get(attackerId) : undefined;
  const defender = defenderId ? state.warriorsById.get(defenderId) : undefined;

  if (
    attackerId &&
    defenderId &&
    attacker &&
    defender &&
    attacker.team !== defender.team
  ) {
    state.lastOpponentById.set(defenderId, attackerId);
  }

  const prevDefenderHp = defenderId ? (state.hpById.get(defenderId) ?? 100) : 0;

  const acc: TurnAccumulator = {
    turn,
    attackerId,
    defenderId,
    attacker,
    defender,
    hasTakenDamage: move.actions.some(
      (action) => readDamageKey(action.actionType)?.side === "taken",
    ),
    damageKindTotals: new Map(),
    draftEvents: [],
    attackDamage: 0,
    isCrit: false,
    isVeryCrit: false,
    isEvade: false,
    isBlock: false,
    isParry: false,
    isArrowBlock: false,
    isPierce: false,
    isCounter: false,
    isDeepWound: false,
    isStun: false,
    isFreeze: false,
    absorbed: 0,
    blocked: 0,
    spellName: null,
    hasAttackSignal: false,
    hasStep: false,
  };

  const observedBefore = describeObservedState(state);

  for (const { actionType, param } of move.actions) {
    processTurnAction(acc, state, actionType, param);
  }

  finalizeAttackOrStep(acc, state, prevDefenderHp, move.defenderHpPercentage);

  observeHpAndDeath(
    state,
    acc.draftEvents,
    turn,
    defenderId,
    move.defenderHpPercentage,
    attackerId,
  );

  const fallbackKiller = attackerId
    ? (state.lastOpponentById.get(attackerId) ?? null)
    : null;

  observeHpAndDeath(
    state,
    acc.draftEvents,
    turn,
    attackerId,
    move.attackerHpPercentage,
    defenderId ?? fallbackKiller,
  );

  if (
    acc.draftEvents.length === 0 &&
    describeObservedState(state) === observedBefore
  ) {
    return null;
  }

  return {
    turn,
    weight: classifyBundleWeight(acc.draftEvents),
    events: acc.draftEvents,
    ...snapshotFromState(state),
  };
};
