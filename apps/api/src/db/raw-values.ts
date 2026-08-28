import { param } from "@prisma/orm-family-sql/relational-core";

export function rawTextArray(value: readonly string[]) {
  return param([...value], { codecId: "pg/text-array@1" });
}

export function rawTimestamp(value: Date) {
  const temporalValue = Temporal.Instant.fromEpochMilliseconds(value.getTime())
    .toZonedDateTimeISO("UTC")
    .toPlainDateTime();
  return param(temporalValue, { codecId: "pg/timestamp-temporal@1" });
}
