import type { Permission } from 'src/guilds/enum/permission.type';

export interface GuildRole {
  id: string;
  lvlRangeFrom: number;
  lvlRangeTo: number;
  permissions: Permission[];
}

export interface Guild {
  id: string;
  ownerId: string;
}

export interface UserGuildData {
  guild: Guild;
  roles: GuildRole[];
}

export interface CachedGuildData {
  guilds: UserGuildData[];
  cachedAt: number;
}

export interface GetUserGuildsOptions {
  discordId: string;
  userId: string;
}
