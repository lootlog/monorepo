/** Transport schemas owned by the guilds HTTP module. */
import * as Schema from "effect/Schema";
import { RESERVATION_TIME_GRANULARITY_OPTIONS } from "@lootlog/domain/reservations";
import { ErrorKey } from "../../../guilds/enum/error-key.enum.js";
import { GuildResponseDto_Output } from "../shared.js";

export type UserGuildListResponseDto_Output = {
  readonly id: string;
  readonly name: string;
  readonly icon?: string | null;
  readonly vanityUrl?: string | null;
  readonly ownerId: string;
  readonly publicStatsCardEnabled: boolean;
  readonly reservationMaxDurationMinutes?: number;
  readonly reservationMinDurationMinutes?: number;
  readonly reservationTimeGranularityMinutes?: number;
  readonly reservationMaxAdvanceDays?: number;
  readonly reservationActiveLimitPerSpot?: number;
};

export const UserGuildListResponseDto_Output = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  vanityUrl: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  ownerId: Schema.String,
  publicStatsCardEnabled: Schema.Boolean,
  reservationMaxDurationMinutes: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  reservationMinDurationMinutes: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  reservationTimeGranularityMinutes: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  reservationMaxAdvanceDays: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  reservationActiveLimitPerSpot: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
}).annotate({ identifier: "UserGuildListResponseDto_Output" });

export type UserGuildPermissionsDto_Output = {
  readonly guild: { readonly id: string; readonly ownerId: string };
  readonly roles: ReadonlyArray<{
    readonly id: string;
    readonly lvlRangeFrom: number;
    readonly lvlRangeTo: number;
    readonly permissions: ReadonlyArray<
      | "OWNER"
      | "ADMIN"
      | "LOOTLOG_MANAGE"
      | "LOOTLOG_ACCESS"
      | "LOOTLOG_LOOTS_READ"
      | "LOOTLOG_LOOTS_WRITE"
      | "LOOTLOG_LOOTS_ARCHIVE"
      | "LOOTLOG_LOOTS_TITANS_READ"
      | "LOOTLOG_LOOTS_HEROES_READ"
      | "LOOTLOG_TIMERS_READ"
      | "LOOTLOG_TIMERS_WRITE"
      | "LOOTLOG_TIMERS_RESET"
      | "LOOTLOG_TIMERS_DELETE"
      | "LOOTLOG_TIMERS_TITANS_READ"
      | "LOOTLOG_TIMERS_HEROES_READ"
      | "LOOTLOG_RESERVATIONS_READ"
      | "LOOTLOG_RESERVATIONS_WRITE"
      | "LOOTLOG_MEMBERS_READ"
      | "LOOTLOG_ONLINE_PLAYERS_READ"
      | "LOOTLOG_PRESENCE_LOCATION_READ"
      | "LOOTLOG_CHAT_READ"
      | "LOOTLOG_CHAT_WRITE"
      | "LOOTLOG_CHAT_TITANS_READ"
      | "LOOTLOG_CHAT_HEROES_READ"
      | "LOOTLOG_NOTIFICATIONS_READ"
      | "LOOTLOG_NOTIFICATIONS_SEND"
      | "LOOTLOG_NOTIFICATIONS_TITANS_READ"
      | "LOOTLOG_NOTIFICATIONS_HEROES_READ"
      | "LOOTLOG_EVENTS_MANAGE"
      | "LOOTLOG_EVENTS_READ"
      | "LOOTLOG_EVENTS_WRITE"
      | "LOOTLOG_DOCS_READ"
      | "LOOTLOG_DOCS_WRITE"
    >;
  }>;
};

export const UserGuildPermissionsDto_Output = Schema.Struct({
  guild: Schema.Struct({ id: Schema.String, ownerId: Schema.String }),
  roles: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      lvlRangeFrom: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      lvlRangeTo: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
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
    }),
  ),
}).annotate({ identifier: "UserGuildPermissionsDto_Output" });

