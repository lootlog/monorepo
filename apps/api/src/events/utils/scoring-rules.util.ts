import {
  DEFAULT_EVENT_SCORING_RULES,
  EVENT_SCORING_TIMEZONE,
  type EventScoringRules,
  type EventScoringThreshold,
} from '../constants/scoring-rules.constant';

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toNonNegativeNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, value);
}

function toNumberInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function toClock(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  return CLOCK_PATTERN.test(value) ? value : fallback;
}

function normalizeBaseThresholds(value: unknown): EventScoringThreshold[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_EVENT_SCORING_RULES.baseThresholds];
  }

  const parsed = value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const percentage = toNumberInRange(entry.percentage, NaN, 0, 100);
      const points = toNonNegativeNumber(entry.points, NaN);

      if (!Number.isFinite(percentage) || !Number.isFinite(points)) {
        return null;
      }

      return {
        percentage: Math.round(percentage * 100) / 100,
        points: Math.round(points * 100) / 100,
      };
    })
    .filter((entry): entry is EventScoringThreshold => entry !== null)
    .sort((a, b) => b.percentage - a.percentage);

  return parsed.length > 0
    ? parsed
    : [...DEFAULT_EVENT_SCORING_RULES.baseThresholds];
}

function normalizeTimezone(_value: unknown): string {
  return EVENT_SCORING_TIMEZONE;
}

export function normalizeEventScoringRules(value: unknown): EventScoringRules {
  const source = isRecord(value) ? value : {};

  const baseThresholds = normalizeBaseThresholds(source.baseThresholds);

  const groupBonusSource = isRecord(source.groupBonus) ? source.groupBonus : {};
  const nightBonusSource = isRecord(source.nightBonus) ? source.nightBonus : {};
  const pvpBonusSource = isRecord(source.pvpBonus) ? source.pvpBonus : {};

  const minAssignedMembers = Math.floor(
    toNonNegativeNumber(
      groupBonusSource.minAssignedMembers,
      DEFAULT_EVENT_SCORING_RULES.groupBonus.minAssignedMembers,
    ),
  );
  const maxAssignedMembers = Math.floor(
    toNonNegativeNumber(
      groupBonusSource.maxAssignedMembers,
      DEFAULT_EVENT_SCORING_RULES.groupBonus.maxAssignedMembers,
    ),
  );

  return {
    baseThresholds,
    leaveGraceMinutes: Math.floor(
      toNonNegativeNumber(
        source.leaveGraceMinutes,
        DEFAULT_EVENT_SCORING_RULES.leaveGraceMinutes,
      ),
    ),
    groupBonus: {
      minAssignedMembers: Math.min(minAssignedMembers, maxAssignedMembers),
      maxAssignedMembers: Math.max(minAssignedMembers, maxAssignedMembers),
      points: toNonNegativeNumber(
        groupBonusSource.points,
        DEFAULT_EVENT_SCORING_RULES.groupBonus.points,
      ),
    },
    nightBonus: {
      windowStart: toClock(
        nightBonusSource.windowStart,
        DEFAULT_EVENT_SCORING_RULES.nightBonus.windowStart,
      ),
      windowEnd: toClock(
        nightBonusSource.windowEnd,
        DEFAULT_EVENT_SCORING_RULES.nightBonus.windowEnd,
      ),
      requiredCoveragePercentage: toNumberInRange(
        nightBonusSource.requiredCoveragePercentage,
        DEFAULT_EVENT_SCORING_RULES.nightBonus.requiredCoveragePercentage,
        0,
        100,
      ),
      points: toNonNegativeNumber(
        nightBonusSource.points,
        DEFAULT_EVENT_SCORING_RULES.nightBonus.points,
      ),
    },
    pvpBonus: {
      windowStart: toClock(
        pvpBonusSource.windowStart,
        DEFAULT_EVENT_SCORING_RULES.pvpBonus.windowStart,
      ),
      windowEnd: toClock(
        pvpBonusSource.windowEnd,
        DEFAULT_EVENT_SCORING_RULES.pvpBonus.windowEnd,
      ),
      points: toNonNegativeNumber(
        pvpBonusSource.points,
        DEFAULT_EVENT_SCORING_RULES.pvpBonus.points,
      ),
    },
    hardCapPoints: toNonNegativeNumber(
      source.hardCapPoints,
      DEFAULT_EVENT_SCORING_RULES.hardCapPoints,
    ),
    timezone: normalizeTimezone(source.timezone),
  };
}
