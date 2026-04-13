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
} from "@lootlog/types";

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_WINDOW_START = "00:00";
const DEFAULT_WINDOW_END = "23:59";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isActionType = (value: string): value is EventScoringAction["type"] =>
  EVENT_SCORING_ACTION_TYPES.some((actionType) => actionType === value);

const isConditionType = (
  value: string,
): value is EventScoringCondition["type"] =>
  EVENT_SCORING_CONDITION_TYPES.some(
    (conditionType) => conditionType === value,
  );

const isNumericFactor = (value: string): value is EventScoringNumericFactor =>
  EVENT_SCORING_NUMERIC_FACTORS.some((factor) => factor === value);

const isNumericOperator = (
  value: string,
): value is EventScoringNumericOperator =>
  EVENT_SCORING_NUMERIC_OPERATORS.some((operator) => operator === value);

const isBooleanFactor = (value: string): value is EventScoringBooleanFactor =>
  EVENT_SCORING_BOOLEAN_FACTORS.some((factor) => factor === value);

const toNumber = (value: unknown, fallback: number, min = 0, max?: number) => {
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
  structuredClone(DEFAULT_ADVANCED_EVENT_SCORING_RULES);

const parseAction = (value: unknown): EventScoringAction | null => {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }
  if (!isActionType(value.type)) {
    return null;
  }

  if (value.type === "ZERO_BASE") {
    return { type: "ZERO_BASE" };
  }

  const points = toNumber(value.points, Number.NaN, 0);
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

  if (!isConditionType(value.type)) {
    return null;
  }

  if (value.type === "NUMERIC") {
    if (
      typeof value.factor !== "string" ||
      !isNumericFactor(value.factor) ||
      typeof value.operator !== "string" ||
      !isNumericOperator(value.operator)
    ) {
      return null;
    }

    const parsedValue = toNumber(value.value, Number.NaN);
    if (!Number.isFinite(parsedValue)) {
      return null;
    }

    return {
      type: "NUMERIC",
      factor: value.factor,
      operator: value.operator,
      value: Math.round(parsedValue * 100) / 100,
    };
  }

  if (value.type === "BOOLEAN") {
    if (
      typeof value.factor !== "string" ||
      !isBooleanFactor(value.factor) ||
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
      from: toClock(value.from, DEFAULT_WINDOW_START),
      to: toClock(value.to, DEFAULT_WINDOW_END),
    };
  }

  if (
    typeof value.operator !== "string" ||
    !isNumericOperator(value.operator)
  ) {
    return null;
  }

  const parsedValue = toNumber(value.value, Number.NaN, 0, 100);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return {
    type: "RESPAWN_WINDOW_COVERAGE",
    from: toClock(value.from, DEFAULT_WINDOW_START),
    to: toClock(value.to, DEFAULT_WINDOW_END),
    operator: value.operator,
    value: Math.round(parsedValue * 100) / 100,
  };
};

export const normalizeScoringMode = (value: unknown): EventScoringMode => {
  if (typeof value !== "string") {
    return "SIMPLE";
  }
  return EVENT_SCORING_MODES.includes(value as EventScoringMode)
    ? (value as EventScoringMode)
    : "SIMPLE";
};

export const normalizeScoringRules = (value: unknown): EventScoringRules => {
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
