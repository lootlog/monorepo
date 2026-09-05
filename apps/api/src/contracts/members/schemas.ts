/** Shared input and output schemas for the members feature. */
import * as Schema from "effect/Schema";
import { MemberRole } from "#src/contracts/roles/schemas";
import { DateTimeString, FiniteNumber } from "@lootlog/schema/http-scalars";

export const MemberProfile = Schema.Struct({
  id: FiniteNumber,
  userId: Schema.String,
  guildId: Schema.String,
  type: Schema.Literals(["OWNER", "ADMIN", "USER", "BOT"]),
  name: Schema.String,
  avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  banner: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  active: Schema.Boolean,
  roles: Schema.Array(MemberRole),
  globalUserId: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  lastDiscordSyncAt: Schema.optionalKey(
    Schema.Union([DateTimeString, Schema.Null]),
  ),
  lastDiscordAttemptAt: Schema.optionalKey(
    Schema.Union([DateTimeString, Schema.Null]),
  ),
  lastDiscordStatus: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Null]),
  ),
  isStale: Schema.optionalKey(Schema.Boolean),
  staleWarning: Schema.optionalKey(Schema.String),
  refreshQueued: Schema.optionalKey(Schema.Boolean),
  nextRefreshAt: Schema.optionalKey(
    Schema.Union([DateTimeString, Schema.Null]),
  ),
  updatedAt: DateTimeString,
});

export type NullableMemberResponse = typeof NullableMemberResponse.Type;

export const NullableMemberResponse = Schema.Union([
  Schema.StructWithRest(MemberProfile, [
    Schema.Record(
      Schema.String,
      Schema.Json.annotate({ expected: "JSON value" }),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "NullableMemberResponseDto" });

export type MemberResponse = typeof MemberResponse.Type;

export const MemberResponse = MemberProfile.annotate({
  identifier: "MemberResponseDto",
});

export type MemberLootlogConfigSummaryResponse =
  typeof MemberLootlogConfigSummaryResponse.Type;

export const MemberLootlogConfigSummaryResponse = Schema.Struct({
  memberUserId: Schema.String,
  guildId: Schema.String,
  isActive: Schema.Boolean,
  configuredCharacterCount: FiniteNumber,
  enabledCharacterCount: FiniteNumber,
  characters: Schema.Array(
    Schema.Struct({
      accountId: Schema.String,
      characterId: Schema.String,
      enabledForGuild: Schema.Boolean,
      characterName: Schema.Union([Schema.String, Schema.Null]),
      world: Schema.Union([Schema.String, Schema.Null]),
      icon: Schema.Union([Schema.String, Schema.Null]),
      metadataStatus: Schema.Literals([
        "resolved",
        "missing_snapshot",
        "invalid_character_ref",
      ]),
    }),
  ),
}).annotate({ identifier: "MemberLootlogConfigSummaryResponseDto_Output" });

export type MemberReferenceResponse = typeof MemberReferenceResponse.Type;

export const MemberReferenceResponse = Schema.Struct({
  id: FiniteNumber,
  userId: Schema.String,
  name: Schema.String,
  avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  color: Schema.Union([FiniteNumber, Schema.Null]),
  active: Schema.Boolean,
}).annotate({ identifier: "MemberReferenceResponseDto_Output" });

export type MemberSummaryResponse = typeof MemberSummaryResponse.Type;

export const MemberSummaryResponse = Schema.Struct({
  id: FiniteNumber,
  userId: Schema.String,
  name: Schema.String,
  avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  color: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
}).annotate({ identifier: "MemberSummaryResponseDto_Output" });

export type MemberRefreshJobResponse = typeof MemberRefreshJobResponse.Type;

export const MemberRefreshJobResponse = Schema.Struct({
  id: FiniteNumber,
  guildId: Schema.String,
  status: Schema.Literals(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  totalMembers: FiniteNumber,
  processedMembers: FiniteNumber,
  failedMembers: FiniteNumber,
  createdAt: DateTimeString,
  nextAvailableAt: DateTimeString,
  completedAt: Schema.optionalKey(Schema.Union([DateTimeString, Schema.Null])),
}).annotate({ identifier: "MemberRefreshJobResponseDto" });

export type NullableMemberRefreshJobResponse =
  typeof NullableMemberRefreshJobResponse.Type;

export const NullableMemberRefreshJobResponse = Schema.Union([
  Schema.StructWithRest(Schema.Struct(MemberRefreshJobResponse.fields), [
    Schema.Record(
      Schema.String,
      Schema.Json.annotate({ expected: "JSON value" }),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "NullableMemberRefreshJobResponseDto" });

export type CurrentMemberOrganizationPath =
  typeof CurrentMemberOrganizationPath.Type;

export const CurrentMemberOrganizationPath = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type MemberPath = typeof MemberPath.Type;

export const MemberPath = Schema.Struct({
  discordId: Schema.String.annotate({ examples: ["user_123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MemberOrganizationPath = typeof MemberOrganizationPath.Type;

export const MemberOrganizationPath = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersQuery = typeof MembersQuery.Type;

export const MembersQuery = Schema.Struct({
  includeInactive: Schema.optionalKey(Schema.Boolean),
});

export type MembersResponse = typeof MembersResponse.Type;

export const MembersResponse = Schema.Array(MemberResponse);

export type MemberReferencesResponse = typeof MemberReferencesResponse.Type;

export const MemberReferencesResponse = Schema.Array(MemberReferenceResponse);

export type MemberSummariesResponse = typeof MemberSummariesResponse.Type;

export const MemberSummariesResponse = Schema.Array(MemberSummaryResponse);

export type MemberRefreshJobPath = typeof MemberRefreshJobPath.Type;

export const MemberRefreshJobPath = Schema.Struct({
  jobId: FiniteNumber,
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});
