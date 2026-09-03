/** Transport schemas owned by the members HTTP module. */
import * as Schema from "effect/Schema";
import { DateTimeString, FiniteNumber } from "../scalars.js";

export type NullableMemberResponseDto = typeof NullableMemberResponseDto.Type;

export const NullableMemberResponseDto = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      id: FiniteNumber,
      userId: Schema.String,
      guildId: Schema.String,
      type: Schema.Literals(["OWNER", "ADMIN", "USER", "BOT"]),
      name: Schema.String,
      avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
      banner: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
      active: Schema.Boolean,
      roles: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          guildId: Schema.String,
          name: Schema.String,
          color: Schema.Union([FiniteNumber, Schema.Null]),
          position: Schema.optionalKey(
            Schema.Union([FiniteNumber, Schema.Null]),
          ),
          permissions: Schema.Array(
            Schema.Literals([
              "OWNER",
              "ADMIN",
              "LOOTLOG_MANAGE",
              "LOOTLOG_ACCESS",
              "LOOTLOG_LOOTS_READ",
              "LOOTLOG_LOOTS_WRITE",
              "LOOTLOG_LOOTS_ARCHIVE",
              "LOOTLOG_LOOTS_TITANS_READ",
              "LOOTLOG_LOOTS_HEROES_READ",
              "LOOTLOG_TIMERS_READ",
              "LOOTLOG_TIMERS_WRITE",
              "LOOTLOG_TIMERS_RESET",
              "LOOTLOG_TIMERS_DELETE",
              "LOOTLOG_TIMERS_TITANS_READ",
              "LOOTLOG_TIMERS_HEROES_READ",
              "LOOTLOG_RESERVATIONS_READ",
              "LOOTLOG_RESERVATIONS_WRITE",
              "LOOTLOG_MEMBERS_READ",
              "LOOTLOG_ONLINE_PLAYERS_READ",
              "LOOTLOG_PRESENCE_LOCATION_READ",
              "LOOTLOG_CHAT_READ",
              "LOOTLOG_CHAT_WRITE",
              "LOOTLOG_CHAT_TITANS_READ",
              "LOOTLOG_CHAT_HEROES_READ",
              "LOOTLOG_NOTIFICATIONS_READ",
              "LOOTLOG_NOTIFICATIONS_SEND",
              "LOOTLOG_NOTIFICATIONS_TITANS_READ",
              "LOOTLOG_NOTIFICATIONS_HEROES_READ",
              "LOOTLOG_EVENTS_MANAGE",
              "LOOTLOG_EVENTS_READ",
              "LOOTLOG_EVENTS_WRITE",
              "LOOTLOG_DOCS_READ",
              "LOOTLOG_DOCS_WRITE",
            ]),
          ),
          lvlRangeFrom: Schema.optionalKey(
            Schema.Union([FiniteNumber, Schema.Null]),
          ),
          lvlRangeTo: Schema.optionalKey(
            Schema.Union([FiniteNumber, Schema.Null]),
          ),
        }),
      ),
      globalUserId: Schema.optionalKey(
        Schema.Union([Schema.String, Schema.Null]),
      ),
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
    }),
    [
      Schema.Record(
        Schema.String,
        Schema.Json.annotate({ expected: "JSON value" }),
      ),
    ],
  ),
  Schema.Null,
]).annotate({ identifier: "NullableMemberResponseDto" });

export type MemberResponseDto = typeof MemberResponseDto.Type;

