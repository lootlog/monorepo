import { Schema } from "effect";

export const Capability = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  LOOTLOG_MANAGE: "LOOTLOG_MANAGE",
  LOOTLOG_ACCESS: "LOOTLOG_ACCESS",
  LOOTLOG_LOOTS_READ: "LOOTLOG_LOOTS_READ",
  LOOTLOG_LOOTS_WRITE: "LOOTLOG_LOOTS_WRITE",
  LOOTLOG_LOOTS_ARCHIVE: "LOOTLOG_LOOTS_ARCHIVE",
  LOOTLOG_LOOTS_TITANS_READ: "LOOTLOG_LOOTS_TITANS_READ",
  LOOTLOG_LOOTS_HEROES_READ: "LOOTLOG_LOOTS_HEROES_READ",
  LOOTLOG_TIMERS_READ: "LOOTLOG_TIMERS_READ",
  LOOTLOG_TIMERS_WRITE: "LOOTLOG_TIMERS_WRITE",
  LOOTLOG_TIMERS_RESET: "LOOTLOG_TIMERS_RESET",
  LOOTLOG_TIMERS_DELETE: "LOOTLOG_TIMERS_DELETE",
  LOOTLOG_TIMERS_TITANS_READ: "LOOTLOG_TIMERS_TITANS_READ",
  LOOTLOG_TIMERS_HEROES_READ: "LOOTLOG_TIMERS_HEROES_READ",
  LOOTLOG_RESERVATIONS_READ: "LOOTLOG_RESERVATIONS_READ",
  LOOTLOG_RESERVATIONS_WRITE: "LOOTLOG_RESERVATIONS_WRITE",
  LOOTLOG_MEMBERS_READ: "LOOTLOG_MEMBERS_READ",
  LOOTLOG_ONLINE_PLAYERS_READ: "LOOTLOG_ONLINE_PLAYERS_READ",
  LOOTLOG_PRESENCE_LOCATION_READ: "LOOTLOG_PRESENCE_LOCATION_READ",
  LOOTLOG_CHAT_READ: "LOOTLOG_CHAT_READ",
  LOOTLOG_CHAT_WRITE: "LOOTLOG_CHAT_WRITE",
  LOOTLOG_CHAT_TITANS_READ: "LOOTLOG_CHAT_TITANS_READ",
  LOOTLOG_CHAT_HEROES_READ: "LOOTLOG_CHAT_HEROES_READ",
  LOOTLOG_NOTIFICATIONS_READ: "LOOTLOG_NOTIFICATIONS_READ",
  LOOTLOG_NOTIFICATIONS_SEND: "LOOTLOG_NOTIFICATIONS_SEND",
  LOOTLOG_NOTIFICATIONS_TITANS_READ: "LOOTLOG_NOTIFICATIONS_TITANS_READ",
  LOOTLOG_NOTIFICATIONS_HEROES_READ: "LOOTLOG_NOTIFICATIONS_HEROES_READ",
  LOOTLOG_EVENTS_MANAGE: "LOOTLOG_EVENTS_MANAGE",
  LOOTLOG_EVENTS_READ: "LOOTLOG_EVENTS_READ",
  LOOTLOG_EVENTS_WRITE: "LOOTLOG_EVENTS_WRITE",
  LOOTLOG_DOCS_READ: "LOOTLOG_DOCS_READ",
  LOOTLOG_DOCS_WRITE: "LOOTLOG_DOCS_WRITE",
} as const;

export type Capability = (typeof Capability)[keyof typeof Capability];

export const Permission = Capability;
export type Permission = Capability;

export interface UserGuildPermissionsRole {
  id: string;
  lvlRangeFrom: number;
  lvlRangeTo: number;
  permissions: Permission[];
}

export interface UserGuildPermissionsGuild {
  id: string;
  ownerId: string;
}

export interface UserGuildPermissionsDto {
  guild: UserGuildPermissionsGuild;
  roles: UserGuildPermissionsRole[];
}

export const CapabilitySchema = Schema.Literals(Object.values(Capability));
export const PermissionSchema = CapabilitySchema;
export const UserGuildPermissionsRoleSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  lvlRangeFrom: Schema.Int,
  lvlRangeTo: Schema.Int,
  permissions: Schema.Array(PermissionSchema),
});
export const UserGuildPermissionsGuildSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  ownerId: Schema.NonEmptyString,
});
export const UserGuildPermissionsDtoSchema = Schema.Struct({
  guild: UserGuildPermissionsGuildSchema,
  roles: Schema.Array(UserGuildPermissionsRoleSchema),
});
