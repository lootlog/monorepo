import { Schema } from "effect";
import { MemberProfile } from "#src/contracts/members/schemas";
import {
  CreateAutoTimerResponse,
  TimerHistoryResponse,
  TimerNpcSearchResponse,
  TimerResponse,
} from "#src/contracts/timers/schemas";
import { DomainDateTime } from "#src/shared/schema/response-codecs";

const optionalNullableDateTime = Schema.optionalKey(
  Schema.NullOr(DomainDateTime),
);

const TimerMember = Schema.Struct({
  ...MemberProfile.fields,
  lastDiscordSyncAt: optionalNullableDateTime,
  lastDiscordAttemptAt: optionalNullableDateTime,
  nextRefreshAt: optionalNullableDateTime,
  updatedAt: DomainDateTime,
});

const TimerBoundary = Schema.Struct({
  ...TimerResponse.fields,
  minSpawnTime: DomainDateTime,
  maxSpawnTime: DomainDateTime,
  member: Schema.optionalKey(TimerMember),
  deletedAt: optionalNullableDateTime,
  updatedAt: DomainDateTime,
});

const TimerHistoryBoundary = Schema.Struct({
  ...TimerHistoryResponse.fields,
  member: TimerMember,
  minSpawnTime: Schema.NullOr(DomainDateTime),
  maxSpawnTime: Schema.NullOr(DomainDateTime),
  createdAt: DomainDateTime,
});

export const decodeTimerResponse = Schema.decodeUnknownEffect(TimerBoundary);

export const decodeTimersResponse = Schema.decodeUnknownEffect(
  Schema.Array(TimerBoundary),
);

export const decodeTimerHistoryResponse = Schema.decodeUnknownEffect(
  Schema.Array(TimerHistoryBoundary),
);

export const decodeTimerNpcSearchResponse = Schema.decodeUnknownEffect(
  TimerNpcSearchResponse,
);

export const decodeCreateAutoTimerResponse = Schema.decodeUnknownEffect(
  CreateAutoTimerResponse,
);
