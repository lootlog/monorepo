import { Predicate } from "effect";
import { clamp } from "es-toolkit";
import {
  calculateLocalWindowOverlapMs,
  isLocalTimeInRange,
} from "@lootlog/datetime";
import {
  GROUP_COUNTINGS,
  GROUP_SIZE_COMPARISONS,
  getGroupTimeShare,
  isGroupSizeInRange,
  type EventKillPresence,
  type GroupCounting,
  type GroupSizeRange,
  type PresenceParticipantId,
} from "./scoring-presence.js";

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const EVENT_SCORING_TIMEZONE = "Europe/Warsaw" as const;

export const EVENT_SCORING_MODES = ["SIMPLE", "ADVANCED"] as const;

export const EVENT_SCORING_NUMERIC_OPERATORS = [
  ">",
  ">=",
  "<",
  "<=",
  "==",
  "!=",
] as const;

export const EVENT_SCORING_NUMERIC_FACTORS = [
  "trackingDurationPercentage",
  "trackingDurationSeconds",
  "assignedMembersCount",
  "minutesSinceLeaveToKill",
  "timeOnMapSeconds",
  "afkPercentage",
  "respawnDurationSeconds",
  "respawnProgressPercentage",
  "respawnJoinDelaySeconds",
] as const;

export const EVENT_SCORING_BOOLEAN_FACTORS = [
  "eligible",
  "memberPresentAtKill",
  "wasPresent",
] as const;

export const EVENT_SCORING_CONDITION_TYPES = [
  "NUMERIC",
  "BOOLEAN",
  "KILL_TIME_IN_WINDOW",
  "RESPAWN_WINDOW_COVERAGE",
  "RESPAWN_JOIN",
  "GROUP_SIZE",
] as const;

export const EVENT_SCORING_ACTION_TYPES = [
  "SET_BASE",
  "ADD_BONUS",
  "ZERO_BASE",
] as const;

export type EventScoringMode = (typeof EVENT_SCORING_MODES)[number];

export type EventScoringNumericOperator =
  (typeof EVENT_SCORING_NUMERIC_OPERATORS)[number];

export type EventScoringNumericFactor =
  (typeof EVENT_SCORING_NUMERIC_FACTORS)[number];

export type EventScoringBooleanFactor =
  (typeof EVENT_SCORING_BOOLEAN_FACTORS)[number];

export type EventScoringCondition =
  | {
      type: "NUMERIC";
      factor: EventScoringNumericFactor;
      operator: EventScoringNumericOperator;
      value: number;
    }
  | {
      type: "BOOLEAN";
      factor: EventScoringBooleanFactor;
      value: boolean;
    }
  | {
      type: "KILL_TIME_IN_WINDOW";
      from: string;
      to: string;
    }
  | {
      type: "RESPAWN_WINDOW_COVERAGE";
      from: string;
      to: string;
      operator: EventScoringNumericOperator;
      value: number;
    }
  | {
      /** The member's first counted presence came at most this late. */
      type: "RESPAWN_JOIN";
      toleranceSeconds: number;
    }
  | {
      type: "GROUP_SIZE";
      counting: GroupCounting;
      size: GroupSizeRange;
      /** `MIN_SHARE`: share of the whole window a member needs to count. */
      minSharePercentage: number;
      /** `TIMELINE`: share of the member's own counted time in the group. */
      minTimePercentage: number;
    };

export type EventScoringAction =
  | { type: "SET_BASE"; points: number }
  | { type: "ADD_BONUS"; points: number }
  | { type: "ZERO_BASE" };

export type EventScoringRule = {
  id: string;
  name?: string;
  enabled?: boolean;
  conditions: EventScoringCondition[];
  action: EventScoringAction;
};

export type EventScoringRules = {
  version: 1;
  timezone: string;
  hardCapPoints: number;
  minTrackingPercentForBonuses: number;
  rules: EventScoringRule[];
};

