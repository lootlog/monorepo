import type { EventScoringRules } from "@lootlog/domain/scoring";

export function getScoringNumberError(value: number, maximum?: number) {
  if (!Number.isFinite(value)) {
    return "events.scoring.validation.finiteNumber";
  }

  if (maximum !== undefined && (value < 0 || value > maximum)) {
    return "events.scoring.validation.percentage";
  }

  if (value < 0) {
    return "events.scoring.validation.nonNegative";
  }

  return undefined;
}

export function hasValidScoringNumbers(scoringRules: EventScoringRules) {
  if (
    getScoringNumberError(scoringRules.hardCapPoints) ||
    getScoringNumberError(scoringRules.minTrackingPercentForBonuses, 100)
  ) {
    return false;
  }

  return scoringRules.rules.every(
    (rule) =>
      (rule.action.type === "ZERO_BASE" ||
        !getScoringNumberError(rule.action.points)) &&
      rule.conditions.every((condition) => {
        if (condition.type === "NUMERIC") {
          return !getScoringNumberError(condition.value);
        }

        if (condition.type === "RESPAWN_WINDOW_COVERAGE") {
          return !getScoringNumberError(condition.value, 100);
        }

        return true;
      }),
  );
}
