/** Transport schemas owned by the guilds HTTP module. */
import * as Schema from "effect/Schema";
import { RESERVATION_TIME_GRANULARITY_OPTIONS } from "@lootlog/domain/reservations";
import { ErrorKey } from "../../../guilds/error-key.js";
import { GuildResponseDto_Output } from "../shared.js";
import { DateTimeString, FiniteNumber } from "../scalars.js";

export type UserGuildListResponseDto_Output =
  typeof UserGuildListResponseDto_Output.Type;

export const UserGuildListResponseDto_Output = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  vanityUrl: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  ownerId: Schema.String,
  publicStatsCardEnabled: Schema.Boolean,
  reservationMaxDurationMinutes: Schema.optionalKey(FiniteNumber),
  reservationMinDurationMinutes: Schema.optionalKey(FiniteNumber),
  reservationTimeGranularityMinutes: Schema.optionalKey(FiniteNumber),
  reservationMaxAdvanceDays: Schema.optionalKey(FiniteNumber),
  reservationActiveLimitPerSpot: Schema.optionalKey(FiniteNumber),
}).annotate({ identifier: "UserGuildListResponseDto_Output" });

export type UserGuildPermissionsDto_Output =
  typeof UserGuildPermissionsDto_Output.Type;

export const UserGuildPermissionsDto_Output = Schema.Struct({
  guild: Schema.Struct({ id: Schema.String, ownerId: Schema.String }),
  roles: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      lvlRangeFrom: FiniteNumber,
      lvlRangeTo: FiniteNumber,
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
    }),
  ),
}).annotate({ identifier: "UserGuildPermissionsDto_Output" });

export type GuildResponseDto = typeof GuildResponseDto.Type;

export const GuildResponseDto = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  vanityUrl: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  ownerId: Schema.String,
  publicStatsCardEnabled: Schema.Boolean,
  reservationMaxDurationMinutes: FiniteNumber,
  reservationMinDurationMinutes: FiniteNumber,
  reservationTimeGranularityMinutes: FiniteNumber,
  reservationMaxAdvanceDays: FiniteNumber,
  reservationActiveLimitPerSpot: FiniteNumber,
}).annotate({ identifier: "GuildResponseDto" });

export type UpdateGuildConfigDto = typeof UpdateGuildConfigDto.Type;

export const UpdateGuildConfigDto = Schema.Struct({
  vanityUrl: Schema.optionalKey(
    Schema.Union([
      Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      Schema.Null,
    ]),
  ),
  publicStatsCardEnabled: Schema.optionalKey(Schema.Boolean),
  reservationMaxDurationMinutes: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(30).annotate({
          expected: "a value greater than or equal to 30",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(720).annotate({
          expected: "a value less than or equal to 720",
        }),
      ),
  ),
  reservationMinDurationMinutes: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(5).annotate({
          expected: "a value greater than or equal to 5",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(240).annotate({
          expected: "a value less than or equal to 240",
        }),
      ),
  ),
  reservationTimeGranularityMinutes: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      )
      .check(
        Schema.makeFilter(
          (value) =>
            RESERVATION_TIME_GRANULARITY_OPTIONS.some(
              (granularity) => granularity === value,
            ),
          { message: ErrorKey.GUILDS_RESERVATION_TIME_GRANULARITY_INVALID },
        ),
      ),
  ),
  reservationMaxAdvanceDays: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(30).annotate({
          expected: "a value less than or equal to 30",
        }),
      ),
  ),
  reservationActiveLimitPerSpot: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(10).annotate({
          expected: "a value less than or equal to 10",
        }),
      ),
  ),
}).annotate({ identifier: "UpdateGuildConfigDto" });

export type DiscordGuildSyncStateResponseDto =
  typeof DiscordGuildSyncStateResponseDto.Type;

