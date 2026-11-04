import { Schema, SchemaGetter } from "effect";
import { readableEntries, withFallback } from "@/lib/lenient-schema";

const BonusBreakdownItem = Schema.Struct({
  ruleId: withFallback(Schema.NonEmptyString, "rule"),
  ruleName: withFallback(
    Schema.NullOr(Schema.Trim.check(Schema.isNonEmpty())),
    null,
  ),
  points: Schema.Finite.pipe(
    Schema.decodeTo(Schema.Number.check(Schema.isGreaterThan(0)), {
      decode: SchemaGetter.transform((points: number) =>
        Math.max(0, Math.round(points * 100) / 100),
      ),
      encode: SchemaGetter.passthrough(),
    }),
  ),
});

export const normalizeBonusBreakdown = Schema.decodeUnknownSync(
  readableEntries(BonusBreakdownItem),
);
