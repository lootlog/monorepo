import {
  discordPermissionFields,
  DiscordGuildSyncStatus,
} from "@lootlog/schema/discord";
/** Shared input and output schemas for the guilds feature. */
import * as Schema from "effect/Schema";
import {
  NonEmptyString,
  SafeInteger,
  DateTimeString,
  FiniteNumber,
} from "@lootlog/schema/http-scalars";
import { RESERVATION_TIME_GRANULARITY_OPTIONS } from "@lootlog/domain/reservations";
import { ErrorKey } from "#src/guilds/error-key";

const OrganizationCapability = Schema.Literals([
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
]);

export type UserOrganizationSummary = typeof UserOrganizationSummary.Type;

export const UserOrganizationSummary = Schema.Struct({
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

export type OrganizationPermissionsResponse =
  typeof OrganizationPermissionsResponse.Type;

export const OrganizationPermissionsResponse = Schema.Struct({
  guild: Schema.Struct({ id: Schema.String, ownerId: Schema.String }),
  roles: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      lvlRangeFrom: FiniteNumber,
      lvlRangeTo: FiniteNumber,
      permissions: Schema.Array(OrganizationCapability),
    }),
  ),
}).annotate({ identifier: "UserGuildPermissionsDto_Output" });

export type ManageableOrganizationResponse =
  typeof ManageableOrganizationResponse.Type;

export const ManageableOrganizationResponse = Schema.Struct({
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

export type UpdateOrganizationConfigRequest =
  typeof UpdateOrganizationConfigRequest.Type;

export const UpdateOrganizationConfigRequest = Schema.Struct({
  vanityUrl: Schema.optionalKey(Schema.Union([NonEmptyString, Schema.Null])),
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
    SafeInteger.check(
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

export type DiscordGuildSyncStateResponse =
  typeof DiscordGuildSyncStateResponse.Type;

export const DiscordGuildSyncStateResponse = Schema.Struct({
  guildId: Schema.String,
  status: DiscordGuildSyncStatus,
  ...discordPermissionFields,
  channelCount: SafeInteger,
  selectableChannelCount: SafeInteger,
  lastAttemptAt: Schema.Union([DateTimeString, Schema.Null]),
  lastSuccessAt: Schema.Union([DateTimeString, Schema.Null]),
  lastError: Schema.Union([Schema.String, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "DiscordGuildSyncStateResponseDto" });

export type UserOrganizationsQuery = typeof UserOrganizationsQuery.Type;

export const UserOrganizationsQuery = Schema.Struct({
  source: Schema.optionalKey(Schema.String),
});

export type UserOrganizationsResponse = typeof UserOrganizationsResponse.Type;

export const UserOrganizationsResponse = Schema.Array(UserOrganizationSummary);

export type UserOrganizationPermissionsResponse =
  typeof UserOrganizationPermissionsResponse.Type;

export const UserOrganizationPermissionsResponse = Schema.Array(
  OrganizationPermissionsResponse,
);

export type ManageableOrganizationsResponse =
  typeof ManageableOrganizationsResponse.Type;

export const ManageableOrganizationsResponse = Schema.Array(
  ManageableOrganizationResponse,
);

export type OrganizationPath = typeof OrganizationPath.Type;

export const OrganizationPath = Schema.Struct({
  guildId: Schema.String,
});

export type OrganizationWorldsResponse = typeof OrganizationWorldsResponse.Type;

export const OrganizationWorldsResponse = Schema.Array(Schema.String);

export type OrganizationCapabilitiesResponse =
  typeof OrganizationCapabilitiesResponse.Type;

export const OrganizationCapabilitiesResponse = Schema.Array(
  OrganizationCapability,
);
