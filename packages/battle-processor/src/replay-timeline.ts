import type { ParsedMove } from "./battle-log.js";
import { RANGED_PROFESSIONS } from "./replay-action-classification.js";
import {
  createSimulationState,
  extractTurnBundle,
  snapshotFromState,
  type DraftEventWeight,
  type DraftTurnBundle,
  type ReplayWarriorInput,
  type SimulationState,
} from "./replay-turn-extractor.js";

export type ReplayLayout = "16:9" | "9:16";

export type ReplayPacingMode = "smart" | "normal";

export type ReplayDamageKind =
  | "physical"
  | "distance"
  | "auxiliary"
  | "fire"
  | "frost"
  | "lightning"
  | "poison"
  | "wound"
  | "true";

export type ReplayLegendaryKind =
  | "lastHeal"
  | "curse"
  | "cleanse"
  | "glare"
  | "holyTouch"
  | "veryCrit"
  | "anguish"
  | "critShield"
  | "facade"
  | "puncture"
  | "retaliation"
  | "frenzy"
  | "unknown";

export type ReplayStatusTag = "stun" | "freeze" | "poison" | "wound" | "burn";

export type ReplayOutcomeKind =
  | "victory"
  | "defeat"
  | "draw"
  | "flee"
  | "unfinished";

export type ReplayParticipant = {
  readonly id: string;
  readonly name: string;
  readonly lvl: number;
  readonly prof: string;
  readonly team: number;
  readonly side: "left" | "right";
  readonly slotIndex: number;
  readonly teamSize: number;
  readonly icon: string;
  readonly maxHp: number;
  readonly isUser: boolean;
  readonly isRanged: boolean;
  readonly totalDamageDealt: number;
  readonly totalHealing: number;
  readonly kills: number;
};

type ReplayEventBase = {
  readonly id: string;
  readonly turn: number;
  readonly tStart: number;
  readonly tEnd: number;
  readonly isHighlight: boolean;
  readonly timeScale: number;
};

export type ReplayAttackEvent = ReplayEventBase & {
  readonly kind: "attack";
  readonly actorId: string;
  readonly targetId: string;
  readonly damage: number;
  readonly damageKind: ReplayDamageKind;
  readonly isCrit: boolean;
  readonly isVeryCrit: boolean;
  readonly isEvade: boolean;
  readonly isBlock: boolean;
  readonly isParry: boolean;
  readonly isArrowBlock: boolean;
  readonly isPierce: boolean;
  readonly isCounter: boolean;
  readonly isDeepWound: boolean;
  readonly isStun: boolean;
  readonly isFreeze: boolean;
  readonly absorbed: number;
  readonly blocked: number;
  readonly spellName: string | null;
  readonly hpDropPct: number;
  readonly isRanged: boolean;
};

type ReplayLegendaryProcEvent = ReplayEventBase & {
  readonly kind: "legendary_proc";
  readonly actorId: string;
  readonly targetId: string | null;
  readonly legendaryKind: ReplayLegendaryKind;
  readonly value: number;
};

type ReplayHealEvent = ReplayEventBase & {
  readonly kind: "heal";
  readonly actorId: string | null;
  readonly targetId: string;
  readonly amount: number;
  readonly isPassive: boolean;
  readonly isLastHeal: boolean;
};

type ReplayShieldEvent = ReplayEventBase & {
  readonly kind: "shield";
  readonly actorId: string | null;
  readonly targetId: string;
  readonly amount: number;
  readonly isMagic: boolean;
};

type ReplayDotEvent = ReplayEventBase & {
  readonly kind: "dot";
  readonly targetId: string;
  readonly damage: number;
  readonly damageKind: ReplayDamageKind;
};

type ReplayDeathEvent = ReplayEventBase & {
  readonly kind: "death";
  readonly victimId: string;
  readonly killerId: string | null;
};

type ReplayStepEvent = ReplayEventBase & {
  readonly kind: "step";
  readonly actorId: string;
  readonly targetId: string | null;
};

type ReplayFleeEvent = ReplayEventBase & {
  readonly kind: "flee";
  readonly actorId: string;
};

export type ReplayVictoryEvent = ReplayEventBase & {
  readonly kind: "victory";
  readonly winningTeam: number | null;
  readonly winnerName: string | null;
  readonly outcome: ReplayOutcomeKind;
  readonly mvpId: string | null;
  readonly mvpDamage: number;
  readonly totalTurns: number;
};

export type ReplayEvent =
  | ReplayAttackEvent
  | ReplayLegendaryProcEvent
  | ReplayHealEvent
  | ReplayShieldEvent
  | ReplayDotEvent
  | ReplayDeathEvent
  | ReplayStepEvent
  | ReplayFleeEvent
  | ReplayVictoryEvent;

