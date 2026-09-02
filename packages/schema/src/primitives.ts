import { Schema, SchemaTransformation } from "effect";

export const NonEmptyString = Schema.NonEmptyString;
export const NonNegativeInt = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
);

const isoDateTimePattern =
  /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z))$/;

/** A JavaScript Date encoded as the existing HTTP ISO-8601 string format. */
export const IsoDateTime = Schema.String.annotate({
  format: "date-time",
}).pipe(
  Schema.check(Schema.isPattern(isoDateTimePattern)),
  Schema.decodeTo(Schema.Date, SchemaTransformation.dateFromString),
);
export type IsoDateTime = typeof IsoDateTime.Type;
export type EncodedIsoDateTime = typeof IsoDateTime.Encoded;