export type GuildResponseDto = {
  readonly id: string;
  readonly name: string;
  readonly icon?: string | null;
  readonly vanityUrl?: string | null;
  readonly ownerId: string;
  readonly publicStatsCardEnabled: boolean;
  readonly reservationMaxDurationMinutes: number;
  readonly reservationMinDurationMinutes: number;
  readonly reservationTimeGranularityMinutes: number;
  readonly reservationMaxAdvanceDays: number;
  readonly reservationActiveLimitPerSpot: number;
};

export const GuildResponseDto = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  vanityUrl: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  ownerId: Schema.String,
  publicStatsCardEnabled: Schema.Boolean,
  reservationMaxDurationMinutes: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  reservationMinDurationMinutes: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  reservationTimeGranularityMinutes: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  reservationMaxAdvanceDays: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  reservationActiveLimitPerSpot: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
}).annotate({ identifier: "GuildResponseDto" });

export type UpdateGuildConfigDto = {
  readonly vanityUrl?: string | null;
  readonly publicStatsCardEnabled?: boolean;
  readonly reservationMaxDurationMinutes?: number;
  readonly reservationMinDurationMinutes?: number;
  readonly reservationTimeGranularityMinutes?: number;
  readonly reservationMaxAdvanceDays?: number;
  readonly reservationActiveLimitPerSpot?: number;
};

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

export type DiscordGuildSyncStateResponseDto = {
  readonly guildId: string;
  readonly status: "SYNCED" | "SYNCING" | "FAILED" | "STALE" | "NOT_FOUND";
  readonly hasRequiredPermissions: boolean;
  readonly requiredPermissions: ReadonlyArray<string>;
  readonly grantedPermissions: ReadonlyArray<string>;
  readonly missingPermissions: ReadonlyArray<string>;
  readonly channelCount: number;
  readonly selectableChannelCount: number;
  readonly lastAttemptAt: string | null;
  readonly lastSuccessAt: string | null;
  readonly lastError: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

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
  lastAttemptAt: Schema.Union([
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    Schema.Null,
  ]),
  lastSuccessAt: Schema.Union([
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    Schema.Null,
  ]),
  lastError: Schema.Union([Schema.String, Schema.Null]),
  createdAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  updatedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
}).annotate({ identifier: "DiscordGuildSyncStateResponseDto" });

export type GuildsControllerGetUserGuildsQuery = { readonly source?: string };

export const GuildsControllerGetUserGuildsQuery = Schema.Struct({
  source: Schema.optionalKey(Schema.String),
});

export type GuildsControllerGetUserGuilds200 =
  ReadonlyArray<UserGuildListResponseDto_Output>;

export const GuildsControllerGetUserGuilds200 = Schema.Array(
  UserGuildListResponseDto_Output,
);

export type GuildsControllerGetUserGuildsWithPermissions200 =
  ReadonlyArray<UserGuildPermissionsDto_Output>;

export const GuildsControllerGetUserGuildsWithPermissions200 = Schema.Array(
  UserGuildPermissionsDto_Output,
);

export type GuildsControllerGetManageableUserGuilds200 =
  ReadonlyArray<GuildResponseDto>;

export const GuildsControllerGetManageableUserGuilds200 =
  Schema.Array(GuildResponseDto);

export type GuildsControllerGetGuildByIdPathParams = {
  readonly guildId: string;
};

export const GuildsControllerGetGuildByIdPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerGetGuildById200 = GuildResponseDto_Output;

export const GuildsControllerGetGuildById200 = GuildResponseDto_Output;

export type GuildsControllerGetGuildConfigPathParams = {
  readonly guildId: string;
};

export const GuildsControllerGetGuildConfigPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerGetGuildConfig200 = GuildResponseDto_Output;

export const GuildsControllerGetGuildConfig200 = GuildResponseDto_Output;