type ReplaySnapshot = {
  readonly turn: number;
  readonly timeMs: number;
  readonly impactMs: number;
  readonly hpById: Record<string, number>;
  readonly rowById: Record<string, number>;
  readonly deadIds: readonly string[];
  readonly shieldById: Record<string, number>;
  readonly statusesById: Record<string, readonly ReplayStatusTag[]>;
};

export type ReplayTimeline = {
  readonly participants: readonly ReplayParticipant[];
  readonly events: readonly ReplayEvent[];
  readonly snapshots: readonly ReplaySnapshot[];
  readonly totalDurationMs: number;
  readonly actionDurationMs: number;
  readonly totalTurns: number;
  readonly pacingMode: ReplayPacingMode;
  readonly world: string;
  readonly battleType: string;
  readonly outcome: ReplayOutcomeKind;
  readonly winnerName: string | null;
  readonly mvpId: string | null;
  readonly mvpDamage: number;
};

export type ReplayBattleInput = {
  readonly characterId: string;
  readonly warriors: readonly ReplayWarriorInput[];
  readonly moves: readonly ParsedMove[];
  readonly world?: string | undefined;
  readonly battleType?: string | undefined;
  readonly matchmaking?: boolean | undefined;
  readonly winner?: string | undefined;
  readonly winningTeam?: number | undefined;
  readonly hasFlee?: boolean | undefined;
  readonly unfinished?: boolean | undefined;
  readonly pacingMode?: ReplayPacingMode | undefined;
};

export type ReplayStateAtTime = {
  readonly timeMs: number;
  readonly currentTurn: number;
  readonly hpById: Record<string, number>;
  readonly trailingHpById: Record<string, number>;
  readonly rowById: Record<string, number>;
  readonly deadIds: ReadonlySet<string>;
  readonly shieldById: Record<string, number>;
  readonly statusesById: Record<string, readonly ReplayStatusTag[]>;
  readonly activeEvents: readonly ReplayEvent[];
  readonly recentEvents: readonly ReplayEvent[];
  readonly victoryEvent: ReplayVictoryEvent | null;
  readonly victoryProgress: number;
  readonly highlightIntensity: number;
};

const TRAILING_DAMAGE_DELAY_MS = 320;

const RECENT_EVENT_WINDOW_MS = 950;

const VICTORY_SCREEN_DURATION_MS = 3200;

const SMART_TARGET_DURATION_MS = 26_000;

export const REPLAY_IMPACT_FRACTION = 0.45;

const resolveOutcome = (
  input: ReplayBattleInput,
  leftTeamNumber: number,
): ReplayOutcomeKind => {
  if (input.unfinished) return "unfinished";

  if (input.hasFlee) return "flee";

  if (input.winner === "?") return "draw";

  if (input.winningTeam === leftTeamNumber) return "victory";

  if (input.winningTeam !== undefined && input.winningTeam !== 0) {
    return "defeat";
  }

  return "draw";
};

const computeTurnDurationMs = (
  weight: DraftEventWeight,
  pacingMode: ReplayPacingMode,
  compressionRatio: number,
) => {
  if (pacingMode === "normal") {
    if (weight === "highlight") return { durationMs: 780, timeScale: 0.72 };

    if (weight === "normal") return { durationMs: 520, timeScale: 1 };

    return { durationMs: 260, timeScale: 1 };
  }

  if (weight === "highlight") {
    const durationMs = Math.round(
      Math.max(620, 820 * Math.min(1, compressionRatio + 0.25)),
    );

    return { durationMs, timeScale: 0.55 };
  }

  if (weight === "normal") {
    return {
      durationMs: Math.round(Math.max(170, 350 * compressionRatio)),
      timeScale: 1,
    };
  }

  return {
    durationMs: Math.round(Math.max(95, 180 * compressionRatio)),
    timeScale: 1,
  };
};

