import type {
  EventScoringCondition,
  EventScoringRules,
} from "@lootlog/domain/scoring";
import type { GroupSizeRange } from "@lootlog/domain/scoring-presence";
import { Schema } from "effect";

export type ScoringNumberBounds = {
  /** Inclusive upper bound; a bound of 100 reads as a percentage. */
  max?: number;
  /** People and seconds are whole numbers. */
  integer?: boolean;
  /** Inclusive lower bound, 0 by default. */
  min?: number;
};

export const PERCENTAGE_BOUNDS = { max: 100 } satisfies ScoringNumberBounds;

export const GROUP_SIZE_BOUNDS = {
  min: 1,
  integer: true,
} satisfies ScoringNumberBounds;

export const SECONDS_BOUNDS = { integer: true } satisfies ScoringNumberBounds;

const FINITE_NUMBER_ERROR = "events.scoring.validation.finiteNumber";

function scoringNumberSchema({
  max,
  integer = false,
  min = 0,
}: ScoringNumberBounds = {}) {
  const rangeError =
    min >= 1
      ? "events.scoring.validation.groupSize"
      : max === undefined
        ? "events.scoring.validation.nonNegative"
        : "events.scoring.validation.percentage";

  return Schema.toStandardSchemaV1(
    Schema.Number.annotate({ message: FINITE_NUMBER_ERROR }).check(
      Schema.isFinite({ message: FINITE_NUMBER_ERROR }),
      Schema.isGreaterThanOrEqualTo(min, { message: rangeError }),
      ...(max === undefined
        ? []
        : [Schema.isLessThanOrEqualTo(max, { message: rangeError })]),
      ...(integer
        ? [
            Schema.makeFilter(Number.isSafeInteger, {
              message: "events.scoring.validation.wholeNumber",
            }),
          ]
        : []),
    ),
  );
}

/**
 * The first problem with a scoring number, as an i18n key. A form field typed
 * for any condition value may hold a boolean, which is not a number.
 */
export function getScoringNumberError(
  value: number | boolean,
  bounds?: ScoringNumberBounds,
): string | undefined {
  const result = scoringNumberSchema(bounds)["~standard"].validate(value);

  return "issues" in result ? result.issues?.[0]?.message : undefined;
}

/** An inverted `BETWEEN` range ("od 4 do 2 osób") is rejected. */
export const getGroupSizeRangeError = (size: GroupSizeRange) =>
  size.comparison === "BETWEEN" && size.to < size.value
    ? "events.scoring.validation.invertedRange"
    : undefined;

const isValidScoringNumber = (value: number, bounds?: ScoringNumberBounds) =>
  getScoringNumberError(value, bounds) === undefined;

const isValidCondition = (condition: EventScoringCondition) => {
  switch (condition.type) {
    case "NUMERIC":
      return isValidScoringNumber(condition.value);
    case "RESPAWN_WINDOW_COVERAGE":
      return isValidScoringNumber(condition.value, PERCENTAGE_BOUNDS);
    case "RESPAWN_JOIN":
      return isValidScoringNumber(condition.toleranceSeconds, SECONDS_BOUNDS);
    case "GROUP_SIZE":
      return (
        isValidScoringNumber(condition.size.value, GROUP_SIZE_BOUNDS) &&
        (condition.size.comparison !== "BETWEEN" ||
          isValidScoringNumber(condition.size.to, GROUP_SIZE_BOUNDS)) &&
        getGroupSizeRangeError(condition.size) === undefined &&
        isValidScoringNumber(condition.minSharePercentage, PERCENTAGE_BOUNDS) &&
        isValidScoringNumber(condition.minTimePercentage, PERCENTAGE_BOUNDS)
      );
    default:
      return true;
  }
};

export function hasValidScoringNumbers(scoringRules: EventScoringRules) {
  if (
    !isValidScoringNumber(scoringRules.hardCapPoints) ||
    !isValidScoringNumber(
      scoringRules.minTrackingPercentForBonuses,
      PERCENTAGE_BOUNDS,
    )
  ) {
    return false;
  }

  return scoringRules.rules.every(
    (rule) =>
      (rule.action.type === "ZERO_BASE" ||
        isValidScoringNumber(rule.action.points)) &&
      rule.conditions.every(isValidCondition),
  );
}