export const MemberResponseDto = Schema.Struct({
  id: FiniteNumber,
  userId: Schema.String,
  guildId: Schema.String,
  type: Schema.Literals(["OWNER", "ADMIN", "USER", "BOT"]),
  name: Schema.String,
  avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  banner: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  active: Schema.Boolean,
  roles: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      guildId: Schema.String,
      name: Schema.String,
      color: Schema.Union([FiniteNumber, Schema.Null]),
      position: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
      permissions: Schema.Array(
        Schema.Literals([
          "OWNER",
          "ADMIN",
          "LOOTLOG_MANAGE",
          "LOOTLOG_ACCESS",
          "LOOTLOG_LOOTS_READ",
          "LOOTLOG_LOOTS_WRITE",
          "LOOTLOG_LOOTS_ARCHIVE",
          "LOOTLOG_LOOTS_TITANS_READ",
          "LOOTLOG_LOOTS_HEROES_READ",
          "LOOTLOG_TIMERS_READ",
          "LOOTLOG_TIMERS_WRITE",
          "LOOTLOG_TIMERS_RESET",
          "LOOTLOG_TIMERS_DELETE",
          "LOOTLOG_TIMERS_TITANS_READ",
          "LOOTLOG_TIMERS_HEROES_READ",
          "LOOTLOG_RESERVATIONS_READ",
          "LOOTLOG_RESERVATIONS_WRITE",
          "LOOTLOG_MEMBERS_READ",
          "LOOTLOG_ONLINE_PLAYERS_READ",
          "LOOTLOG_PRESENCE_LOCATION_READ",
          "LOOTLOG_CHAT_READ",
          "LOOTLOG_CHAT_WRITE",
          "LOOTLOG_CHAT_TITANS_READ",
          "LOOTLOG_CHAT_HEROES_READ",
          "LOOTLOG_NOTIFICATIONS_READ",
          "LOOTLOG_NOTIFICATIONS_SEND",
          "LOOTLOG_NOTIFICATIONS_TITANS_READ",
          "LOOTLOG_NOTIFICATIONS_HEROES_READ",
          "LOOTLOG_EVENTS_MANAGE",
          "LOOTLOG_EVENTS_READ",
          "LOOTLOG_EVENTS_WRITE",
          "LOOTLOG_DOCS_READ",
          "LOOTLOG_DOCS_WRITE",
        ]),
      ),
      lvlRangeFrom: Schema.optionalKey(
        Schema.Union([FiniteNumber, Schema.Null]),
      ),
      lvlRangeTo: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
    }),
  ),
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
}).annotate({ identifier: "MemberResponseDto" });

export type MemberLootlogConfigSummaryResponseDto_Output =
  typeof MemberLootlogConfigSummaryResponseDto_Output.Type;

export const MemberLootlogConfigSummaryResponseDto_Output = Schema.Struct({
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

export type MemberReferenceResponseDto_Output =
  typeof MemberReferenceResponseDto_Output.Type;

export const MemberReferenceResponseDto_Output = Schema.Struct({
  id: FiniteNumber,
  userId: Schema.String,
  name: Schema.String,
  avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  color: Schema.Union([FiniteNumber, Schema.Null]),
  active: Schema.Boolean,
}).annotate({ identifier: "MemberReferenceResponseDto_Output" });

export type MemberSummaryResponseDto_Output =
  typeof MemberSummaryResponseDto_Output.Type;

export const MemberSummaryResponseDto_Output = Schema.Struct({
  id: FiniteNumber,
  userId: Schema.String,
  name: Schema.String,
  avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  color: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
}).annotate({ identifier: "MemberSummaryResponseDto_Output" });

export type MemberRefreshJobResponseDto =
  typeof MemberRefreshJobResponseDto.Type;

export const MemberRefreshJobResponseDto = Schema.Struct({
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

export type NullableMemberRefreshJobResponseDto =
  typeof NullableMemberRefreshJobResponseDto.Type;

export const NullableMemberRefreshJobResponseDto = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      id: FiniteNumber,
      guildId: Schema.String,
      status: Schema.Literals(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
      totalMembers: FiniteNumber,
      processedMembers: FiniteNumber,
      failedMembers: FiniteNumber,
      createdAt: DateTimeString,
      nextAvailableAt: DateTimeString,
      completedAt: Schema.optionalKey(
        Schema.Union([DateTimeString, Schema.Null]),
      ),
    }),
    [
      Schema.Record(
        Schema.String,
        Schema.Json.annotate({ expected: "JSON value" }),
      ),
    ],
  ),
  Schema.Null,
]).annotate({ identifier: "NullableMemberRefreshJobResponseDto" });

export type MembersControllerGetMePathParams =
  typeof MembersControllerGetMePathParams.Type;

export const MembersControllerGetMePathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type MembersControllerGetMe200 = typeof MembersControllerGetMe200.Type;

export const MembersControllerGetMe200 = NullableMemberResponseDto;

export type MembersControllerRefreshMePathParams =
  typeof MembersControllerRefreshMePathParams.Type;

export const MembersControllerRefreshMePathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type MembersControllerRefreshMe200 =
  typeof MembersControllerRefreshMe200.Type;

export const MembersControllerRefreshMe200 = NullableMemberResponseDto;

export type MembersControllerRefreshMemberPathParams =
  typeof MembersControllerRefreshMemberPathParams.Type;