const buildParticipants = (
  input: ReplayBattleInput,
  state: SimulationState,
) => {
  const userWarrior = input.warriors.find(
    (warrior) => warrior.originalId === input.characterId,
  );

  const leftTeamNumber = userWarrior?.team === 2 ? 2 : 1;
  const leftWarriors: ReplayWarriorInput[] = [];
  const rightWarriors: ReplayWarriorInput[] = [];

  for (const warrior of input.warriors) {
    if (warrior.team === leftTeamNumber) {
      leftWarriors.push(warrior);
    } else {
      rightWarriors.push(warrior);
    }
  }

  const mapTeam = (
    teamWarriors: readonly ReplayWarriorInput[],
    side: "left" | "right",
  ): ReplayParticipant[] =>
    teamWarriors.map((warrior, slotIndex) => ({
      id: warrior.originalId,
      name: warrior.name,
      lvl: warrior.lvl,
      prof: warrior.prof,
      team: warrior.team,
      side,
      slotIndex,
      teamSize: teamWarriors.length,
      icon: warrior.icon,
      maxHp: warrior.maxHp ?? 0,
      isUser: warrior.originalId === input.characterId,
      isRanged: RANGED_PROFESSIONS.has(warrior.prof.toLowerCase()),
      totalDamageDealt:
        warrior.damageDealt ?? state.damageById.get(warrior.originalId) ?? 0,
      totalHealing:
        warrior.passiveHealing !== undefined ||
        warrior.activeHealing !== undefined
          ? (warrior.passiveHealing ?? 0) + (warrior.activeHealing ?? 0)
          : (state.healingById.get(warrior.originalId) ?? 0),
      kills: state.killsById.get(warrior.originalId) ?? 0,
    }));

  return {
    participants: [
      ...mapTeam(leftWarriors, "left"),
      ...mapTeam(rightWarriors, "right"),
    ],
    leftTeamNumber,
    leftCount: leftWarriors.length,
    rightCount: rightWarriors.length,
  };
};

const scheduleBundles = (
  bundles: readonly DraftTurnBundle[],
  initialSnapshot: ReplaySnapshot,
  pacingMode: ReplayPacingMode,
) => {
  let rawSmartDuration = 0;

  for (const bundle of bundles) {
    if (bundle.weight === "highlight") rawSmartDuration += 820;
    else if (bundle.weight === "normal") rawSmartDuration += 350;
    else rawSmartDuration += 180;
  }

  const compressionRatio =
    pacingMode === "smart" && rawSmartDuration > SMART_TARGET_DURATION_MS
      ? SMART_TARGET_DURATION_MS / rawSmartDuration
      : 1;

  const events: ReplayEvent[] = [];
  const snapshots: ReplaySnapshot[] = [initialSnapshot];
  let cursorMs = 280;

  for (const bundle of bundles) {
    const { durationMs, timeScale } = computeTurnDurationMs(
      bundle.weight,
      pacingMode,
      compressionRatio,
    );

    const tStart = cursorMs;
    const tEnd = cursorMs + durationMs;
    const impactMs = tStart + Math.round(durationMs * REPLAY_IMPACT_FRACTION);

    for (const draft of bundle.events) {
      const eventStart = draft.kind === "death" ? impactMs : tStart;

      events.push({
        ...draft,
        tStart: eventStart,
        tEnd,
        timeScale: draft.isHighlight ? timeScale : 1,
      });
    }

    snapshots.push({
      turn: bundle.turn,
      timeMs: tEnd,
      impactMs,
      hpById: bundle.hpById,
      rowById: bundle.rowById,
      deadIds: bundle.deadIds,
      shieldById: bundle.shieldById,
      statusesById: bundle.statusesById,
    });

    cursorMs = tEnd;
  }

  return { events, snapshots, actionDurationMs: cursorMs };
};

const findMvpParticipant = (
  participants: readonly ReplayParticipant[],
): ReplayParticipant | null => {
  let mvp: ReplayParticipant | null = null;

  for (const participant of participants) {
    if (!mvp || participant.totalDamageDealt > mvp.totalDamageDealt) {
      mvp = participant;
    }
  }

  return mvp;
};

export const buildReplayTimeline = (
  input: ReplayBattleInput,
): ReplayTimeline => {
  const pacingMode: ReplayPacingMode = input.pacingMode ?? "smart";

  const userWarrior = input.warriors.find(
    (warrior) => warrior.originalId === input.characterId,
  );

  const leftTeamNumber = userWarrior?.team === 2 ? 2 : 1;
  const state = createSimulationState(input.warriors, leftTeamNumber);

  const initialSnapshot: ReplaySnapshot = {
    turn: 0,
    timeMs: 0,
    impactMs: 0,
    ...snapshotFromState(state),
  };

  const bundles: DraftTurnBundle[] = [];

  for (const [moveIndex, move] of input.moves.entries()) {
    const bundle = extractTurnBundle(moveIndex + 1, move, state);

    if (bundle) bundles.push(bundle);
  }

  const { events, snapshots, actionDurationMs } = scheduleBundles(
    bundles,
    initialSnapshot,
    pacingMode,
  );

  const { participants, leftCount, rightCount } = buildParticipants(
    input,
    state,
  );

  const mvpParticipant = findMvpParticipant(participants);
  const outcome = resolveOutcome(input, leftTeamNumber);

  const winnerName = input.winner && input.winner !== "?" ? input.winner : null;

  const totalDurationMs = actionDurationMs + VICTORY_SCREEN_DURATION_MS;

  events.push({
    id: "victory-outro",
    turn: input.moves.length,
    kind: "victory",
    tStart: actionDurationMs,
    tEnd: totalDurationMs,
    isHighlight: true,
    timeScale: 1,
    winningTeam: input.winningTeam ?? null,
    winnerName,
    outcome,
    mvpId: mvpParticipant?.id ?? null,
    mvpDamage: mvpParticipant?.totalDamageDealt ?? 0,
    totalTurns: input.moves.length,
  });

  return {
    participants,
    events,
    snapshots,
    totalDurationMs,
    actionDurationMs,
    totalTurns: input.moves.length,
    pacingMode,
    world: input.world ?? "",
    battleType: input.battleType ?? `${leftCount}v${rightCount}`,
    outcome,
    winnerName,
    mvpId: mvpParticipant?.id ?? null,
    mvpDamage: mvpParticipant?.totalDamageDealt ?? 0,
  };
};

