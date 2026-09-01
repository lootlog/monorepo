import type { CodecTypes } from "../prisma/contract.js";

export type DatabaseTemporal =
  | Date
  | string
  | {
      epochMilliseconds?: number;
      toString(): string;
      toZonedDateTime?(timeZone: string): { epochMilliseconds: number };
    };

export type DatabaseTimestamp = CodecTypes["pg/timestamp-temporal@1"]["input"];

export function dateToTemporal(
  value: Date | string | DatabaseTimestamp,
): DatabaseTimestamp;
export function dateToTemporal(value: null): null;
export function dateToTemporal(value: undefined): undefined;
export function dateToTemporal(
  value: Date | string | DatabaseTimestamp | null | undefined,
): DatabaseTimestamp | null | undefined;
export function dateToTemporal(
  value: Date | string | DatabaseTimestamp | null | undefined,
): DatabaseTimestamp | null | undefined {
  if (typeof value === "string") {
    return dateToTemporal(new Date(value));
  }

  if (!(value instanceof Date)) {
    return value;
  }

  const dateWithTemporal = value as Date & {
    toTemporalInstant(): {
      toZonedDateTimeISO(timeZone: string): {
        toPlainDateTime(): DatabaseTimestamp;
      };
    };
  };

  return dateWithTemporal
    .toTemporalInstant()
    .toZonedDateTimeISO("UTC")
    .toPlainDateTime();
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

  let dateValue: number | string;
  if (typeof value === "string") {
    dateValue = /(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ? value : `${value}Z`;
  } else if (typeof value.epochMilliseconds === "number") {
    dateValue = value.epochMilliseconds;
  } else if (typeof value.toZonedDateTime === "function") {
    dateValue = value.toZonedDateTime("UTC").epochMilliseconds;
  } else {
    dateValue = `${value.toString()}Z`;
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Invalid database temporal value");
  }

  return date as TemporalDateResult<Value>;
}
