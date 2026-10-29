import {
  calculateRespawnProgressPercentage,
  evaluateEventScoring as evaluateSharedEventScoring,
  explainEventScoring,
  type EventScoringContext,
  type EventScoringExplanation,
  type EventScoringRules,
} from "@lootlog/domain/scoring";
import {
  analyzeEventKillPresence,
  getPresenceScoringContext,
  resolveEventScoringWindow,
  type EventKillPresence,
} from "@lootlog/domain/scoring-presence";
import type {
  KillDetail,
  KillDetailParticipant,
} from "../hooks/queries/use-kill-detail";

export type EvaluationContext = {
  trackingDurationPercentage: number | null;
  trackingDurationSeconds: number | null;
  assignedMembersCount: number;
  killTime: Date;
  respawnStartTime: Date;
  respawnDurationSeconds: number;
  respawnProgressPercentage: number | undefined;
  minutesSinceLeaveToKill: number | null;
  memberPresentAtKill: boolean;
  timeOnMapSeconds: number;
  afkPercentage: number;
  wasPresent: boolean;
  presence?: EventScoringContext["presence"];
};

export type ScoringSimulationAppliedRule = {
  ruleId: string;
  ruleName: string | null;
  points: number;
  actionType: string;
};

export type ScoringSimulationResult = {
  totalPoints: number;
  basePoints: number;
  bonusPoints: number;
  appliedRules: ScoringSimulationAppliedRule[];
};

function parseDateIfValid(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * The kill's presence analysis from every participant's assignment records,
 * built once and shared by each participant's breakdown.
 */
function analyzeKillPresence(kill: KillDetail): EventKillPresence {
  const participants = kill.points ?? [];

  return analyzeEventKillPresence({
    window: resolveEventScoringWindow({
      killedAt: new Date(kill.killedAt),
      minSpawnTimeAtKill: parseDateIfValid(kill.minSpawnTimeAtKill),
      maxSpawnTimeAtKill: parseDateIfValid(kill.maxSpawnTimeAtKill),
    }),
    participantIds: participants.map((participant) => participant.memberId),
    intervals: participants.flatMap((participant) =>
      (participant.mapData ?? []).flatMap((assignment) => {
        const start = parseDateIfValid(assignment.assignedAt);

        return start
          ? [
              {
                participantId: participant.memberId,
                start,
                end: parseDateIfValid(assignment.unassignedAt),
              },
            ]
          : [];
      }),
    ),
  });
}

function toSharedContext(context: EvaluationContext): EventScoringContext {
  return {
    eligible: true,
    trackingDurationPercentage: context.trackingDurationPercentage,
    trackingDurationSeconds: context.trackingDurationSeconds,
    assignedMembersCount: context.assignedMembersCount,
    killTime: context.killTime,
    respawnStartTime: context.respawnStartTime,
    respawnProgressPercentage: context.respawnProgressPercentage,
    minutesSinceLeaveToKill: context.minutesSinceLeaveToKill,
    memberPresentAtKill: context.memberPresentAtKill,
    timeOnMapSeconds: context.timeOnMapSeconds,
    afkPercentage: context.afkPercentage,
    wasPresent: context.wasPresent,
    presence: context.presence,
  };
}

export function evaluateEventScoring(
  rules: EventScoringRules,
  context: EvaluationContext,
): ScoringSimulationResult {
  const result = evaluateSharedEventScoring({
    mode: "ADVANCED",
    rules,
    context: toSharedContext(context),
  });

  return {
    totalPoints: result.totalPoints,
    basePoints: result.basePoints,
    bonusPoints: result.bonusPoints,
    appliedRules: result.appliedRules,
  };
}

/** The kill's shared analysis and current rules for every breakdown. */
export type KillParticipantScoring = {
  rules: EventScoringRules;
  analysis: EventKillPresence;
  explain: (participant: KillDetailParticipant) => EventScoringExplanation;
};

/**
 * Re-evaluates the event's current rules for one kill participant: tracking
 * comes from the stored kill point, presence from the kill's analysis.
 */
function explainParticipantScoring(params: {
  kill: KillDetail;
  participant: KillDetailParticipant;
  scoringRules: EventScoringRules;
  analysis: EventKillPresence;
}): EventScoringExplanation {
  const { kill, participant, scoringRules, analysis } = params;
  const presence = getPresenceScoringContext(analysis, participant.memberId);
  const { killTime, respawnStartTime } = presence;

  const minutesSinceLeaveToKill =
    presence.memberLeaveTime && presence.memberLeaveTime < killTime
      ? (killTime.getTime() - presence.memberLeaveTime.getTime()) / 60_000
      : null;

  return explainEventScoring({
    mode: "ADVANCED",
    rules: scoringRules,
    context: toSharedContext({
      trackingDurationPercentage: Number.isFinite(
        participant.trackingDurationPercentage,
      )
        ? participant.trackingDurationPercentage
        : null,
      trackingDurationSeconds: Number.isFinite(
        participant.trackingDurationSeconds,
      )
        ? participant.trackingDurationSeconds
        : null,
      assignedMembersCount: kill.points?.length ?? 0,
      killTime,
      respawnStartTime,
      respawnDurationSeconds: Math.max(
        0,
        Math.floor((killTime.getTime() - respawnStartTime.getTime()) / 1000),
      ),
      respawnProgressPercentage: calculateRespawnProgressPercentage({
        killTime,
        respawnStartTime,
        maxRespawnTime: parseDateIfValid(kill.maxSpawnTimeAtKill),
      }),
      minutesSinceLeaveToKill,
      memberPresentAtKill: presence.memberPresentAtKill,
      timeOnMapSeconds: participant.timeOnMapSeconds,
      afkPercentage: participant.afkPercentage,
      wasPresent: participant.wasPresent,
      presence: presence.presence,
    }),
  });
}

/** Current rules and presence for a kill's breakdowns, or none in simple mode. */
export function getKillParticipantScoring(
  kill: KillDetail,
  scoringRules: EventScoringRules | null,
): KillParticipantScoring | null {
  if (!scoringRules) return null;

  const analysis = analyzeKillPresence(kill);

  return {
    rules: scoringRules,
    analysis,
    explain: (participant) =>
      explainParticipantScoring({ kill, participant, scoringRules, analysis }),
  };
}