export type EventScoringContext = {
  eligible: boolean;
  trackingDurationPercentage?: number | null;
  trackingDurationSeconds?: number | null;
  respawnProgressPercentage?: number | null;
  assignedMembersCount: number;
  killTime: Date;
  respawnStartTime: Date;
  memberLeaveTime?: Date | null;
  minutesSinceLeaveToKill?: number | null;
  memberPresentAtKill: boolean;
  timeOnMapSeconds: number;
  afkPercentage: number;
  wasPresent: boolean;
  /**
   * The kill's shared presence analysis and the evaluated member. Without it
   * the presence conditions cannot be determined and never award points.
   */
  presence?: {
    analysis: EventKillPresence;
    participantId: PresenceParticipantId;
  } | null;
};

export type EventScoringUnknownReason =
  | "NO_PRESENCE_DATA"
  | "WINDOW_UNKNOWN"
  | "PARTICIPANT_DATA_MISSING"
  | "GROUP_DATA_INCOMPLETE";

export type EventScoringConditionOutcome =
  | { status: "MET" | "NOT_MET" }
  | { status: "UNKNOWN"; reason: EventScoringUnknownReason };

export type EventScoringRuleExplanation = {
  ruleId: string;
  ruleName: string | null;
  enabled: boolean;
  conditions: Array<{
    condition: EventScoringCondition;
    outcome: EventScoringConditionOutcome;
  }>;
  /** Every condition is met. */
  matched: boolean;
  /** The rule changed the points (a bonus also needs the minimum tracking). */
  applied: boolean;
  /** A later base rule replaced the base this rule set. */
  overridden: boolean;
};

export type EventScoringExplanation = {
  result: EventScoringResult;
  rules: EventScoringRuleExplanation[];
};

export type EventScoringAppliedBonus = {
  ruleId: string;
  ruleName: string | null;
  points: number;
};

export type EventScoringResult = {
  totalPoints: number;
  basePoints: number;
  bonusPoints: number;
  appliedBonuses: EventScoringAppliedBonus[];
  appliedRules: EventScoringAppliedRule[];
};

type EventScoringAppliedRule = {
  ruleId: string;
  ruleName: string | null;
  points: number;
  actionType: EventScoringAction["type"];
};

export const DEFAULT_ADVANCED_EVENT_SCORING_RULES: EventScoringRules = {
  version: 1,
  timezone: EVENT_SCORING_TIMEZONE,
  hardCapPoints: 2,
  minTrackingPercentForBonuses: 50,
  rules: [
    {
      id: "base-25",
      name: "Base 25%",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 25,
        },
      ],
      action: { type: "SET_BASE", points: 0.25 },
    },
    {
      id: "base-50",
      name: "Base 50%",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 50,
        },
      ],
      action: { type: "SET_BASE", points: 0.5 },
    },
    {
      id: "base-75",
      name: "Base 75%",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 75,
        },
      ],
      action: { type: "SET_BASE", points: 1 },
    },
    {
      id: "leave-grace",
      name: "Leave grace >10 min",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 75,
        },
        {
          type: "BOOLEAN",
          factor: "memberPresentAtKill",
          value: false,
        },
        {
          type: "NUMERIC",
          factor: "minutesSinceLeaveToKill",
          operator: ">",
          value: 10,
        },
      ],
      action: { type: "ZERO_BASE" },
    },
    {
      id: "bonus-small-group",
      name: "Bonus small group",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "assignedMembersCount",
          operator: ">=",
          value: 1,
        },
        {
          type: "NUMERIC",
          factor: "assignedMembersCount",
          operator: "<=",
          value: 4,
        },
      ],
      action: { type: "ADD_BONUS", points: 0.5 },
    },
    {
      id: "bonus-night",
      name: "Bonus night watch",
      enabled: true,
      conditions: [
        {
          type: "RESPAWN_WINDOW_COVERAGE",
          from: "03:00",
          to: "08:00",
          operator: ">=",
          value: 75,
        },
      ],
      action: { type: "ADD_BONUS", points: 0.5 },
    },
    {
      id: "bonus-pvp",
      name: "Bonus pvp window",
      enabled: true,
      conditions: [
        {
          type: "KILL_TIME_IN_WINDOW",
          from: "08:00",
          to: "11:00",
        },
      ],
      action: { type: "ADD_BONUS", points: 0.5 },
    },
  ],
};

