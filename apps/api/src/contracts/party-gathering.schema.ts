import * as Schema from "effect/Schema";
import { FiniteNumber } from "@lootlog/schema/http-scalars";

const PartyGatheringLevel = FiniteNumber.check(
  Schema.isGreaterThanOrEqualTo(1).annotate({
    expected: "a value greater than or equal to 1",
  }),
).check(
  Schema.isLessThanOrEqualTo(500).annotate({
    expected: "a value less than or equal to 500",
  }),
);

export const partyGatheringDetailsFields = {
  description: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(200).annotate({
        expected: "a value with a length of at most 200",
      }),
    ),
  ),
  minLvl: Schema.optionalKey(PartyGatheringLevel),
  maxLvl: Schema.optionalKey(PartyGatheringLevel),
};
