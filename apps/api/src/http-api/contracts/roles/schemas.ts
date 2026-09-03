/** Transport schemas owned by the roles HTTP module. */
import * as Schema from "effect/Schema";

export type RoleResponseDto_Output = {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly color: number | null;
  readonly position?: number | null;
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
  readonly lvlRangeFrom?: number | null;
  readonly lvlRangeTo?: number | null;
};

export const RoleResponseDto_Output = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  color: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  position: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
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
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
  ),
  lvlRangeTo: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
  ),
}).annotate({ identifier: "RoleResponseDto_Output" });

export type UpdateRolePermissionsDto = {
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
  readonly lvlRangeFrom: number;
  readonly lvlRangeTo: number;
};

export const UpdateRolePermissionsDto = Schema.Struct({
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
  lvlRangeFrom: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  lvlRangeTo: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
}).annotate({ identifier: "UpdateRolePermissionsDto" });

export type RolesControllerGetGuildRolesPathParams = {
  readonly guildId: Schema.Json;
};

export const RolesControllerGetGuildRolesPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type RolesControllerGetGuildRoles200 =
  ReadonlyArray<RoleResponseDto_Output>;

export const RolesControllerGetGuildRoles200 = Schema.Array(
  RoleResponseDto_Output,
);

export type RolesControllerUpdateGuildRolePathParams = {
  readonly roleId: string;
  readonly guildId: Schema.Json;
};

export const RolesControllerUpdateGuildRolePathParams = Schema.Struct({
  roleId: Schema.String.annotate({ examples: ["role_123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type RolesControllerUpdateGuildRoleRequestJson =
  UpdateRolePermissionsDto;

export const RolesControllerUpdateGuildRoleRequestJson =
  UpdateRolePermissionsDto;

export type RolesControllerUpdateGuildRole200 = RoleResponseDto_Output;

export const RolesControllerUpdateGuildRole200 = RoleResponseDto_Output;
