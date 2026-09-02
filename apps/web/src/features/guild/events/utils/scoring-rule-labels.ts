import type { TFunction } from "i18next";
import type {
  EventScoringAction,
  EventScoringBooleanFactor,
  EventScoringCondition,
  EventScoringNumericFactor,
} from "@lootlog/domain/scoring";

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
      return `${getScoringFactorLabel(condition.factor, t)} ${condition.operator} ${condition.value}`;
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
          operator: condition.operator,
          value: condition.value,
        },
      );
    default:
      return "";
  }
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