export type GuildsControllerUpdateGuildConfigPathParams = {
  readonly guildId: string;
};

export const GuildsControllerUpdateGuildConfigPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerUpdateGuildConfigRequestJson = UpdateGuildConfigDto;

export const GuildsControllerUpdateGuildConfigRequestJson =
  UpdateGuildConfigDto;

export type GuildsControllerUpdateGuildConfig200 = GuildResponseDto_Output;

export const GuildsControllerUpdateGuildConfig200 = GuildResponseDto_Output;

export type GuildsControllerGetWorldsByGuildIdPathParams = {
  readonly guildId: string;
};

export const GuildsControllerGetWorldsByGuildIdPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerGetWorldsByGuildId200 = ReadonlyArray<string>;

export const GuildsControllerGetWorldsByGuildId200 = Schema.Array(
  Schema.String,
);

export type GuildsControllerGetGuildPermissionsPathParams = {
  readonly guildId: string;
};

export const GuildsControllerGetGuildPermissionsPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerGetGuildPermissions200 = ReadonlyArray<
  | "OWNER"
  | "ADMIN"
  | "LOOTLOG_MANAGE"
  | "LOOTLOG_ACCESS"
  | "LOOTLOG_LOOTS_READ"
  | "LOOTLOG_LOOTS_WRITE"
  | "LOOTLOG_LOOTS_ARCHIVE"
  | "LOOTLOG_LOOTS_TITANS_READ"
  | "LOOTLOG_LOOTS_HEROES_READ"
  | "LOOTLOG_TIMERS_READ"
  | "LOOTLOG_TIMERS_WRITE"
  | "LOOTLOG_TIMERS_RESET"
  | "LOOTLOG_TIMERS_DELETE"
  | "LOOTLOG_TIMERS_TITANS_READ"
  | "LOOTLOG_TIMERS_HEROES_READ"
  | "LOOTLOG_RESERVATIONS_READ"
  | "LOOTLOG_RESERVATIONS_WRITE"
  | "LOOTLOG_MEMBERS_READ"
  | "LOOTLOG_ONLINE_PLAYERS_READ"
  | "LOOTLOG_PRESENCE_LOCATION_READ"
  | "LOOTLOG_CHAT_READ"
  | "LOOTLOG_CHAT_WRITE"
  | "LOOTLOG_CHAT_TITANS_READ"
  | "LOOTLOG_CHAT_HEROES_READ"
  | "LOOTLOG_NOTIFICATIONS_READ"
  | "LOOTLOG_NOTIFICATIONS_SEND"
  | "LOOTLOG_NOTIFICATIONS_TITANS_READ"
  | "LOOTLOG_NOTIFICATIONS_HEROES_READ"
  | "LOOTLOG_EVENTS_MANAGE"
  | "LOOTLOG_EVENTS_READ"
  | "LOOTLOG_EVENTS_WRITE"
  | "LOOTLOG_DOCS_READ"
  | "LOOTLOG_DOCS_WRITE"
>;

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

export type GuildsControllerGetGuildDiscordSyncStatusPathParams = {
  readonly guildId: string;
};

export const GuildsControllerGetGuildDiscordSyncStatusPathParams =
  Schema.Struct({ guildId: Schema.String });

export type GuildsControllerGetGuildDiscordSyncStatus200 =
  DiscordGuildSyncStateResponseDto;

export const GuildsControllerGetGuildDiscordSyncStatus200 =
  DiscordGuildSyncStateResponseDto;

export type GuildsControllerRefreshGuildDiscordSyncPathParams = {
  readonly guildId: string;
};

export const GuildsControllerRefreshGuildDiscordSyncPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type GuildsControllerRefreshGuildDiscordSync201 =
  DiscordGuildSyncStateResponseDto;

export const GuildsControllerRefreshGuildDiscordSync201 =
  DiscordGuildSyncStateResponseDto;
