import { ONLINE_HISTORY_RETENTION_DAYS } from "#src/online/online-retention";
import { Schema } from "effect";
import {
  DateTimeWithOffsetString,
  FiniteNumber,
} from "@lootlog/schema/http-scalars";

const CalendarDate = Schema.String.check(
  Schema.makeFilter(
    (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
    { expected: "a valid YYYY-MM-DD calendar date" },
  ),
).annotate({ format: "date" });

export const UserOnlineQuery = Schema.Struct({
  from: CalendarDate,
  to: CalendarDate,
}).check(
  Schema.makeFilter(
    ({ from, to }) => {
      const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
      return days >= 0 && days < ONLINE_HISTORY_RETENTION_DAYS;
    },
    { expected: "an inclusive date range of 1 to 112 days" },
  ),
);
export type UserOnlineQuery = typeof UserOnlineQuery.Type;
export const UserOnlineResponse = Schema.Struct({
  timezone: Schema.Literal("Europe/Warsaw"),
  trackingStartedAt: Schema.NullOr(DateTimeWithOffsetString),
  lastObservedAt: Schema.NullOr(DateTimeWithOffsetString),
  status: Schema.Literals(["fresh", "stale", "unavailable"]),
  days: Schema.Array(
    Schema.Struct({
      date: CalendarDate,
      onlineSeconds: Schema.NullOr(FiniteNumber),
      partial: Schema.Boolean,
      worlds: Schema.Array(Schema.String),
      worldsComplete: Schema.Boolean,
    }),
  ),
}).annotate({ identifier: "UserOnlineResponseDto" });
export type UserOnlineResponse = typeof UserOnlineResponse.Type;