export const DiscordGuildSyncStateResponseDto = Schema.Struct({
  guildId: Schema.String,
  status: Schema.Literals([
    "SYNCED",
    "SYNCING",
    "FAILED",
    "STALE",
    "NOT_FOUND",
  ]),
  hasRequiredPermissions: Schema.Boolean,
  requiredPermissions: Schema.Array(Schema.String),
  grantedPermissions: Schema.Array(Schema.String),
  missingPermissions: Schema.Array(Schema.String),
  channelCount: Schema.Number.check(
    Schema.isInt().annotate({ expected: "an integer" }),
  )
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
  selectableChannelCount: Schema.Number.check(
    Schema.isInt().annotate({ expected: "an integer" }),
  )
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
  lastAttemptAt: Schema.Union([DateTimeString, Schema.Null]),
  lastSuccessAt: Schema.Union([DateTimeString, Schema.Null]),
  lastError: Schema.Union([Schema.String, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "DiscordGuildSyncStateResponseDto" });

export type GuildsControllerGetUserGuildsQuery =
  typeof GuildsControllerGetUserGuildsQuery.Type;

export const GuildsControllerGetUserGuildsQuery = Schema.Struct({
  source: Schema.optionalKey(Schema.String),
});

export type GuildsControllerGetUserGuilds200 =
  typeof GuildsControllerGetUserGuilds200.Type;

export const GuildsControllerGetUserGuilds200 = Schema.Array(
  UserGuildListResponseDto_Output,
);

export type GuildsControllerGetUserGuildsWithPermissions200 =
  typeof GuildsControllerGetUserGuildsWithPermissions200.Type;

export const GuildsControllerGetUserGuildsWithPermissions200 = Schema.Array(
  UserGuildPermissionsDto_Output,
);

export type GuildsControllerGetManageableUserGuilds200 =
  typeof GuildsControllerGetManageableUserGuilds200.Type;

export const GuildsControllerGetManageableUserGuilds200 =
  Schema.Array(GuildResponseDto);

export type GuildsControllerGetGuildByIdPathParams =
  typeof GuildsControllerGetGuildByIdPathParams.Type;

export const GuildsControllerGetGuildByIdPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerGetGuildById200 =
  typeof GuildsControllerGetGuildById200.Type;

export const GuildsControllerGetGuildById200 = GuildResponseDto_Output;

export type GuildsControllerGetGuildConfigPathParams =
  typeof GuildsControllerGetGuildConfigPathParams.Type;

export const GuildsControllerGetGuildConfigPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerGetGuildConfig200 =
  typeof GuildsControllerGetGuildConfig200.Type;

export const GuildsControllerGetGuildConfig200 = GuildResponseDto_Output;

export type GuildsControllerUpdateGuildConfigPathParams =
  typeof GuildsControllerUpdateGuildConfigPathParams.Type;

export const GuildsControllerUpdateGuildConfigPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerUpdateGuildConfigRequestJson =
  typeof GuildsControllerUpdateGuildConfigRequestJson.Type;

export const GuildsControllerUpdateGuildConfigRequestJson =
  UpdateGuildConfigDto;

export type GuildsControllerUpdateGuildConfig200 =
  typeof GuildsControllerUpdateGuildConfig200.Type;

export const GuildsControllerUpdateGuildConfig200 = GuildResponseDto_Output;

export type GuildsControllerGetWorldsByGuildIdPathParams =
  typeof GuildsControllerGetWorldsByGuildIdPathParams.Type;

export const GuildsControllerGetWorldsByGuildIdPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerGetWorldsByGuildId200 =
  typeof GuildsControllerGetWorldsByGuildId200.Type;

export const GuildsControllerGetWorldsByGuildId200 = Schema.Array(
  Schema.String,
);

export type GuildsControllerGetGuildPermissionsPathParams =
  typeof GuildsControllerGetGuildPermissionsPathParams.Type;

export const GuildsControllerGetGuildPermissionsPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerGetGuildPermissions200 =
  typeof GuildsControllerGetGuildPermissions200.Type;

export const GuildsControllerGetGuildPermissions200 = Schema.Array(
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
);

export type GuildsControllerGetGuildDiscordSyncStatusPathParams =
  typeof GuildsControllerGetGuildDiscordSyncStatusPathParams.Type;

export const GuildsControllerGetGuildDiscordSyncStatusPathParams =
  Schema.Struct({ guildId: Schema.String });

export type GuildsControllerGetGuildDiscordSyncStatus200 =
  typeof GuildsControllerGetGuildDiscordSyncStatus200.Type;

export const GuildsControllerGetGuildDiscordSyncStatus200 =
  DiscordGuildSyncStateResponseDto;

export type GuildsControllerRefreshGuildDiscordSyncPathParams =
  typeof GuildsControllerRefreshGuildDiscordSyncPathParams.Type;

export const GuildsControllerRefreshGuildDiscordSyncPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerRefreshGuildDiscordSync201 =
  typeof GuildsControllerRefreshGuildDiscordSync201.Type;

export const GuildsControllerRefreshGuildDiscordSync201 =
  DiscordGuildSyncStateResponseDto;
