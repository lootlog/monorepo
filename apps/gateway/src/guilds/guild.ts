import { Permission } from "@lootlog/schema/permissions";

interface GuildRole {
  readonly id: string;
  readonly lvlRangeFrom: number;
  readonly lvlRangeTo: number;
  readonly permissions: ReadonlyArray<Permission>;
}

interface Guild {
  readonly id: string;
  readonly ownerId: string;
}

export interface UserGuildData {
  readonly guild: Guild;
  readonly roles: ReadonlyArray<GuildRole>;
}

export interface GetUserGuildsOptions {
  discordId: string;
  userId: string;
}
