export enum Permission {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  LOOTLOG_MANAGE = "LOOTLOG_MANAGE",
  LOOTLOG_READ = "LOOTLOG_READ",
  LOOTLOG_WRITE = "LOOTLOG_WRITE",
  LOOTLOG_RESERVATIONS = "LOOTLOG_RESERVATIONS",
  LOOTLOG_READ_TIMERS_TITANS = "LOOTLOG_READ_TIMERS_TITANS",
  LOOTLOG_READ_LOOTS_TITANS = "LOOTLOG_READ_LOOTS_TITANS",
  LOOTLOG_READ_TIMERS_HEROES = "LOOTLOG_READ_TIMERS_HEROES",
  LOOTLOG_READ_LOOTS_HEROES = "LOOTLOG_READ_LOOTS_HEROES",
  LOOTLOG_CHAT_READ = "LOOTLOG_CHAT_READ",
  LOOTLOG_CHAT_WRITE = "LOOTLOG_CHAT_WRITE",
  LOOTLOG_NOTIFICATIONS_SEND = "LOOTLOG_NOTIFICATIONS_SEND",
  LOOTLOG_NOTIFICATIONS_READ = "LOOTLOG_NOTIFICATIONS_READ",
}

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
