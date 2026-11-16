import {
  calculateRespawnProgressPercentage,
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  evaluateEventScoring,
  normalizeEventScoringMode,
  normalizeEventScoringRules,
  type EventScoringAppliedBonus,
  type EventScoringContext,
  type EventScoringMode,
  type EventScoringRules,
} from "@lootlog/domain/scoring";

type CalculateMemberPointsParams = {
  scoringMode?: EventScoringMode;
  scoringRules?: EventScoringRules | null;
  eligible: boolean;
  trackingDurationPercentage?: number;
  trackingDurationSeconds?: number;
  assignedMembersCount: number;
  killTime: Date;
  respawnStartTime: Date;
  maxRespawnTime?: Date | null;
  memberLeaveTime?: Date | null;
  memberPresentAtKill: boolean;
  timeOnMapSeconds: number;
  afkPercentage: number;
  wasPresent: boolean;
  presence?: EventScoringContext["presence"];
};

type CalculatedMemberPoints = {
  totalPoints: number;
  basePoints: number;
  bonusPoints: number;
  appliedBonuses: EventScoringAppliedBonus[];
};

export function calculateMemberPoints(
  params: CalculateMemberPointsParams,
): CalculatedMemberPoints {
  const scoringMode = normalizeEventScoringMode(params.scoringMode);

  const scoringRules =
    scoringMode === "ADVANCED"
      ? normalizeEventScoringRules(
          params.scoringRules ?? DEFAULT_ADVANCED_EVENT_SCORING_RULES,
        )
      : DEFAULT_ADVANCED_EVENT_SCORING_RULES;

  const normalizedRespawnStartTime =
    params.respawnStartTime > params.killTime
      ? params.killTime
      : params.respawnStartTime;

  const respawnProgressPercentage = calculateRespawnProgressPercentage({
    killTime: params.killTime,
    respawnStartTime: normalizedRespawnStartTime,
    maxRespawnTime: params.maxRespawnTime,
  });

  return evaluateEventScoring({
    mode: scoringMode,
    rules: scoringRules,
    context: {
      eligible: params.eligible,
      trackingDurationPercentage: params.trackingDurationPercentage,
      trackingDurationSeconds: params.trackingDurationSeconds,
      respawnProgressPercentage,
      assignedMembersCount: params.assignedMembersCount,
      killTime: params.killTime,
      respawnStartTime: normalizedRespawnStartTime,
      memberLeaveTime: params.memberLeaveTime,
      memberPresentAtKill: params.memberPresentAtKill,
      timeOnMapSeconds: params.timeOnMapSeconds,
      afkPercentage: params.afkPercentage,
      wasPresent: params.wasPresent,
      presence: params.presence,
    },
  });
}
