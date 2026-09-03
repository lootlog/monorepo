/** Transport schemas owned by the internal HTTP module. */
import * as Schema from "effect/Schema";
import { GuildResponseDto_Output } from "../shared.js";

export type UserGuildPermissionsDto = {
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

export const UserGuildPermissionsDto = Schema.Struct({
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
}).annotate({ identifier: "UserGuildPermissionsDto" });

export type GuildsInternalControllerGetUserPermissionsQuery = {
  readonly discordId: string;
  readonly userId: string;
};

export const GuildsInternalControllerGetUserPermissionsQuery = Schema.Struct({
  discordId: Schema.String,
  userId: Schema.String,
});

export type GuildsInternalControllerGetUserPermissions200 =
  ReadonlyArray<UserGuildPermissionsDto>;

export const GuildsInternalControllerGetUserPermissions200 = Schema.Array(
  UserGuildPermissionsDto,
);

export type GuildsInternalControllerGetGuildByIdOrVanityUrlPathParams = {
  readonly idOrVanityUrl: string;
};

export const GuildsInternalControllerGetGuildByIdOrVanityUrlPathParams =
  Schema.Struct({ idOrVanityUrl: Schema.String });

export type GuildsInternalControllerGetGuildByIdOrVanityUrl200 =
  GuildResponseDto_Output;

export const GuildsInternalControllerGetGuildByIdOrVanityUrl200 =
  GuildResponseDto_Output;
