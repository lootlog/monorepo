import {
  calculateLocalWindowOverlapMs,
  isLocalTimeInRange,
} from "@lootlog/datetime";

export const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const EVENT_SCORING_TIMEZONE = "Europe/Warsaw" as const;
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

export type EventScoringAppliedRule = {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isOneOf<const Values extends readonly string[]>(
  values: Values,
  value: unknown,
): value is Values[number] {
  return typeof value === "string" && values.includes(value as Values[number]);
}

function toNumber(value: unknown, fallback: number, min = 0, max?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const boundedValue = Math.max(min, value);
  return max === undefined ? boundedValue : Math.min(max, boundedValue);
}

function toClock(value: unknown, fallback: string): string {
  return typeof value === "string" && CLOCK_PATTERN.test(value)
    ? value
    : fallback;
}

function parseAction(value: unknown): EventScoringAction | null {
  if (!isRecord(value) || !isOneOf(EVENT_SCORING_ACTION_TYPES, value.type)) {
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
  if (!isRecord(value) || !isOneOf(EVENT_SCORING_CONDITION_TYPES, value.type)) {
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

function cloneDefaultRules(): EventScoringRules {
  return structuredClone(DEFAULT_ADVANCED_EVENT_SCORING_RULES);
}

export function normalizeEventScoringMode(value: unknown): EventScoringMode {
  return isOneOf(EVENT_SCORING_MODES, value) ? value : "SIMPLE";
}

export function normalizeEventScoringRules(value: unknown): EventScoringRules {
  if (!isRecord(value)) {
    return cloneDefaultRules();
  }

  const normalizedRules = (
    Array.isArray(value.rules)
      ? value.rules.map((rule, index) => {
          if (!isRecord(rule)) {
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
                  (condition): condition is EventScoringCondition =>
                    condition !== null,
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
        })
      : []
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

function evaluateCondition(params: {
  condition: EventScoringCondition;
  rules: EventScoringRules;
  context: EventScoringContext;
  minutesSinceLeaveToKill: number | null;
  respawnDurationSeconds: number;
}): boolean {
  const { condition, context } = params;

  if (condition.type === "NUMERIC") {
    const values: Record<EventScoringNumericFactor, number | null | undefined> =
      {
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

    return typeof left === "number" && Number.isFinite(left)
      ? compareNumeric(left, condition.operator, condition.value)
      : false;
  }

  if (condition.type === "BOOLEAN") {
    const values: Record<EventScoringBooleanFactor, boolean> = {
      eligible: context.eligible,
      memberPresentAtKill: context.memberPresentAtKill,
      wasPresent: context.wasPresent,
    };

    return values[condition.factor] === condition.value;
  }

  if (condition.type === "KILL_TIME_IN_WINDOW") {
    return isLocalTimeInRange({
      date: context.killTime,
      timeZone: params.rules.timezone,
      from: condition.from,
      to: condition.to,
    });
  }

  if (context.killTime <= context.respawnStartTime) {
    return false;
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

  return compareNumeric(
    (overlapMs / totalDurationMs) * 100,
    condition.operator,
    condition.value,
  );
}

export function evaluateEventScoring(params: {
  mode: EventScoringMode;
  rules: EventScoringRules;
  context: EventScoringContext;
}): EventScoringResult {
  const { mode, rules, context } = params;

  if (mode === "SIMPLE") {
    const basePoints = context.eligible ? 1 : 0;
    return {
      totalPoints: basePoints,
      basePoints,
      bonusPoints: 0,
      appliedBonuses: [],
      appliedRules: [],
    };
  }

  let basePoints = 0;
  let bonusPoints = 0;
  const appliedBonuses: EventScoringAppliedBonus[] = [];
  const appliedRules: EventScoringAppliedRule[] = [];
  const minutesSinceLeaveToKill =
    context.minutesSinceLeaveToKill ??
    (context.memberLeaveTime && context.memberLeaveTime < context.killTime
      ? (context.killTime.getTime() - context.memberLeaveTime.getTime()) /
        60_000
      : null);
  const minimumTrackingPercentage = Number.isFinite(
    rules.minTrackingPercentForBonuses,
  )
    ? Math.min(100, Math.max(0, rules.minTrackingPercentForBonuses))
    : 50;
  const respawnDurationSeconds = Math.max(
    0,
    Math.floor(
      (context.killTime.getTime() - context.respawnStartTime.getTime()) / 1000,
    ),
  );

  for (const rule of rules.rules) {
    if (
      rule.enabled === false ||
      !rule.conditions.every((condition) =>
        evaluateCondition({
          condition,
          rules,
          context,
          minutesSinceLeaveToKill,
          respawnDurationSeconds,
        }),
      )
    ) {
      continue;
    }

    if (rule.action.type === "SET_BASE") {
      basePoints = rule.action.points;
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name ?? null,
        points: rule.action.points,
        actionType: rule.action.type,
      });
    } else if (rule.action.type === "ZERO_BASE") {
      basePoints = 0;
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name ?? null,
        points: 0,
        actionType: rule.action.type,
      });
    } else if (
      typeof context.trackingDurationPercentage === "number" &&
      Number.isFinite(context.trackingDurationPercentage) &&
      context.trackingDurationPercentage >= minimumTrackingPercentage
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
    }
  }

  return {
    totalPoints: Math.min(basePoints + bonusPoints, rules.hardCapPoints),
    basePoints,
    bonusPoints,
    appliedBonuses,
    appliedRules,
  };
}
