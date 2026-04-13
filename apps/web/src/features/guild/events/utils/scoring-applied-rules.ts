import type {
  KillDetail,
  KillDetailParticipant,
} from "../hooks/queries/use-kill-detail";
import type {
  EventScoringCondition,
  EventScoringNumericOperator,
  EventScoringRules,
} from "@lootlog/types";

type LocalDate = {
  year: number;
  month: number;
  day: number;
};

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

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = dateFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  dateFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = timeFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  timeFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = offsetFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  offsetFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getPartValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function parseWindowClock(clock: string): { hour: number; minute: number } {
  const [hourRaw, minuteRaw] = clock.split(":");
  const hour = Number.parseInt(hourRaw ?? "0", 10);
  const minute = Number.parseInt(minuteRaw ?? "0", 10);

  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function getLocalDate(date: Date, timeZone: string): LocalDate {
  try {
    const parts = getDateFormatter(timeZone).formatToParts(date);
    return {
      year: Number.parseInt(getPartValue(parts, "year"), 10),
      month: Number.parseInt(getPartValue(parts, "month"), 10),
      day: Number.parseInt(getPartValue(parts, "day"), 10),
    };
  } catch {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }
}

function getLocalTime(
  date: Date,
  timeZone: string,
): { hour: number; minute: number } {
  try {
    const parts = getTimeFormatter(timeZone).formatToParts(date);
    return {
      hour: Number.parseInt(getPartValue(parts, "hour"), 10),
      minute: Number.parseInt(getPartValue(parts, "minute"), 10),
    };
  } catch {
    return {
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    };
  }
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  try {
    const parts = getOffsetFormatter(timeZone).formatToParts(date);
    const offsetToken = getPartValue(parts, "timeZoneName");

    if (!offsetToken || offsetToken === "GMT" || offsetToken === "UTC") {
      return 0;
    }

    const match = offsetToken.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) {
      return 0;
    }

    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number.parseInt(match[2] ?? "0", 10);
    const minutes = Number.parseInt(match[3] ?? "0", 10);
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
}

function toUtcDateFromLocal(
  localDate: LocalDate,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuessMs = Date.UTC(
    localDate.year,
    localDate.month - 1,
    localDate.day,
    hour,
    minute,
    0,
    0,
  );

  const firstOffset = getTimeZoneOffsetMinutes(new Date(utcGuessMs), timeZone);
  let resultMs = utcGuessMs - firstOffset * 60_000;

  const secondOffset = getTimeZoneOffsetMinutes(new Date(resultMs), timeZone);
  if (secondOffset !== firstOffset) {
    resultMs = utcGuessMs - secondOffset * 60_000;
  }

  return new Date(resultMs);
}

function addDays(localDate: LocalDate, days: number): LocalDate {
  const asUtc = new Date(
    Date.UTC(localDate.year, localDate.month - 1, localDate.day),
  );
  asUtc.setUTCDate(asUtc.getUTCDate() + days);
  return {
    year: asUtc.getUTCFullYear(),
    month: asUtc.getUTCMonth() + 1,
    day: asUtc.getUTCDate(),
  };
}

function localDateKey(localDate: LocalDate): number {
  return localDate.year * 10_000 + localDate.month * 100 + localDate.day;
}

function isLocalTimeInRange(params: {
  date: Date;
  timeZone: string;
  from: string;
  to: string;
}): boolean {
  const { hour, minute } = getLocalTime(params.date, params.timeZone);
  const currentMinutes = hour * 60 + minute;
  const fromClock = parseWindowClock(params.from);
  const toClock = parseWindowClock(params.to);
  const fromMinutes = fromClock.hour * 60 + fromClock.minute;
  const toMinutes = toClock.hour * 60 + toClock.minute;

  if (fromMinutes <= toMinutes) {
    return currentMinutes >= fromMinutes && currentMinutes < toMinutes;
  }

  return currentMinutes >= fromMinutes || currentMinutes < toMinutes;
}

function calculateLocalWindowOverlapMs(params: {
  startUtc: Date;
  endUtc: Date;
  timeZone: string;
  windowFrom: string;
  windowTo: string;
}): number {
  if (params.endUtc <= params.startUtc) {
    return 0;
  }

  try {
    const fromClock = parseWindowClock(params.windowFrom);
    const toClock = parseWindowClock(params.windowTo);

    let currentLocalDate = getLocalDate(params.startUtc, params.timeZone);
    const lastLocalDate = getLocalDate(params.endUtc, params.timeZone);
    let totalOverlapMs = 0;

    while (localDateKey(currentLocalDate) <= localDateKey(lastLocalDate)) {
      const windowStartUtc = toUtcDateFromLocal(
        currentLocalDate,
        fromClock.hour,
        fromClock.minute,
        params.timeZone,
      );

      const crossesMidnight =
        toClock.hour * 60 + toClock.minute <=
        fromClock.hour * 60 + fromClock.minute;
      const windowEndDate = crossesMidnight
        ? addDays(currentLocalDate, 1)
        : currentLocalDate;
      const windowEndUtc = toUtcDateFromLocal(
        windowEndDate,
        toClock.hour,
        toClock.minute,
        params.timeZone,
      );

      const overlapStartMs = Math.max(
        params.startUtc.getTime(),
        windowStartUtc.getTime(),
      );
      const overlapEndMs = Math.min(
        params.endUtc.getTime(),
        windowEndUtc.getTime(),
      );

      if (overlapEndMs > overlapStartMs) {
        totalOverlapMs += overlapEndMs - overlapStartMs;
      }

      currentLocalDate = addDays(currentLocalDate, 1);
    }

    return totalOverlapMs;
  } catch {
    return 0;
  }
}

function compareNumeric(
  left: number,
  operator: EventScoringNumericOperator,
  right: number,
): boolean {
  switch (operator) {
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    default:
      return false;
  }
}

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
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date;
}