const findSnapshotAtTime = (
  snapshots: readonly ReplaySnapshot[],
  timeMs: number,
  moment: "timeMs" | "impactMs",
): ReplaySnapshot => {
  const first = snapshots[0];

  if (!first || timeMs <= first[moment]) {
    return (
      first ?? {
        turn: 0,
        timeMs: 0,
        impactMs: 0,
        hpById: {},
        rowById: {},
        deadIds: [],
        shieldById: {},
        statusesById: {},
      }
    );
  }

  let low = 0;
  let high = snapshots.length - 1;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = snapshots[mid];

    if (candidate && candidate[moment] <= timeMs) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return snapshots[low] ?? first;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const getReplayStateAtTime = (
  timeline: ReplayTimeline,
  rawTimeMs: number,
): ReplayStateAtTime => {
  const timeMs = Math.max(0, Math.min(timeline.totalDurationMs, rawTimeMs));

  const currentSnapshot = findSnapshotAtTime(
    timeline.snapshots,
    timeMs,
    "timeMs",
  );

  const impactSnapshot = findSnapshotAtTime(
    timeline.snapshots,
    timeMs,
    "impactMs",
  );

  const delayedSnapshot = findSnapshotAtTime(
    timeline.snapshots,
    Math.max(0, timeMs - TRAILING_DAMAGE_DELAY_MS),
    "impactMs",
  );

  const trailingHpById: Record<string, number> = {};

  for (const participant of timeline.participants) {
    const currentHp = impactSnapshot.hpById[participant.id] ?? 100;
    const delayedHp = delayedSnapshot.hpById[participant.id] ?? currentHp;

    if (delayedHp <= currentHp) {
      trailingHpById[participant.id] = currentHp;
    } else {
      const elapsedSinceChange = Math.max(0, timeMs - impactSnapshot.impactMs);

      const catchUpProgress = clamp01(
        elapsedSinceChange / TRAILING_DAMAGE_DELAY_MS,
      );

      const eased = 1 - (1 - catchUpProgress) ** 2;

      trailingHpById[participant.id] =
        delayedHp - (delayedHp - currentHp) * eased;
    }
  }

  const activeEvents: ReplayEvent[] = [];
  const recentEvents: ReplayEvent[] = [];
  let victoryEvent: ReplayVictoryEvent | null = null;
  let highlightIntensity = 0;

  for (const event of timeline.events) {
    if (event.kind === "victory") {
      if (timeMs >= event.tStart) victoryEvent = event;
      continue;
    }

    if (event.tStart > timeMs) break;

    if (timeMs <= event.tEnd) {
      activeEvents.push(event);

      if (event.isHighlight) {
        const duration = Math.max(1, event.tEnd - event.tStart);
        const progress = clamp01((timeMs - event.tStart) / duration);
        highlightIntensity = Math.max(
          highlightIntensity,
          Math.sin(progress * Math.PI),
        );
      }
    }

    if (timeMs <= event.tStart + RECENT_EVENT_WINDOW_MS) {
      recentEvents.push(event);
    }
  }

  const victoryProgress = victoryEvent
    ? clamp01(
        (timeMs - victoryEvent.tStart) /
          Math.max(1, victoryEvent.tEnd - victoryEvent.tStart),
      )
    : 0;

  return {
    timeMs,
    currentTurn: activeEvents[0]?.turn ?? currentSnapshot.turn,
    hpById: impactSnapshot.hpById,
    trailingHpById,
    rowById: currentSnapshot.rowById,
    deadIds: new Set(impactSnapshot.deadIds),
    shieldById: impactSnapshot.shieldById,
    statusesById: impactSnapshot.statusesById,
    activeEvents,
    recentEvents,
    victoryEvent,
    victoryProgress,
    highlightIntensity,
  };
};
