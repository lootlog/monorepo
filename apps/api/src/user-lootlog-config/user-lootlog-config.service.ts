import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { Permission } from "src/generated/prisma/client";
import type { CreateOrUpdateLootlogCharacterConfigDto } from "src/user-lootlog-config/dto/create-user-account-config.dto";
import {
  toUserLootlogConfigResponse,
  type UserLootlogPlayersCatchingGuildsRequest,
  type UserLootlogPlayersCatchingGuildsResponse,
  type UserLootlogPlayerCatchingGuildsResponse,
} from "src/shared/dto/user-lootlog-config-response.dto";

@Injectable()
export class UserLootlogConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
  ) {}

  private async getWritableLootlogGuildIds(discordId: string) {
    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [Permission.LOOTLOG_LOOTS_WRITE],
    );

    return new Set(guilds.map((guild) => guild.id));
  }

  private async getAccessibleLootlogGuilds(discordId: string) {
    return this.guildsService.getGuildsForRequiredPermissions(discordId, [
      Permission.LOOTLOG_ACCESS,
    ]);
  }

  async getLootlogAccountConfig(discordId: string, accountId: string) {
    const [accountConfig, writableGuildIds] = await Promise.all([
      this.prisma.userCharactersLootlogSettings.findMany({
        where: {
          userId: discordId,
          accountId,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.getWritableLootlogGuildIds(discordId),
    ]);

    return accountConfig.reduce<
      Record<string, ReturnType<typeof toUserLootlogConfigResponse>>
    >((result, config) => {
      result[config.characterId] = toUserLootlogConfigResponse({
        userId: config.userId,
        accountId: config.accountId,
        characterId: config.characterId,
        catchingGuildIds: config.catchingGuildIds.filter((guildId) =>
          writableGuildIds.has(guildId),
        ),
      });

      return result;
    }, {});
  }

  getLootlogCharacterConfig(
    discordId: string,
    accountId: string,
    characterId: string,
  ) {
    return this.prisma.userCharactersLootlogSettings.findFirst({
      where: {
        userId: discordId,
        accountId,
        characterId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getPlayerCatchingGuilds(
    discordId: string,
    userId: string,
    accountId: string,
    characterId: string,
  ): Promise<UserLootlogPlayerCatchingGuildsResponse> {
    const response = await this.getPlayersCatchingGuilds(discordId, {
      players: [{ userId, accountId, characterId }],
    });

    return (
      response.players[0] ?? {
        userId,
        accountId,
        characterId,
        guilds: [],
      }
    );
  }

  async getPlayersCatchingGuilds(
    discordId: string,
    data: UserLootlogPlayersCatchingGuildsRequest,
  ): Promise<UserLootlogPlayersCatchingGuildsResponse> {
    const playersByKey = new Map<
      string,
      { userId: string; accountId: string; characterId: string }
    >();

    for (const player of data.players) {
      const key = `${player.userId}:${player.accountId}:${player.characterId}`;
      if (!playersByKey.has(key)) {
        playersByKey.set(key, player);
      }
    }

    const players = [...playersByKey.values()];
    const accessibleGuilds = await this.getAccessibleLootlogGuilds(discordId);
    const accessibleGuildsById = new Map(
      accessibleGuilds.map((guild) => [guild.id, guild] as const),
    );
    const accessibleGuildIds = [...accessibleGuildsById.keys()];

    if (players.length === 0 || accessibleGuildIds.length === 0) {
      return {
        players: players.map((player) => ({
          ...player,
          guilds: [],
        })),
      };
    }

    const configs = await this.prisma.userCharactersLootlogSettings.findMany({
      where: {
        OR: players.map((player) => ({
          userId: player.userId,
          accountId: player.accountId,
          characterId: player.characterId,
        })),
        catchingGuildIds: {
          hasSome: accessibleGuildIds,
        },
      },
      select: {
        userId: true,
        accountId: true,
        characterId: true,
        catchingGuildIds: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const visibleGuildIdsByPlayerKey = new Map<string, Set<string>>();
    for (const config of configs) {
      const key = `${config.userId}:${config.accountId}:${config.characterId}`;
      const visibleGuildIds =
        visibleGuildIdsByPlayerKey.get(key) ?? new Set<string>();

      for (const guildId of config.catchingGuildIds) {
        if (accessibleGuildsById.has(guildId)) {
          visibleGuildIds.add(guildId);
        }
      }

      visibleGuildIdsByPlayerKey.set(key, visibleGuildIds);
    }

    return {
      players: players.map((player) => {
        const key = `${player.userId}:${player.accountId}:${player.characterId}`;
        const visibleGuildIds = visibleGuildIdsByPlayerKey.get(key) ?? [];

        return {
          ...player,
          guilds: [...visibleGuildIds].map((guildId) => {
            const guild = accessibleGuildsById.get(guildId);

            return {
              id: guildId,
              name: guild?.name ?? guildId,
            };
          }),
        };
      }),
    };
  }

  async createOrUpdateLootlogCharacterConfig(
    discordId: string,
    accountId: string,
    data: CreateOrUpdateLootlogCharacterConfigDto,
  ) {
    const writableGuildIds = await this.getWritableLootlogGuildIds(discordId);
    const normalizedCatchingGuildIds = [
      ...new Set(data.catchingGuildIds),
    ].filter((guildId) => writableGuildIds.has(guildId));

    const config = await this.prisma.userCharactersLootlogSettings.upsert({
      where: {
        userId_accountId_characterId: {
          userId: discordId,
          accountId,
          characterId: data.characterId,
        },
      },
      update: {
        catchingGuildIds: normalizedCatchingGuildIds,
      },
      create: {
        userId: discordId,
        accountId,
        characterId: data.characterId,
        catchingGuildIds: normalizedCatchingGuildIds,
      },
    });

    return toUserLootlogConfigResponse(config);
  }
}
