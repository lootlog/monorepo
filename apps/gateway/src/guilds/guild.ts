import { Permission } from "@lootlog/schema/permissions";

export interface GuildRole {
  readonly id: string;
  readonly lvlRangeFrom: number;
  readonly lvlRangeTo: number;
  readonly permissions: ReadonlyArray<Permission>;
}

export interface Guild {
  readonly id: string;
  readonly ownerId: string;
}

export interface UserGuildData {
  readonly guild: Guild;
  readonly roles: ReadonlyArray<GuildRole>;
}

export interface CachedGuildData {
  readonly guilds: ReadonlyArray<UserGuildData>;
  readonly cachedAt: number;
}

export interface GetUserGuildsOptions {
  discordId: string;
  userId: string;
}
