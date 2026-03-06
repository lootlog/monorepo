import type {
  EventScoringCondition,
  EventScoringMode,
  EventScoringNumericOperator,
  EventScoringRules,
} from '../constants/scoring-rules.constant';
import {
  calculateLocalWindowOverlapMs,
  isLocalTimeInRange,
} from './scoring-time.util';

export type EventScoringContext = {
  eligible: boolean;
  trackingDurationPercentage?: number;
  trackingDurationSeconds?: number;
  respawnProgressPercentage?: number;
  assignedMembersCount: number;
  killTime: Date;
  respawnStartTime: Date;
  memberLeaveTime?: Date | null;
  memberPresentAtKill: boolean;
  timeOnMapSeconds: number;
  afkPercentage: number;
  wasPresent: boolean;
};

export type EventScoringResult = {
  totalPoints: number;
  basePoints: number;
  bonusPoints: number;
  appliedBonuses: EventScoringAppliedBonus[];
};

export type EventScoringAppliedBonus = {
  ruleId: string;
  ruleName: string | null;
  points: number;
};

function compareNumeric(
  left: number,
  operator: EventScoringNumericOperator,
  right: number,
): boolean {
  switch (operator) {
    case '>':
      return left > right;
    case '>=':
      return left >= right;
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    default:
      return false;
  }
}

function evaluateCondition(params: {
  condition: EventScoringCondition;
  rules: EventScoringRules;
  context: EventScoringContext;
  minutesSinceLeaveToKill: number | null;
  respawnDurationSeconds: number;
}): boolean {
  const { condition, rules, context, minutesSinceLeaveToKill } = params;

  if (condition.type === 'NUMERIC') {
    let left: number | null = null;
    switch (condition.factor) {
      case 'trackingDurationPercentage':
        left = context.trackingDurationPercentage ?? null;
        break;
      case 'trackingDurationSeconds':
        left = context.trackingDurationSeconds ?? null;
        break;
      case 'assignedMembersCount':
        left = context.assignedMembersCount;
        break;
      case 'minutesSinceLeaveToKill':
        left = minutesSinceLeaveToKill;
        break;
      case 'timeOnMapSeconds':
        left = context.timeOnMapSeconds;
        break;
      case 'afkPercentage':
        left = context.afkPercentage;
        break;
      case 'respawnDurationSeconds':
        left = params.respawnDurationSeconds;
        break;
      case 'respawnProgressPercentage':
        left = context.respawnProgressPercentage ?? null;
        break;
      default:
        left = null;
    }

    if (left === null || !Number.isFinite(left)) {
      return false;
    }

    return compareNumeric(left, condition.operator, condition.value);
  }

  if (condition.type === 'BOOLEAN') {
    switch (condition.factor) {
      case 'eligible':
        return context.eligible === condition.value;
      case 'memberPresentAtKill':
        return context.memberPresentAtKill === condition.value;
      case 'wasPresent':
        return context.wasPresent === condition.value;
      default:
        return false;
    }
  }

  if (condition.type === 'KILL_TIME_IN_WINDOW') {
    return isLocalTimeInRange({
      date: context.killTime,
      timeZone: rules.timezone,
      from: condition.from,
      to: condition.to,
    });
  }

  if (context.killTime <= context.respawnStartTime) {
    return false;
  }

  const totalDurationMs =
    context.killTime.getTime() - context.respawnStartTime.getTime();
  if (totalDurationMs <= 0) {
    return false;
  }

  const overlapMs = calculateLocalWindowOverlapMs({
    startUtc: context.respawnStartTime,
    endUtc: context.killTime,
    timeZone: rules.timezone,
    windowFrom: condition.from,
    windowTo: condition.to,
  });
  const overlapPercentage = (overlapMs / totalDurationMs) * 100;
  return compareNumeric(overlapPercentage, condition.operator, condition.value);
}

export function evaluateEventScoring(params: {
  mode: EventScoringMode;
  rules: EventScoringRules;
  context: EventScoringContext;
}): EventScoringResult {
  const { mode, rules, context } = params;

  if (mode === 'SIMPLE') {
    const basePoints = context.eligible ? 1 : 0;
    return {
      totalPoints: basePoints,
      basePoints,
      bonusPoints: 0,
      appliedBonuses: [],
    };
  }

  let basePoints = 0;
  let bonusPoints = 0;
  const appliedBonuses: EventScoringAppliedBonus[] = [];

  const minutesSinceLeaveToKill =
    context.memberLeaveTime && context.memberLeaveTime < context.killTime
      ? (context.killTime.getTime() - context.memberLeaveTime.getTime()) /
        60_000
      : null;
  const minTrackingPercentForBonuses =
    typeof rules.minTrackingPercentForBonuses === 'number' &&
    Number.isFinite(rules.minTrackingPercentForBonuses)
      ? Math.min(100, Math.max(0, rules.minTrackingPercentForBonuses))
      : 50;
  const respawnDurationSeconds = Math.max(
    0,
    Math.floor(
      (context.killTime.getTime() - context.respawnStartTime.getTime()) / 1000,
    ),
  );

  for (const rule of rules.rules) {
    if (rule.enabled === false) {
      continue;
    }

    const isMatching = rule.conditions.every((condition) =>
      evaluateCondition({
        condition,
        rules,
        context,
        minutesSinceLeaveToKill,
        respawnDurationSeconds,
      }),
    );

    if (!isMatching) {
      continue;
    }

    switch (rule.action.type) {
      case 'SET_BASE':
        basePoints = rule.action.points;
        break;
      case 'ADD_BONUS':
        if (
          typeof context.trackingDurationPercentage !== 'number' ||
          !Number.isFinite(context.trackingDurationPercentage) ||
          context.trackingDurationPercentage < minTrackingPercentForBonuses
        ) {
          break;
        }
        bonusPoints += rule.action.points;
        appliedBonuses.push({
          ruleId: rule.id,
          ruleName: rule.name ?? null,
          points: rule.action.points,
        });
        break;
      case 'ZERO_BASE':
        basePoints = 0;
        break;
      default:
        break;
    }
  }

  const rawTotal = basePoints + bonusPoints;
  const totalPoints = Math.min(rawTotal, rules.hardCapPoints);

  return {
    totalPoints,
    basePoints,
    bonusPoints,
    appliedBonuses,
  };
}
