import type { CodecTypes } from "../../prisma/contract.js";

type DatabaseTemporal = Date | string | { toString(): string };
export type DatabaseTimestamp =
  CodecTypes["pg/timestamptz-temporal@1"]["input"];

export function dateToTemporal(
  value: Date | string | DatabaseTimestamp | null | undefined,
): DatabaseTimestamp | null | undefined {
  if (typeof value === "string") {
    return dateToTemporal(new Date(value));
  }

  if (!(value instanceof Date)) {
    return value;
  }

  return (
    value as Date & { toTemporalInstant(): DatabaseTimestamp }
  ).toTemporalInstant();
}

type TemporalDateResult<Value> = Value extends null
  ? null
  : Value extends undefined
    ? undefined
    : Date;

export function temporalToDate<
  Value extends DatabaseTemporal | null | undefined,
>(value: Value): TemporalDateResult<Value> {
  if (value === null || value === undefined) {
    return value as unknown as TemporalDateResult<Value>;
  }

  if (value instanceof Date) {
    return value as unknown as TemporalDateResult<Value>;
  }

  const serialized = value.toString();
  const date = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/u.test(serialized) ? serialized : `${serialized}Z`,
  );
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Invalid database temporal value");
  }

  return date as TemporalDateResult<Value>;
}
