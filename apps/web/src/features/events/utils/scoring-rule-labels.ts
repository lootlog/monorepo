import type { TFunction } from "i18next";
import type {
  EventScoringAction,
  EventScoringBooleanFactor,
  EventScoringCondition,
  EventScoringNumericFactor,
} from "../types/scoring-rules";

const CONDITION_TYPE_FALLBACKS: Record<EventScoringCondition["type"], string> =
  {
    NUMERIC: "Warunek liczbowy",
    BOOLEAN: "Warunek logiczny",
    KILL_TIME_IN_WINDOW: "Godzina zabicia w oknie",
    RESPAWN_WINDOW_COVERAGE: "Pokrycie okna respawnu",
  };

const ACTION_TYPE_FALLBACKS: Record<EventScoringAction["type"], string> = {
  SET_BASE: "Ustaw podstawę",
  ADD_BONUS: "Dodaj bonus",
  ZERO_BASE: "Wyzeruj podstawę",
};

const FACTOR_FALLBACKS: Record<
  EventScoringNumericFactor | EventScoringBooleanFactor,
  string
> = {
  trackingDurationPercentage: "Pokrycie czasu respawnu (%)",
  trackingDurationSeconds: "Czas na mapie (sekundy)",
  assignedMembersCount: "Liczba przypisanych graczy",
  minutesSinceLeaveToKill: "Minuty od zejścia do zabicia",
  timeOnMapSeconds: "Czas na mapie (sekundy)",
  afkPercentage: "Czas AFK (%)",
  respawnDurationSeconds: "Długość respawnu (sekundy)",
  respawnProgressPercentage: "Postęp respawnu (%)",
  eligible: "Gracz eligible",
  memberPresentAtKill: "Obecny przy zabiciu",
  wasPresent: "Był obecny",
};

export const getScoringConditionTypeLabel = (
  type: EventScoringCondition["type"],
  t: TFunction,
) => t(`events.scoring.conditionType.${type}`, CONDITION_TYPE_FALLBACKS[type]);

export const getScoringActionTypeLabel = (
  type: EventScoringAction["type"],
  t: TFunction,
) => t(`events.scoring.actionType.${type}`, ACTION_TYPE_FALLBACKS[type]);

export const getScoringFactorLabel = (
  factor: EventScoringNumericFactor | EventScoringBooleanFactor,
  t: TFunction,
) => t(`events.scoring.factor.${factor}`, FACTOR_FALLBACKS[factor]);

export const getScoringBooleanValueLabel = (value: boolean, t: TFunction) =>
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
        "Godzina zabicia w przedziale {{from}}-{{to}}",
        {
          from: condition.from,
          to: condition.to,
        },
      );
    case "RESPAWN_WINDOW_COVERAGE":
      return t(
        "events.scoring.conditionSummary.respawnWindowCoverage",
        "Pokrycie czasu respu w oknie {{from}}-{{to}} {{operator}} {{value}}%",
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
  if (action.type === "SET_BASE") {
    return `${getScoringActionTypeLabel(action.type, t)} ${action.points}`;
  }
  if (action.type === "ADD_BONUS") {
    return `${getScoringActionTypeLabel(action.type, t)} ${action.points}`;
  }
  return getScoringActionTypeLabel(action.type, t);
};
