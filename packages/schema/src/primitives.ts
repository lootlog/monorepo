import { Schema, SchemaTransformation } from "effect";

import { DATE_TIME_STRING_PATTERN } from "./http-scalars.js";

export const NonNegativeInt = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
);

const isoDateTimePattern = new RegExp(DATE_TIME_STRING_PATTERN, "u");

export const IsoDateTime = Schema.String.annotate({
  format: "date-time",
}).pipe(
  Schema.check(Schema.isPattern(isoDateTimePattern)),
  Schema.decodeTo(Schema.Date, SchemaTransformation.dateFromString),
);

export type IsoDateTime = typeof IsoDateTime.Type;