export function calculateRespawnProgressPercentage(params: {
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

  const elapsedWindowMs = clamp(
    params.killTime.getTime() - params.respawnStartTime.getTime(),
    0,
    fullWindowMs,
  );

  return Math.round((elapsedWindowMs / fullWindowMs) * 100);
}

function isOneOf<const Values extends readonly string[]>(
  values: Values,
  value: unknown,
): value is Values[number] {
  return typeof value === "string" && values.includes(value);
}

function toNumber(value: unknown, fallback: number, min = 0, max?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return max === undefined ? Math.max(min, value) : clamp(value, min, max);
}

function toClock(value: unknown, fallback: string): string {
  return typeof value === "string" && CLOCK_PATTERN.test(value)
    ? value
    : fallback;
}

function parseAction(value: unknown): EventScoringAction | null {
  if (
    !Predicate.isObject(value) ||
    !isOneOf(EVENT_SCORING_ACTION_TYPES, value.type)
  ) {
    return null;
  }

  if (value.type === "ZERO_BASE") {
    return { type: "ZERO_BASE" };
  }

  const points = toNumber(value.points, Number.NaN);

  if (!Number.isFinite(points)) {
    return null;
  }

  return {
    type: value.type,
    points: Math.round(points * 100) / 100,
  };
}

function parseCondition(value: unknown): EventScoringCondition | null {
  if (
    !Predicate.isObject(value) ||
    !isOneOf(EVENT_SCORING_CONDITION_TYPES, value.type)
  ) {
    return null;
  }

  if (value.type === "NUMERIC") {
    if (
      !isOneOf(EVENT_SCORING_NUMERIC_FACTORS, value.factor) ||
      !isOneOf(EVENT_SCORING_NUMERIC_OPERATORS, value.operator)
    ) {
      return null;
    }

    const parsedValue = toNumber(value.value, Number.NaN);

    return Number.isFinite(parsedValue)
      ? {
          type: "NUMERIC",
          factor: value.factor,
          operator: value.operator,
          value: Math.round(parsedValue * 100) / 100,
        }
      : null;
  }

  if (value.type === "BOOLEAN") {
    if (
      !isOneOf(EVENT_SCORING_BOOLEAN_FACTORS, value.factor) ||
      typeof value.value !== "boolean"
    ) {
      return null;
    }

    return {
      type: "BOOLEAN",
      factor: value.factor,
      value: value.value,
    };
  }

  if (value.type === "KILL_TIME_IN_WINDOW") {
    return {
      type: "KILL_TIME_IN_WINDOW",
      from: toClock(value.from, "00:00"),
      to: toClock(value.to, "23:59"),
    };
  }

  if (value.type === "RESPAWN_JOIN") {
    const toleranceSeconds = toNumber(value.toleranceSeconds, Number.NaN);

    return Number.isFinite(toleranceSeconds)
      ? { type: "RESPAWN_JOIN", toleranceSeconds: Math.round(toleranceSeconds) }
      : null;
  }

  if (value.type === "GROUP_SIZE") {
    return parseGroupSizeCondition(value);
  }

  if (!isOneOf(EVENT_SCORING_NUMERIC_OPERATORS, value.operator)) {
    return null;
  }

  const parsedValue = toNumber(value.value, Number.NaN, 0, 100);

  return Number.isFinite(parsedValue)
    ? {
        type: "RESPAWN_WINDOW_COVERAGE",
        from: toClock(value.from, "00:00"),
        to: toClock(value.to, "23:59"),
        operator: value.operator,
        value: Math.round(parsedValue * 100) / 100,
      }
    : null;
}

function toPercentage(value: unknown, fallback: number) {
  return Math.round(toNumber(value, fallback, 0, 100) * 100) / 100;
}

function parseGroupSizeCondition(value: unknown): EventScoringCondition | null {
  if (!Predicate.isObject(value)) {
    return null;
  }

  const size = Predicate.isObject(value.size) ? value.size : null;

  if (
    !size ||
    !isOneOf(GROUP_COUNTINGS, value.counting) ||
    !isOneOf(GROUP_SIZE_COMPARISONS, size.comparison)
  ) {
    return null;
  }

  const sizeValue = Math.round(toNumber(size.value, Number.NaN, 1));

  if (!Number.isFinite(sizeValue)) {
    return null;
  }

  return {
    type: "GROUP_SIZE",
    counting: value.counting,
    size: {
      comparison: size.comparison,
      value: sizeValue,
      to: Math.max(sizeValue, Math.round(toNumber(size.to, sizeValue, 1))),
    },
    minSharePercentage: toPercentage(value.minSharePercentage, 50),
    minTimePercentage: toPercentage(value.minTimePercentage, 90),
  };
}

function cloneDefaultRules(): EventScoringRules {
  return structuredClone(DEFAULT_ADVANCED_EVENT_SCORING_RULES);
}

export function normalizeEventScoringMode(value: unknown): EventScoringMode {
  return isOneOf(EVENT_SCORING_MODES, value) ? value : "SIMPLE";
}

function parseRule(rule: unknown, index: number): EventScoringRule | null {
  if (!Predicate.isObject(rule)) {
    return null;
  }

  const action = parseAction(rule.action);

  if (!action) {
    return null;
  }

  const conditions = Array.isArray(rule.conditions)
    ? rule.conditions
        .map(parseCondition)
        .filter(
          (condition): condition is EventScoringCondition => condition !== null,
        )
    : [];

  const normalizedRule: EventScoringRule = {
    id:
      typeof rule.id === "string" && rule.id.trim()
        ? rule.id.trim()
        : `rule-${index + 1}`,
    enabled: rule.enabled !== false,
    conditions,
    action,
  };

  if (typeof rule.name === "string" && rule.name.trim()) {
    normalizedRule.name = rule.name.trim();
  }

  return normalizedRule;
}

export function normalizeEventScoringRules(value: unknown): EventScoringRules {
  if (!Predicate.isObject(value)) {
    return cloneDefaultRules();
  }

  const normalizedRules = (
    Array.isArray(value.rules) ? value.rules.map(parseRule) : []
  ).filter((rule): rule is EventScoringRule => rule !== null);

  return {
    version: 1,
    timezone:
      typeof value.timezone === "string" && value.timezone.trim()
        ? value.timezone.trim()
        : EVENT_SCORING_TIMEZONE,
    hardCapPoints: toNumber(
      value.hardCapPoints,
      DEFAULT_ADVANCED_EVENT_SCORING_RULES.hardCapPoints,
    ),
    minTrackingPercentForBonuses: toNumber(
      value.minTrackingPercentForBonuses,
      DEFAULT_ADVANCED_EVENT_SCORING_RULES.minTrackingPercentForBonuses,
      0,
      100,
    ),
    rules:
      normalizedRules.length > 0 ? normalizedRules : cloneDefaultRules().rules,
  };
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
  }
}

