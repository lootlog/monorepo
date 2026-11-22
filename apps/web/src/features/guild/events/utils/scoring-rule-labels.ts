import type { TFunction } from "i18next";
import type {
  EventScoringAction,
  EventScoringBooleanFactor,
  EventScoringCondition,
  EventScoringNumericFactor,
  EventScoringNumericOperator,
} from "@lootlog/domain/scoring";
import type {
  GroupCounting,
  GroupSizeRange,
} from "@lootlog/domain/scoring-presence";
import { formatPoints } from "./format-points";

export const OPERATOR_SYMBOLS: Record<EventScoringNumericOperator, string> = {
  ">": ">",
  ">=": "≥",
  "<": "<",
  "<=": "≤",
  "==": "=",
  "!=": "≠",
};

export const formatScoringDuration = (seconds: number, t: TFunction) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);

  if (minutes === 0) {
    return t("events.scoring.duration.seconds", { seconds: remainder });
  }

  return remainder === 0
    ? t("events.scoring.duration.minutes", { minutes })
    : t("events.scoring.duration.minutesSeconds", {
        minutes,
        seconds: remainder,
      });
};

export const formatScoringPercentage = (value: number) =>
  `${Math.round(value * 10) / 10}%`;

const formatFactorValue = (
  factor: EventScoringNumericFactor,
  value: number,
  t: TFunction,
) => {
  if (factor === "respawnJoinDelaySeconds") {
    return formatScoringDuration(value, t);
  }

  return factor.endsWith("Percentage") ? `${value}%` : String(value);
};

export const getScoringConditionTypeLabel = (
  type: EventScoringCondition["type"],
  t: TFunction,
) => t(`events.scoring.conditionType.${type}`);

export const getScoringConditionTypeDescription = (
  type: EventScoringCondition["type"],
  t: TFunction,
) => t(`events.scoring.conditionTypeHint.${type}`);

export const getScoringActionTypeLabel = (
  type: EventScoringAction["type"],
  t: TFunction,
) => t(`events.scoring.actionType.${type}`);

export const getScoringFactorLabel = (
  factor: EventScoringNumericFactor | EventScoringBooleanFactor,
  t: TFunction,
) => t(`events.scoring.factor.${factor}`);

export const getScoringFactorDescription = (
  factor: EventScoringNumericFactor | EventScoringBooleanFactor,
  t: TFunction,
) => t(`events.scoring.factorHint.${factor}`);

export const getGroupCountingLabel = (counting: GroupCounting, t: TFunction) =>
  t(`events.scoring.groupCounting.${counting}`);

const getScoringBooleanValueLabel = (value: boolean, t: TFunction) =>
  t(`events.scoring.booleanValue.${value}`, value ? "tak" : "nie");

const formatGroupSize = (size: GroupSizeRange, t: TFunction) => {
  if (size.comparison === "EXACT" && size.value === 1) {
    return t("events.scoring.groupSize.solo");
  }

  if (size.comparison === "BETWEEN") {
    return t("events.scoring.groupSize.BETWEEN", {
      from: size.value,
      count: size.to,
    });
  }

  return t(`events.scoring.groupSize.${size.comparison}`, {
    count: size.value,
  });
};

const formatGroupCountRange = (size: GroupSizeRange) => {
  switch (size.comparison) {
    case "EXACT":
      return `= ${size.value}`;
    case "AT_MOST":
      return `≤ ${size.value}`;
    case "AT_LEAST":
      return `≥ ${size.value}`;
    case "BETWEEN":
      return `${size.value}–${size.to}`;
  }
};

export const formatScoringCondition = (
  condition: EventScoringCondition,
  t: TFunction,
) => {
  switch (condition.type) {
    case "NUMERIC":
      return `${getScoringFactorLabel(condition.factor, t)} ${OPERATOR_SYMBOLS[condition.operator]} ${formatFactorValue(condition.factor, condition.value, t)}`;
    case "BOOLEAN":
      return `${getScoringFactorLabel(condition.factor, t)} = ${getScoringBooleanValueLabel(condition.value, t)}`;
    case "KILL_TIME_IN_WINDOW":
      return t("events.scoring.conditionSummary.killTimeInWindow", {
        from: condition.from,
        to: condition.to,
      });
    case "RESPAWN_WINDOW_COVERAGE":
      return t("events.scoring.conditionSummary.respawnWindowCoverage", {
        from: condition.from,
        to: condition.to,
        operator: OPERATOR_SYMBOLS[condition.operator],
        value: condition.value,
      });
    case "RESPAWN_JOIN":
      return condition.toleranceSeconds === 0
        ? t("events.scoring.conditionSummary.respawnJoinExact")
        : t("events.scoring.conditionSummary.respawnJoin", {
            duration: formatScoringDuration(condition.toleranceSeconds, t),
          });
    case "GROUP_SIZE":
      return condition.counting === "TIMELINE"
        ? t("events.scoring.conditionSummary.groupTimeShare", {
            percentage: condition.minTimePercentage,
            group: formatGroupSize(condition.size, t),
          })
        : t("events.scoring.conditionSummary.groupCount", {
            counting: getGroupCountingLabel(condition.counting, t),
            range: formatGroupCountRange(condition.size),
            share: condition.minSharePercentage,
            context:
              condition.counting === "MIN_SHARE" ? "minShare" : undefined,
          });
  }
};

type NumericCondition = Extract<EventScoringCondition, { type: "NUMERIC" }>;

export const formatScoringConditions = (
  conditions: EventScoringCondition[],
  t: TFunction,
) => {
  if (conditions.length === 0) {
    return t("events.scoring.always");
  }

  const numericConditions = conditions.filter(
    (condition): condition is NumericCondition => condition.type === "NUMERIC",
  );

  const rangeBounds = new Map<
    EventScoringNumericFactor,
    { lower: NumericCondition; upper: NumericCondition }
  >();

  for (const lower of numericConditions) {
    if (lower.operator !== ">=") continue;

    const sameFactor = numericConditions.filter(
      (condition) => condition.factor === lower.factor,
    );

    const upper = sameFactor.find((condition) => condition.operator === "<=");

    if (sameFactor.length === 2 && upper) {
      rangeBounds.set(lower.factor, { lower, upper });
    }
  }

  return conditions
    .flatMap((condition) => {
      if (condition.type !== "NUMERIC") {
        return [formatScoringCondition(condition, t)];
      }

      const range = rangeBounds.get(condition.factor);

      if (!range) {
        return [formatScoringCondition(condition, t)];
      }

      if (condition !== range.lower) {
        return [];
      }

      return [
        `${getScoringFactorLabel(condition.factor, t)}: ${range.lower.value}–${formatFactorValue(condition.factor, range.upper.value, t)}`,
      ];
    })
    .join(` ${t("events.scoring.andLabel")} `);
};

export const formatScoringAction = (
  action: EventScoringAction,
  t: TFunction,
): string => {
  if (action.type === "SET_BASE") {
    return t("events.scoring.actionSummary.basePoints", {
      points: formatPoints(action.points),
    });
  }

  if (action.type === "ADD_BONUS") {
    return t("events.scoring.actionSummary.bonusPoints", {
      points: formatPoints(action.points),
    });
  }

  return getScoringActionTypeLabel(action.type, t);
};
