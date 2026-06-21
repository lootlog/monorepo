import {
  CLOCK_PATTERN,
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  EVENT_SCORING_ACTION_TYPES,
  EVENT_SCORING_BOOLEAN_FACTORS,
  EVENT_SCORING_CONDITION_TYPES,
  EVENT_SCORING_MODES,
  EVENT_SCORING_NUMERIC_FACTORS,
  EVENT_SCORING_NUMERIC_OPERATORS,
  EVENT_SCORING_TIMEZONE,
  type EventScoringAction,
  type EventScoringCondition,
  type EventScoringMode,
  type EventScoringRules,
} from "../constants/scoring-rules.constant";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isOneOf<const TValues extends readonly string[]>(
  values: TValues,
  value: unknown,
): value is TValues[number] {
  return typeof value === "string" && values.includes(value as TValues[number]);
}

function toNumber(value: unknown, fallback: number, min = 0, max?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const bounded = Math.max(min, value);
  return max === undefined ? bounded : Math.min(max, bounded);
}

function toClock(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  return CLOCK_PATTERN.test(value) ? value : fallback;
}

function toMode(value: unknown, fallback: EventScoringMode): EventScoringMode {
  if (isOneOf(EVENT_SCORING_MODES, value)) {
    return value;
  }

  return fallback;
}

function parseAction(value: unknown): EventScoringAction | null {
  if (!isRecord(value) || !isOneOf(EVENT_SCORING_ACTION_TYPES, value.type)) {
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
    if (!isOneOf(EVENT_SCORING_BOOLEAN_FACTORS, value.factor)) {
      return null;
    }

    if (typeof value.value !== "boolean") {
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
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return {
    type: "RESPAWN_WINDOW_COVERAGE",
    from: toClock(value.from, "00:00"),
    to: toClock(value.to, "23:59"),
    operator: value.operator,
    value: Math.round(parsedValue * 100) / 100,
  };
}

function deepCloneDefaultRules(): EventScoringRules {
  return JSON.parse(
    JSON.stringify(DEFAULT_ADVANCED_EVENT_SCORING_RULES),
  ) as EventScoringRules;
}

export function normalizeEventScoringRules(value: unknown): EventScoringRules {
  if (!isRecord(value)) {
    return deepCloneDefaultRules();
  }

  const parsedRules = (
    Array.isArray(value.rules)
      ? value.rules.map((entry, index) => {
          if (!isRecord(entry)) {
            return null;
          }

          const action = parseAction(entry.action);
          if (!action) {
            return null;
          }

          const conditions = Array.isArray(entry.conditions)
            ? entry.conditions
                .map((condition) => parseCondition(condition))
                .filter(
                  (condition): condition is EventScoringCondition =>
                    condition !== null,
                )
            : [];

          const parsedRule: EventScoringRules["rules"][number] = {
            id:
              typeof entry.id === "string" && entry.id.trim().length > 0
                ? entry.id.trim()
                : `rule-${index + 1}`,
            enabled: entry.enabled !== false,
            conditions,
            action,
          };

          if (typeof entry.name === "string" && entry.name.trim().length > 0) {
            parsedRule.name = entry.name.trim();
          }

          return parsedRule;
        })
      : []
  ).filter((rule) => rule !== null);

  return {
    version: 1,
    timezone:
      typeof value.timezone === "string" && value.timezone.trim().length > 0
        ? value.timezone.trim()
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
    rules: parsedRules.length > 0 ? parsedRules : deepCloneDefaultRules().rules,
  };
}

export function normalizeEventScoringMode(value: unknown): EventScoringMode {
  return toMode(value, "SIMPLE");
}
