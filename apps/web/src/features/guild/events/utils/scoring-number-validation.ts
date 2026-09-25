import type { EventScoringRules } from "@lootlog/domain/scoring";
import { z } from "zod";

export function scoringNumberSchema(maximum?: number) {
  const rangeError =
    maximum === undefined
      ? "events.scoring.validation.nonNegative"
      : "events.scoring.validation.percentage";

  const schema = z
    .number({ error: "events.scoring.validation.finiteNumber" })
    .min(0, rangeError);

  return maximum === undefined ? schema : schema.max(maximum, rangeError);
}

const isValidScoringNumber = (value: number, maximum?: number) =>
  scoringNumberSchema(maximum).safeParse(value).success;

export function hasValidScoringNumbers(scoringRules: EventScoringRules) {
  if (
    !isValidScoringNumber(scoringRules.hardCapPoints) ||
    !isValidScoringNumber(scoringRules.minTrackingPercentForBonuses, 100)
  ) {
    return false;
  }

  return scoringRules.rules.every(
    (rule) =>
      (rule.action.type === "ZERO_BASE" ||
        isValidScoringNumber(rule.action.points)) &&
      rule.conditions.every((condition) => {
        if (condition.type === "NUMERIC") {
          return isValidScoringNumber(condition.value);
        }

        if (condition.type === "RESPAWN_WINDOW_COVERAGE") {
          return isValidScoringNumber(condition.value, 100);
        }

        return true;
      }),
  );
}
