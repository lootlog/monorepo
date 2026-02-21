import {
  DEFAULT_EVENT_SCORING_RULES,
  type EventScoringRules,
} from "../types/scoring-rules";

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toNumber = (value: unknown, fallback: number, min = 0, max?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  const bounded = Math.max(min, value);
  if (max === undefined) {
    return bounded;
  }

  return Math.min(max, bounded);
};

const toClock = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }

  return CLOCK_PATTERN.test(value) ? value : fallback;
};

export const normalizeScoringRules = (
  value: Partial<EventScoringRules> | null | undefined,
): EventScoringRules => {
  const baseThresholds = Array.isArray(value?.baseThresholds)
    ? value.baseThresholds
        .filter(
          (threshold): threshold is { percentage: number; points: number } => {
            return (
              typeof threshold?.percentage === "number" &&
              typeof threshold?.points === "number"
            );
          },
        )
        .map((threshold) => ({
          percentage: toNumber(threshold.percentage, 0, 0, 100),
          points: toNumber(threshold.points, 0, 0),
        }))
        .sort((a, b) => b.percentage - a.percentage)
    : [];

  const minAssignedMembers = Math.floor(
    toNumber(
      value?.groupBonus?.minAssignedMembers,
      DEFAULT_EVENT_SCORING_RULES.groupBonus.minAssignedMembers,
      0,
    ),
  );
  const maxAssignedMembers = Math.floor(
    toNumber(
      value?.groupBonus?.maxAssignedMembers,
      DEFAULT_EVENT_SCORING_RULES.groupBonus.maxAssignedMembers,
      0,
    ),
  );

  return {
    baseThresholds:
      baseThresholds.length > 0
        ? baseThresholds
        : DEFAULT_EVENT_SCORING_RULES.baseThresholds.map((threshold) => ({
            ...threshold,
          })),
    leaveGraceMinutes: Math.floor(
      toNumber(
        value?.leaveGraceMinutes,
        DEFAULT_EVENT_SCORING_RULES.leaveGraceMinutes,
        0,
      ),
    ),
    groupBonus: {
      minAssignedMembers: Math.min(minAssignedMembers, maxAssignedMembers),
      maxAssignedMembers: Math.max(minAssignedMembers, maxAssignedMembers),
      points: toNumber(
        value?.groupBonus?.points,
        DEFAULT_EVENT_SCORING_RULES.groupBonus.points,
        0,
      ),
    },
    nightBonus: {
      windowStart: toClock(
        value?.nightBonus?.windowStart,
        DEFAULT_EVENT_SCORING_RULES.nightBonus.windowStart,
      ),
      windowEnd: toClock(
        value?.nightBonus?.windowEnd,
        DEFAULT_EVENT_SCORING_RULES.nightBonus.windowEnd,
      ),
      requiredCoveragePercentage: toNumber(
        value?.nightBonus?.requiredCoveragePercentage,
        DEFAULT_EVENT_SCORING_RULES.nightBonus.requiredCoveragePercentage,
        0,
        100,
      ),
      points: toNumber(
        value?.nightBonus?.points,
        DEFAULT_EVENT_SCORING_RULES.nightBonus.points,
        0,
      ),
    },
    pvpBonus: {
      windowStart: toClock(
        value?.pvpBonus?.windowStart,
        DEFAULT_EVENT_SCORING_RULES.pvpBonus.windowStart,
      ),
      windowEnd: toClock(
        value?.pvpBonus?.windowEnd,
        DEFAULT_EVENT_SCORING_RULES.pvpBonus.windowEnd,
      ),
      points: toNumber(
        value?.pvpBonus?.points,
        DEFAULT_EVENT_SCORING_RULES.pvpBonus.points,
        0,
      ),
    },
    hardCapPoints: toNumber(
      value?.hardCapPoints,
      DEFAULT_EVENT_SCORING_RULES.hardCapPoints,
      0,
    ),
    timezone:
      typeof value?.timezone === "string" && value.timezone.length > 0
        ? value.timezone
        : DEFAULT_EVENT_SCORING_RULES.timezone,
  };
};
