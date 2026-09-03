/** Transport schemas owned by the internal HTTP module. */
import * as Schema from "effect/Schema";
import { GuildResponseDto_Output } from "../shared.js";
import { FiniteNumber } from "../scalars.js";

export type UserGuildPermissionsDto = typeof UserGuildPermissionsDto.Type;

export const UserGuildPermissionsDto = Schema.Struct({
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
}).annotate({ identifier: "UserGuildPermissionsDto" });

export type GuildsInternalControllerGetUserPermissionsQuery =
  typeof GuildsInternalControllerGetUserPermissionsQuery.Type;

export const GuildsInternalControllerGetUserPermissionsQuery = Schema.Struct({
  discordId: Schema.String,
  userId: Schema.String,
});

export type GuildsInternalControllerGetUserPermissions200 =
  typeof GuildsInternalControllerGetUserPermissions200.Type;

export const GuildsInternalControllerGetUserPermissions200 = Schema.Array(
  UserGuildPermissionsDto,
);

export type GuildsInternalControllerGetGuildByIdOrVanityUrlPathParams =
  typeof GuildsInternalControllerGetGuildByIdOrVanityUrlPathParams.Type;

export const GuildsInternalControllerGetGuildByIdOrVanityUrlPathParams =
  Schema.Struct({ idOrVanityUrl: Schema.String });

export type GuildsInternalControllerGetGuildByIdOrVanityUrl200 =
  typeof GuildsInternalControllerGetGuildByIdOrVanityUrl200.Type;

export const GuildsInternalControllerGetGuildByIdOrVanityUrl200 =
  GuildResponseDto_Output;