export const MembersControllerRefreshMemberPathParams = Schema.Struct({
  discordId: Schema.String.annotate({ examples: ["user_123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerRefreshMember200 =
  typeof MembersControllerRefreshMember200.Type;

export const MembersControllerRefreshMember200 = NullableMemberResponseDto;

export type MembersControllerDeactivateMemberPathParams =
  typeof MembersControllerDeactivateMemberPathParams.Type;

export const MembersControllerDeactivateMemberPathParams = Schema.Struct({
  discordId: Schema.String.annotate({ examples: ["user_123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerDeactivateMember200 =
  typeof MembersControllerDeactivateMember200.Type;

export const MembersControllerDeactivateMember200 = MemberResponseDto;

export type MembersControllerGetMemberLootlogConfigSummaryPathParams =
  typeof MembersControllerGetMemberLootlogConfigSummaryPathParams.Type;

export const MembersControllerGetMemberLootlogConfigSummaryPathParams =
  Schema.Struct({
    discordId: Schema.String.annotate({ examples: ["user_123"] }),
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type MembersControllerGetMemberLootlogConfigSummary200 =
  typeof MembersControllerGetMemberLootlogConfigSummary200.Type;

export const MembersControllerGetMemberLootlogConfigSummary200 =
  MemberLootlogConfigSummaryResponseDto_Output;

export type MembersControllerGetGuildMembersPathParams =
  typeof MembersControllerGetGuildMembersPathParams.Type;

export const MembersControllerGetGuildMembersPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerGetGuildMembersQuery =
  typeof MembersControllerGetGuildMembersQuery.Type;

export const MembersControllerGetGuildMembersQuery = Schema.Struct({
  includeInactive: Schema.optionalKey(Schema.Boolean),
});

export type MembersControllerGetGuildMembers200 =
  typeof MembersControllerGetGuildMembers200.Type;

export const MembersControllerGetGuildMembers200 =
  Schema.Array(MemberResponseDto);

export type MembersControllerGetGuildMemberReferencesPathParams =
  typeof MembersControllerGetGuildMemberReferencesPathParams.Type;

export const MembersControllerGetGuildMemberReferencesPathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type MembersControllerGetGuildMemberReferencesQuery =
  typeof MembersControllerGetGuildMemberReferencesQuery.Type;

export const MembersControllerGetGuildMemberReferencesQuery = Schema.Struct({
  includeInactive: Schema.optionalKey(Schema.Boolean),
});

export type MembersControllerGetGuildMemberReferences200 =
  typeof MembersControllerGetGuildMemberReferences200.Type;

export const MembersControllerGetGuildMemberReferences200 = Schema.Array(
  MemberReferenceResponseDto_Output,
);

export type MembersControllerGetGuildMembersSummaryPathParams =
  typeof MembersControllerGetGuildMembersSummaryPathParams.Type;

export const MembersControllerGetGuildMembersSummaryPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerGetGuildMembersSummary200 =
  typeof MembersControllerGetGuildMembersSummary200.Type;

export const MembersControllerGetGuildMembersSummary200 = Schema.Array(
  MemberSummaryResponseDto_Output,
);

export type MembersControllerRefreshAllMembersPathParams =
  typeof MembersControllerRefreshAllMembersPathParams.Type;

export const MembersControllerRefreshAllMembersPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerRefreshAllMembers201 =
  typeof MembersControllerRefreshAllMembers201.Type;

export const MembersControllerRefreshAllMembers201 =
  MemberRefreshJobResponseDto;

export type MembersControllerGetLatestRefreshJobPathParams =
  typeof MembersControllerGetLatestRefreshJobPathParams.Type;

export const MembersControllerGetLatestRefreshJobPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerGetLatestRefreshJob200 =
  typeof MembersControllerGetLatestRefreshJob200.Type;

export const MembersControllerGetLatestRefreshJob200 =
  NullableMemberRefreshJobResponseDto;

export type MembersControllerGetRefreshJobStatusPathParams =
  typeof MembersControllerGetRefreshJobStatusPathParams.Type;

export const MembersControllerGetRefreshJobStatusPathParams = Schema.Struct({
  jobId: FiniteNumber,
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerGetRefreshJobStatus200 =
  typeof MembersControllerGetRefreshJobStatus200.Type;

export const MembersControllerGetRefreshJobStatus200 =
  MemberRefreshJobResponseDto;
