import { Permission } from '@lootlog/types';

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

export interface LootlogGuildStatus {
  timersEnabled: boolean;
  lootEnabled: boolean;
}

export interface UserLootlogSettings {
  accountId: string;
  characterId: string;
  guildStatusByGuildId: Record<string, LootlogGuildStatus>;
}

export interface UserGuildData {
  guild: Guild;
  roles: GuildRole[];
}

export interface UserGuildsResponseData {
  guilds: UserGuildData[];
  lootlogSettings?: UserLootlogSettings;
}

export interface CachedGuildData {
  guilds: UserGuildData[];
  lootlogSettings?: UserLootlogSettings;
  cachedAt: number;
}

export interface GetUserGuildsOptions {
  discordId: string;
  userId: string;
  accountId?: string;
  characterId?: string;
}
