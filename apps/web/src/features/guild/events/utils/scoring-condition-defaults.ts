import type {
  EventScoringAction,
  EventScoringCondition,
} from "@lootlog/scoring";

const FULL_DAY_TIME_RANGE = {
  from: "00:00",
  to: "23:59",
} as const;

export const createDefaultScoringCondition = (
  conditionType: EventScoringCondition["type"] = "NUMERIC",
): EventScoringCondition => {
  switch (conditionType) {
    case "BOOLEAN":
      return {
        type: "BOOLEAN",
        factor: "eligible",
        value: true,
      };
    case "KILL_TIME_IN_WINDOW":
      return {
        type: "KILL_TIME_IN_WINDOW",
        ...FULL_DAY_TIME_RANGE,
      };
    case "RESPAWN_WINDOW_COVERAGE":
      return {
        type: "RESPAWN_WINDOW_COVERAGE",
        ...FULL_DAY_TIME_RANGE,
        operator: ">=",
        value: 0,
      };
    default:
      return {
        type: "NUMERIC",
        factor: "trackingDurationPercentage",
        operator: ">=",
        value: 0,
      };
  }
};

export const createDefaultScoringAction = (
  actionType: EventScoringAction["type"] = "ADD_BONUS",
): EventScoringAction => {
  if (actionType === "ZERO_BASE") {
    return { type: "ZERO_BASE" };
  }

  return {
    type: actionType,
    points: 0,
  };
};
