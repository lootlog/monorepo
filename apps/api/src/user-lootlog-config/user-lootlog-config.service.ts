import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { Permission } from "src/generated/prisma/client";
import { getUserLootlogConfigCachePattern } from "src/shared/constants/cache.constant";
import type { CreateOrUpdateLootlogCharacterConfigDto } from "src/user-lootlog-config/dto/create-user-account-config.dto";
import {
  toUserLootlogConfigResponse,
  type UserLootlogPlayersCatchingGuildsRequest,
  type UserLootlogPlayersCatchingGuildsResponse,
} from "src/shared/dto/user-lootlog-config-response.dto";

const USER_LOOTLOG_CONFIG_CACHE_TTL_SECONDS = 60;

@Injectable()
export class UserLootlogConfigService {
  private readonly logger = new Logger(UserLootlogConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly redis: RedisService,
  ) {}

  private getAccountConfigCacheKey(discordId: string, accountId: string) {
    return `user-lootlog-config:${discordId}:account:${accountId}`;
  }

  private getCharacterConfigCacheKey(
    discordId: string,
    accountId: string,
    characterId: string,
  ) {
    return `user-lootlog-config:${discordId}:character:${accountId}:${characterId}`;
  }

  private async invalidateUserLootlogConfig(discordId: string) {
    try {
      await this.redis.deleteByPattern(
        getUserLootlogConfigCachePattern(discordId),
      );
    } catch (error) {
      this.logger.warn("Failed to invalidate user lootlog config cache", error);
    }
  }

  private async getWritableLootlogGuildIds(discordId: string) {
    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [Permission.LOOTLOG_LOOTS_WRITE],
    );

    return new Set(guilds.map((guild) => guild.id));
  }

  private getAccessibleLootlogGuilds(discordId: string) {
    return this.guildsService.getGuildsForRequiredPermissions(discordId, [
      Permission.LOOTLOG_ACCESS,
    ]);
  }

  getLootlogAccountConfig(discordId: string, accountId: string) {
    return this.redis.getOrSetJsonBestEffort({
      key: this.getAccountConfigCacheKey(discordId, accountId),
      ttlSeconds: USER_LOOTLOG_CONFIG_CACHE_TTL_SECONDS,
      onError: (error) =>
        this.logger.warn("User lootlog account cache unavailable", error),
      factory: () => this.getLootlogAccountConfigUncached(discordId, accountId),
    });
  }

  private async getLootlogAccountConfigUncached(
    discordId: string,
    accountId: string,
  ) {
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
    return this.redis.getOrSetJsonBestEffort({
      key: this.getCharacterConfigCacheKey(discordId, accountId, characterId),
      ttlSeconds: USER_LOOTLOG_CONFIG_CACHE_TTL_SECONDS,
      onError: (error) =>
        this.logger.warn("User lootlog character cache unavailable", error),
      factory: () =>
        this.prisma.userCharactersLootlogSettings.findFirst({
          where: {
            userId: discordId,
            accountId,
            characterId,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
    });
  }

  private async getPlayersCatchingGuildsUncached(
    discordId: string,
    players: Array<{ userId: string; accountId: string; characterId: string }>,
  ): Promise<UserLootlogPlayersCatchingGuildsResponse> {
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

  getPlayersCatchingGuilds(
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

    return this.getPlayersCatchingGuildsUncached(discordId, players);
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

    await this.invalidateUserLootlogConfig(discordId);

    return toUserLootlogConfigResponse(config);
  }
}
