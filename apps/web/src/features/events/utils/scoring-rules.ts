import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  EVENT_SCORING_ACTION_TYPES,
  EVENT_SCORING_BOOLEAN_FACTORS,
  EVENT_SCORING_CONDITION_TYPES,
  EVENT_SCORING_MODES,
  EVENT_SCORING_NUMERIC_FACTORS,
  EVENT_SCORING_NUMERIC_OPERATORS,
  EVENT_SCORING_TIMEZONE,
  type EventScoringAction,
  type EventScoringBooleanFactor,
  type EventScoringCondition,
  type EventScoringMode,
  type EventScoringNumericFactor,
  type EventScoringNumericOperator,
  type EventScoringRules,
} from "../types/scoring-rules";

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toNumber = (
  value: unknown,
  fallback: number,
  min = 0,
  max?: number,
) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  const bounded = Math.max(min, value);
  return max === undefined ? bounded : Math.min(max, bounded);
};

const toClock = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }
  return CLOCK_PATTERN.test(value) ? value : fallback;
};

const cloneDefaultRules = (): EventScoringRules =>
  JSON.parse(JSON.stringify(DEFAULT_ADVANCED_EVENT_SCORING_RULES));

const parseAction = (value: unknown): EventScoringAction | null => {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }
  if (!EVENT_SCORING_ACTION_TYPES.includes(value.type as any)) {
    return null;
  }

  if (value.type === "ZERO_BASE") {
    return { type: "ZERO_BASE" };
  }

  const points = toNumber(value.points, NaN, 0);
  if (!Number.isFinite(points)) {
    return null;
  }

  if (value.type === "SET_BASE") {
    return {
      type: "SET_BASE",
      points: Math.round(points * 100) / 100,
    };
  }

  return {
    type: "ADD_BONUS",
    points: Math.round(points * 100) / 100,
  };
};

const parseCondition = (value: unknown): EventScoringCondition | null => {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }

  if (!EVENT_SCORING_CONDITION_TYPES.includes(value.type as any)) {
    return null;
  }

  if (value.type === "NUMERIC") {
    if (
      typeof value.factor !== "string" ||
      !EVENT_SCORING_NUMERIC_FACTORS.includes(value.factor as any) ||
      typeof value.operator !== "string" ||
      !EVENT_SCORING_NUMERIC_OPERATORS.includes(value.operator as any)
    ) {
      return null;
    }

    const parsedValue = toNumber(value.value, NaN);
    if (!Number.isFinite(parsedValue)) {
      return null;
    }

    return {
      type: "NUMERIC",
      factor: value.factor as EventScoringNumericFactor,
      operator: value.operator as EventScoringNumericOperator,
      value: Math.round(parsedValue * 100) / 100,
    };
  }

  if (value.type === "BOOLEAN") {
    if (
      typeof value.factor !== "string" ||
      !EVENT_SCORING_BOOLEAN_FACTORS.includes(value.factor as any) ||
      typeof value.value !== "boolean"
    ) {
      return null;
    }

    return {
      type: "BOOLEAN",
      factor: value.factor as EventScoringBooleanFactor,
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

  if (
    typeof value.operator !== "string" ||
    !EVENT_SCORING_NUMERIC_OPERATORS.includes(value.operator as any)
  ) {
    return null;
  }

  const parsedValue = toNumber(value.value, NaN, 0, 100);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return {
    type: "RESPAWN_WINDOW_COVERAGE",
    from: toClock(value.from, "00:00"),
    to: toClock(value.to, "23:59"),
    operator: value.operator as EventScoringNumericOperator,
    value: Math.round(parsedValue * 100) / 100,
  };
};

export const normalizeScoringMode = (
  value: unknown,
): EventScoringMode => {
  if (typeof value !== "string") {
    return "SIMPLE";
  }
  return EVENT_SCORING_MODES.includes(value as EventScoringMode)
    ? (value as EventScoringMode)
    : "SIMPLE";
};

export const normalizeScoringRules = (
  value: Partial<EventScoringRules> | null | undefined,
): EventScoringRules => {
  if (!isRecord(value)) {
    return cloneDefaultRules();
  }

  const parsedRules = (
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
                .map((condition) => parseCondition(condition))
                .filter(
                  (condition): condition is EventScoringCondition =>
                    condition !== null,
                )
            : [];

          const parsedRule: EventScoringRules["rules"][number] = {
            id:
              typeof rule.id === "string" && rule.id.trim().length > 0
                ? rule.id.trim()
                : `rule-${index + 1}`,
            enabled: rule.enabled !== false,
            conditions,
            action,
          };

          if (typeof rule.name === "string" && rule.name.trim().length > 0) {
            parsedRule.name = rule.name.trim();
          }

          return parsedRule;
        })
      : []
  ).filter((rule) => rule !== null) as EventScoringRules["rules"];

  return {
    version: 1,
    timezone:
      typeof value.timezone === "string" && value.timezone.length > 0
        ? value.timezone
        : EVENT_SCORING_TIMEZONE,
    hardCapPoints: toNumber(
      value.hardCapPoints,
      DEFAULT_ADVANCED_EVENT_SCORING_RULES.hardCapPoints,
      0,
    ),
    minTrackingPercentForBonuses: toNumber(
      value.minTrackingPercentForBonuses,
      DEFAULT_ADVANCED_EVENT_SCORING_RULES.minTrackingPercentForBonuses,
      0,
      100,
    ),
    rules: parsedRules.length > 0 ? parsedRules : cloneDefaultRules().rules,
  };
};
