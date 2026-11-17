import { Schema } from "effect";
import {
  MemberProfile,
  MemberRefreshJobResponse,
} from "#src/contracts/members/schemas";
import { DomainDateTime } from "#src/shared/schema/response-codecs";

const optionalNullableDateTime = Schema.optionalKey(
  Schema.NullOr(DomainDateTime),
);

export const MemberBoundary = Schema.Struct({
  ...MemberProfile.fields,
  lastDiscordSyncAt: optionalNullableDateTime,
  lastDiscordAttemptAt: optionalNullableDateTime,
  nextRefreshAt: optionalNullableDateTime,
  updatedAt: DomainDateTime,
});

export const MemberRefreshJobBoundary = Schema.Struct({
  ...MemberRefreshJobResponse.fields,
  createdAt: DomainDateTime,
  nextAvailableAt: DomainDateTime,
  completedAt: optionalNullableDateTime,
});