const MET: EventScoringConditionOutcome = { status: "MET" };

const NOT_MET: EventScoringConditionOutcome = { status: "NOT_MET" };

const unknown = (
  reason: EventScoringUnknownReason,
): EventScoringConditionOutcome => ({ status: "UNKNOWN", reason });

const toOutcome = (met: boolean) => (met ? MET : NOT_MET);

type EventScoringJoin =
  | { status: "UNKNOWN"; reason: EventScoringUnknownReason }
  | { status: "ABSENT" }
  | { status: "JOINED"; delayMs: number };

/** When the member first joined the respawn window, relative to its start. */
export function resolveEventScoringJoin(
  presence: EventScoringContext["presence"],
): EventScoringJoin {
  if (!presence) return { status: "UNKNOWN", reason: "NO_PRESENCE_DATA" };

  if (presence.analysis.windowMs === null) {
    return { status: "UNKNOWN", reason: "WINDOW_UNKNOWN" };
  }

  const participant = presence.analysis.participants.get(
    presence.participantId,
  );

  if (!participant?.hasData) {
    return { status: "UNKNOWN", reason: "PARTICIPANT_DATA_MISSING" };
  }

  return participant.joinDelayMs === null
    ? { status: "ABSENT" }
    : { status: "JOINED", delayMs: participant.joinDelayMs };
}

