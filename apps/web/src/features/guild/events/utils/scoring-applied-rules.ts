import {
  evaluateEventScoring as evaluateSharedEventScoring,
  type EventScoringContext,
  type EventScoringRules,
} from "@lootlog/domain/scoring";
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

function calculateRespawnProgressPercentage(params: {
  killTime: Date;
  respawnStartTime: Date;
  maxRespawnTime: Date | null | undefined;
}): number | undefined {
  if (!params.maxRespawnTime) {
    return undefined;
  }

  const fullWindowMs =
    params.maxRespawnTime.getTime() - params.respawnStartTime.getTime();
  if (fullWindowMs <= 0) {
    return undefined;
  }

  const elapsedWindowMs = Math.min(
    fullWindowMs,
    Math.max(0, params.killTime.getTime() - params.respawnStartTime.getTime()),
  );

  return Math.round((elapsedWindowMs / fullWindowMs) * 100);
}

function parseDateIfValid(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getMemberKillState(params: {
  participant: KillDetailParticipant;
  killTime: Date;
  respawnStartTime: Date;
}): { memberLeaveTime: Date | null; memberPresentAtKill: boolean } {
  let memberLeaveTime: Date | null = null;
  let memberPresentAtKill = false;

  for (const assignment of params.participant.mapData ?? []) {
    const assignedAt = parseDateIfValid(assignment.assignedAt);
    if (!assignedAt || assignedAt > params.killTime) {
      continue;
    }

    const unassignedAt = parseDateIfValid(assignment.unassignedAt);
    const assignmentEnd = unassignedAt ?? params.killTime;
    if (assignmentEnd < params.respawnStartTime) {
      continue;
    }

    if (!unassignedAt || unassignedAt >= params.killTime) {
      memberPresentAtKill = true;
    } else if (
      unassignedAt >= params.respawnStartTime &&
      (!memberLeaveTime || unassignedAt > memberLeaveTime)
    ) {
      memberLeaveTime = unassignedAt;
    }
  }

  return { memberLeaveTime, memberPresentAtKill };
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

export function getAppliedRuleIdsForParticipant(params: {
  kill: KillDetail;
  participant: KillDetailParticipant;
  scoringRules: EventScoringRules | null;
  assignedMembersCount: number;
}): string[] {
  const { kill, participant, scoringRules, assignedMembersCount } = params;
  if (!scoringRules) {
    return [];
  }

  const killTime = new Date(kill.killedAt);
  const minSpawnTimeAtKill = new Date(kill.minSpawnTimeAtKill);
  const maxSpawnTimeAtKill = new Date(kill.maxSpawnTimeAtKill);
  if (!Number.isFinite(killTime.getTime())) {
    return [];
  }

  const respawnStartTime =
    minSpawnTimeAtKill > killTime ? killTime : minSpawnTimeAtKill;
  const { memberLeaveTime, memberPresentAtKill } = getMemberKillState({
    participant,
    killTime,
    respawnStartTime,
  });
  const minutesSinceLeaveToKill =
    memberLeaveTime && memberLeaveTime < killTime
      ? (killTime.getTime() - memberLeaveTime.getTime()) / 60_000
      : null;
  const context: EvaluationContext = {
    trackingDurationPercentage:
      typeof participant.trackingDurationPercentage === "number" &&
      Number.isFinite(participant.trackingDurationPercentage)
        ? participant.trackingDurationPercentage
        : null,
    trackingDurationSeconds:
      typeof participant.trackingDurationSeconds === "number" &&
      Number.isFinite(participant.trackingDurationSeconds)
        ? participant.trackingDurationSeconds
        : null,
    assignedMembersCount,
    killTime,
    respawnStartTime,
    respawnDurationSeconds: Math.max(
      0,
      Math.floor((killTime.getTime() - respawnStartTime.getTime()) / 1000),
    ),
    respawnProgressPercentage: calculateRespawnProgressPercentage({
      killTime,
      respawnStartTime,
      maxRespawnTime: Number.isFinite(maxSpawnTimeAtKill.getTime())
        ? maxSpawnTimeAtKill
        : null,
    }),
    minutesSinceLeaveToKill,
    memberPresentAtKill,
    timeOnMapSeconds: participant.timeOnMapSeconds,
    afkPercentage: participant.afkPercentage,
    wasPresent: participant.wasPresent,
  };

  return evaluateEventScoring(scoringRules, context).appliedRules.map(
    (rule) => rule.ruleId,
  );
}
