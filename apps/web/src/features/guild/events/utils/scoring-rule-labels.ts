import type { TFunction } from "i18next";
import type {
  EventScoringAction,
  EventScoringBooleanFactor,
  EventScoringCondition,
  EventScoringNumericFactor,
  EventScoringNumericOperator,
} from "@lootlog/domain/scoring";

const OPERATOR_SYMBOLS: Record<EventScoringNumericOperator, string> = {
  ">": ">",
  ">=": "≥",
  "<": "<",
  "<=": "≤",
  "==": "=",
  "!=": "≠",
};

const formatFactorValue = (factor: EventScoringNumericFactor, value: number) =>
  factor.endsWith("Percentage") ? `${value}%` : String(value);

export const getScoringConditionTypeLabel = (
  type: EventScoringCondition["type"],
  t: TFunction,
) => t(`events.scoring.conditionType.${type}`);

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

const getScoringBooleanValueLabel = (value: boolean, t: TFunction) =>
  t(`events.scoring.booleanValue.${value}`, value ? "tak" : "nie");

export const formatScoringCondition = (
  condition: EventScoringCondition,
  t: TFunction,
) => {
  switch (condition.type) {
    case "NUMERIC":
      return `${getScoringFactorLabel(condition.factor, t)} ${OPERATOR_SYMBOLS[condition.operator]} ${formatFactorValue(condition.factor, condition.value)}`;
    case "BOOLEAN":
      return `${getScoringFactorLabel(condition.factor, t)} = ${getScoringBooleanValueLabel(condition.value, t)}`;
    case "KILL_TIME_IN_WINDOW":
      return t(
        "events.scoring.conditionSummary.killTimeInWindow",
        "Kill w godzinach {{from}}\u2013{{to}}",
        {
          from: condition.from,
          to: condition.to,
        },
      );
    case "RESPAWN_WINDOW_COVERAGE":
      return t(
        "events.scoring.conditionSummary.respawnWindowCoverage",
        "% respawnu w godz. {{from}}\u2013{{to}} {{operator}} {{value}}%",
        {
          from: condition.from,
          to: condition.to,
          operator: OPERATOR_SYMBOLS[condition.operator],
          value: condition.value,
        },
      );
    default:
      return "";
  }
};

type NumericCondition = Extract<EventScoringCondition, { type: "NUMERIC" }>;

/**
 * Joins a rule's conditions, reading an inclusive lower and upper bound on
 * the same factor as one range ("Liczba obstawiających: 1–4").
 */
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
        `${getScoringFactorLabel(condition.factor, t)}: ${range.lower.value}–${formatFactorValue(condition.factor, range.upper.value)}`,
      ];
    })
    .join(` ${t("events.scoring.andLabel")} `);
};

export const formatScoringAction = (
  action: EventScoringAction,
  t: TFunction,
): string => {
  if (action.type === "SET_BASE" || action.type === "ADD_BONUS") {
    return `${getScoringActionTypeLabel(action.type, t)} ${action.points}`;
  }

  return getScoringActionTypeLabel(action.type, t);
};