function evaluateJoinCondition(
  toleranceSeconds: number,
  presence: EventScoringContext["presence"],
): EventScoringConditionOutcome {
  const join = resolveEventScoringJoin(presence);

  if (join.status === "UNKNOWN") return unknown(join.reason);

  return toOutcome(
    join.status === "JOINED" && join.delayMs <= toleranceSeconds * 1000,
  );
}

function evaluateGroupSizeCondition(
  condition: Extract<EventScoringCondition, { type: "GROUP_SIZE" }>,
  presence: EventScoringContext["presence"],
): EventScoringConditionOutcome {
  if (!presence) return unknown("NO_PRESENCE_DATA");

  const { analysis } = presence;

  if (analysis.windowMs === null) return unknown("WINDOW_UNKNOWN");

  if (analysis.missingParticipantIds.length > 0) {
    return unknown("GROUP_DATA_INCOMPLETE");
  }

  if (condition.counting === "TIMELINE") {
    const participant = analysis.participants.get(presence.participantId);

    if (!participant?.hasData) return unknown("PARTICIPANT_DATA_MISSING");

    const share = getGroupTimeShare(participant, condition.size);

    return toOutcome(
      share.ownMs > 0 &&
        share.matchedMs * 100 >= condition.minTimePercentage * share.ownMs,
    );
  }

  const count = analysis
    .groupMembership(condition.counting, condition.minSharePercentage)
    .filter((member) => member.included).length;

  return toOutcome(isGroupSizeInRange(count, condition.size));
}

function evaluateCondition(params: {
  condition: EventScoringCondition;
  rules: EventScoringRules;
  context: EventScoringContext;
  minutesSinceLeaveToKill: number | null;
  respawnDurationSeconds: number;
}): EventScoringConditionOutcome {
  const { condition, context } = params;

  if (condition.type === "NUMERIC") {
    if (condition.factor === "respawnJoinDelaySeconds") {
      const join = resolveEventScoringJoin(context.presence);

      if (join.status === "UNKNOWN") return unknown(join.reason);

      return toOutcome(
        join.status === "JOINED" &&
          compareNumeric(
            join.delayMs / 1000,
            condition.operator,
            condition.value,
          ),
      );
    }

    const values: Record<
      Exclude<EventScoringNumericFactor, "respawnJoinDelaySeconds">,
      number | null | undefined
    > = {
      trackingDurationPercentage: context.trackingDurationPercentage,
      trackingDurationSeconds: context.trackingDurationSeconds,
      assignedMembersCount: context.assignedMembersCount,
      minutesSinceLeaveToKill: params.minutesSinceLeaveToKill,
      timeOnMapSeconds: context.timeOnMapSeconds,
      afkPercentage: context.afkPercentage,
      respawnDurationSeconds: params.respawnDurationSeconds,
      respawnProgressPercentage: context.respawnProgressPercentage,
    };

    const left = values[condition.factor];

    return toOutcome(
      left !== null &&
        left !== undefined &&
        Number.isFinite(left) &&
        compareNumeric(left, condition.operator, condition.value),
    );
  }

  if (condition.type === "BOOLEAN") {
    const values: Record<EventScoringBooleanFactor, boolean> = {
      eligible: context.eligible,
      memberPresentAtKill: context.memberPresentAtKill,
      wasPresent: context.wasPresent,
    };

    return toOutcome(values[condition.factor] === condition.value);
  }

  if (condition.type === "KILL_TIME_IN_WINDOW") {
    return toOutcome(
      isLocalTimeInRange({
        date: context.killTime,
        timeZone: params.rules.timezone,
        from: condition.from,
        to: condition.to,
      }),
    );
  }

  if (condition.type === "RESPAWN_JOIN") {
    return evaluateJoinCondition(condition.toleranceSeconds, context.presence);
  }

  if (condition.type === "GROUP_SIZE") {
    return evaluateGroupSizeCondition(condition, context.presence);
  }

  if (context.killTime <= context.respawnStartTime) {
    return NOT_MET;
  }

  const totalDurationMs =
    context.killTime.getTime() - context.respawnStartTime.getTime();

  const overlapMs = calculateLocalWindowOverlapMs({
    startUtc: context.respawnStartTime,
    endUtc: context.killTime,
    timeZone: params.rules.timezone,
    windowFrom: condition.from,
    windowTo: condition.to,
  });

  return toOutcome(
    compareNumeric(
      (overlapMs / totalDurationMs) * 100,
      condition.operator,
      condition.value,
    ),
  );
}

