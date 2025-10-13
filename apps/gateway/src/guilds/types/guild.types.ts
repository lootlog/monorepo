import { Permission } from 'src/guilds/enum/permission.type';

export interface GuildRole {
  id: string;
  lvlRangeFrom: number;
  lvlRangeTo: number;
}

export interface Guild {
  id: string;
}

export interface UserGuildData {
  guild: Guild;
  permissions: Permission[];
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