function getMemberKillState(params: {
  participant: KillDetailParticipant;
  killTime: Date;
  respawnStartTime: Date;
}): { memberLeaveTime: Date | null; memberPresentAtKill: boolean } {
  const assignments = params.participant.mapData ?? [];
  let memberLeaveTime: Date | null = null;
  let memberPresentAtKill = false;

  for (const assignment of assignments) {
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
      continue;
    }

    if (
      unassignedAt >= params.respawnStartTime &&
      unassignedAt < params.killTime &&
      (!memberLeaveTime || unassignedAt > memberLeaveTime)
    ) {
      memberLeaveTime = unassignedAt;
    }
  }

  return { memberLeaveTime, memberPresentAtKill };
}

function evaluateCondition(params: {
  condition: EventScoringCondition;
  rules: EventScoringRules;
  context: EvaluationContext;
}): boolean {
  const { condition, rules, context } = params;

  if (condition.type === "NUMERIC") {
    let left: number | null = null;

    switch (condition.factor) {
      case "trackingDurationPercentage":
        left = context.trackingDurationPercentage;
        break;
      case "trackingDurationSeconds":
        left = context.trackingDurationSeconds;
        break;
      case "assignedMembersCount":
        left = context.assignedMembersCount;
        break;
      case "minutesSinceLeaveToKill":
        left = context.minutesSinceLeaveToKill;
        break;
      case "timeOnMapSeconds":
        left = context.timeOnMapSeconds;
        break;
      case "afkPercentage":
        left = context.afkPercentage;
        break;
      case "respawnDurationSeconds":
        left = context.respawnDurationSeconds;
        break;
      case "respawnProgressPercentage":
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

  if (condition.type === "BOOLEAN") {
    switch (condition.factor) {
      case "eligible":
        return true;
      case "memberPresentAtKill":
        return context.memberPresentAtKill === condition.value;
      case "wasPresent":
        return context.wasPresent === condition.value;
      default:
        return false;
    }
  }

  if (condition.type === "KILL_TIME_IN_WINDOW") {
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
  const respawnDurationSeconds = Math.max(
    0,
    Math.floor((killTime.getTime() - respawnStartTime.getTime()) / 1000),
  );

  const { memberLeaveTime, memberPresentAtKill } = getMemberKillState({
    participant,
    killTime,
    respawnStartTime,
  });
  const minutesSinceLeaveToKill =
    memberLeaveTime && memberLeaveTime < killTime
      ? (killTime.getTime() - memberLeaveTime.getTime()) / 60_000
      : null;
  const respawnProgressPercentage = calculateRespawnProgressPercentage({
    killTime,
    respawnStartTime,
    maxRespawnTime: Number.isFinite(maxSpawnTimeAtKill.getTime())
      ? maxSpawnTimeAtKill
      : null,
  });
  const minTrackingPercentForBonuses =
    typeof scoringRules.minTrackingPercentForBonuses === "number" &&
    Number.isFinite(scoringRules.minTrackingPercentForBonuses)
      ? Math.min(100, Math.max(0, scoringRules.minTrackingPercentForBonuses))
      : 50;

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
    respawnDurationSeconds,
    respawnProgressPercentage,
    minutesSinceLeaveToKill,
    memberPresentAtKill,
    timeOnMapSeconds: participant.timeOnMapSeconds,
    afkPercentage: participant.afkPercentage,
    wasPresent: participant.wasPresent,
  };

  const appliedRuleIds: string[] = [];

  for (const rule of scoringRules.rules) {
    if (rule.enabled === false) {
      continue;
    }

    const matches = rule.conditions.every((condition) =>
      evaluateCondition({
        condition,
        rules: scoringRules,
        context,
      }),
    );

    if (!matches) {
      continue;
    }

    if (rule.action.type === "ADD_BONUS") {
      if (
        typeof context.trackingDurationPercentage !== "number" ||
        !Number.isFinite(context.trackingDurationPercentage) ||
        context.trackingDurationPercentage < minTrackingPercentForBonuses
      ) {
        continue;
      }
    }

    appliedRuleIds.push(rule.id);
  }

  return appliedRuleIds;
}

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

export function evaluateEventScoring(
  rules: EventScoringRules,
  context: EvaluationContext,
): ScoringSimulationResult {
  let basePoints = 0;
  let bonusPoints = 0;
  const appliedRules: ScoringSimulationAppliedRule[] = [];

  const minTrackingPercentForBonuses =
    typeof rules.minTrackingPercentForBonuses === "number" &&
    Number.isFinite(rules.minTrackingPercentForBonuses)
      ? Math.min(100, Math.max(0, rules.minTrackingPercentForBonuses))
      : 50;

  for (const rule of rules.rules) {
    if (rule.enabled === false) {
      continue;
    }

    const matches = rule.conditions.every((condition) =>
      evaluateCondition({ condition, rules, context }),
    );

    if (!matches) {
      continue;
    }

    switch (rule.action.type) {
      case "SET_BASE":
        basePoints = rule.action.points;
        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name ?? null,
          points: rule.action.points,
          actionType: "SET_BASE",
        });
        break;
      case "ADD_BONUS":
        if (
          typeof context.trackingDurationPercentage !== "number" ||
          !Number.isFinite(context.trackingDurationPercentage) ||
          context.trackingDurationPercentage < minTrackingPercentForBonuses
        ) {
          break;
        }
        bonusPoints += rule.action.points;
        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name ?? null,
          points: rule.action.points,
          actionType: "ADD_BONUS",
        });
        break;
      case "ZERO_BASE":
        basePoints = 0;
        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name ?? null,
          points: 0,
          actionType: "ZERO_BASE",
        });
        break;
    }
  }

  const rawTotal = basePoints + bonusPoints;
  const totalPoints = Math.min(rawTotal, rules.hardCapPoints);

  return { totalPoints, basePoints, bonusPoints, appliedRules };
}