export function evaluateEventScoring(params: {
  mode: EventScoringMode;
  rules: EventScoringRules;
  context: EventScoringContext;
}): EventScoringResult {
  return explainEventScoring(params).result;
}

function meetsBonusMinimum(
  trackingDurationPercentage: number | null | undefined,
  minimumTrackingPercentage: number,
) {
  return (
    trackingDurationPercentage !== null &&
    trackingDurationPercentage !== undefined &&
    Number.isFinite(trackingDurationPercentage) &&
    trackingDurationPercentage >= minimumTrackingPercentage
  );
}

/**
 * Evaluates the rules in order and reports every condition's outcome. A
 * matching base rule replaces the base set by earlier rules, so the last
 * matching base rule on the list wins; bonuses add up.
 */
export function explainEventScoring(params: {
  mode: EventScoringMode;
  rules: EventScoringRules;
  context: EventScoringContext;
}): EventScoringExplanation {
  const { mode, rules, context } = params;

  if (mode === "SIMPLE") {
    const basePoints = context.eligible ? 1 : 0;

    return {
      result: {
        totalPoints: basePoints,
        basePoints,
        bonusPoints: 0,
        appliedBonuses: [],
        appliedRules: [],
      },
      rules: [],
    };
  }

  let basePoints = 0;
  let bonusPoints = 0;
  const appliedBonuses: EventScoringAppliedBonus[] = [];
  const appliedRules: EventScoringAppliedRule[] = [];
  const explanations: EventScoringRuleExplanation[] = [];
  let lastBaseExplanation: EventScoringRuleExplanation | null = null;

  const minutesSinceLeaveToKill =
    context.minutesSinceLeaveToKill ??
    (context.memberLeaveTime && context.memberLeaveTime < context.killTime
      ? (context.killTime.getTime() - context.memberLeaveTime.getTime()) /
        60_000
      : null);

  const minimumTrackingPercentage = toNumber(
    rules.minTrackingPercentForBonuses,
    50,
    0,
    100,
  );

  const respawnDurationSeconds = Math.max(
    0,
    Math.floor(
      (context.killTime.getTime() - context.respawnStartTime.getTime()) / 1000,
    ),
  );

  for (const rule of rules.rules) {
    const enabled = rule.enabled !== false;

    const conditions = rule.conditions.map((condition) => ({
      condition,
      outcome: evaluateCondition({
        condition,
        rules,
        context,
        minutesSinceLeaveToKill,
        respawnDurationSeconds,
      }),
    }));

    const explanation: EventScoringRuleExplanation = {
      ruleId: rule.id,
      ruleName: rule.name ?? null,
      enabled,
      conditions,
      matched: conditions.every(({ outcome }) => outcome.status === "MET"),
      applied: false,
      overridden: false,
    };

    explanations.push(explanation);

    if (!enabled || !explanation.matched) {
      continue;
    }

    if (rule.action.type === "SET_BASE" || rule.action.type === "ZERO_BASE") {
      const points = rule.action.type === "SET_BASE" ? rule.action.points : 0;

      basePoints = points;
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name ?? null,
        points,
        actionType: rule.action.type,
      });
      explanation.applied = true;

      if (lastBaseExplanation) lastBaseExplanation.overridden = true;

      lastBaseExplanation = explanation;
    } else if (
      meetsBonusMinimum(
        context.trackingDurationPercentage,
        minimumTrackingPercentage,
      )
    ) {
      bonusPoints += rule.action.points;
      appliedBonuses.push({
        ruleId: rule.id,
        ruleName: rule.name ?? null,
        points: rule.action.points,
      });
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name ?? null,
        points: rule.action.points,
        actionType: rule.action.type,
      });
      explanation.applied = true;
    }
  }

  return {
    result: {
      totalPoints: Math.min(basePoints + bonusPoints, rules.hardCapPoints),
      basePoints,
      bonusPoints,
      appliedBonuses,
      appliedRules,
    },
    rules: explanations,
  };
}
