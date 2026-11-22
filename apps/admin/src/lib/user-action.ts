import { PlatformRole } from "@lootlog/schema/platform-roles";
import { Schema } from "effect";

export const BAN_DURATIONS = ["1h", "24h", "7d", "30d", "permanent"] as const;

export type BanDuration = (typeof BAN_DURATIONS)[number];

const BAN_HOURS: Record<BanDuration, number | null> = {
  "1h": 1,
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  permanent: null,
};

export const UserAction = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("roles"),
    roles: Schema.Array(PlatformRole),
  }),
  Schema.Struct({
    action: Schema.Literal("ban"),
    reason: Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(500)),
    duration: Schema.Literals(BAN_DURATIONS),
  }),
  Schema.Struct({ action: Schema.Literal("unban") }),
  Schema.Struct({ action: Schema.Literal("revoke-sessions") }),
  Schema.Struct({
    action: Schema.Literal("revoke-session"),
    sessionId: Schema.NonEmptyString,
  }),
  Schema.Struct({
    action: Schema.Literal("revoke-api-key"),
    keyId: Schema.NonEmptyString,
  }),
]);

export type UserAction = typeof UserAction.Type;

export const UserActionRequest = Schema.Struct({
  userId: Schema.NonEmptyString,
  action: UserAction,
});

export const banExpiry = (duration: BanDuration, now: number) => {
  const hours = BAN_HOURS[duration];

  return hours === null
    ? null
    : new Date(now + hours * 60 * 60 * 1_000).toISOString();
};
