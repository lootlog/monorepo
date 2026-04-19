import { Injectable } from "@nestjs/common";
import { Permission } from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import {
  resolveCatchingGuildIds,
  type CreateOrUpdateLootlogCharacterConfigDto,
} from "src/user-lootlog-config/dto/create-user-account-config.dto";
import { GuildsService } from "src/guilds/guilds.service";
import { RedisService } from "@lootlog/nest-shared";
import { toUserLootlogConfigResponse } from "src/shared/dto/user-lootlog-config-response.dto";

const USER_LOOTLOG_CONFIG_CACHE_TTL_SECONDS = 3600;
const USER_LOOTLOG_CONFIG_CACHE_KEY_PREFIX = "user-lootlog-config";

@Injectable()
export class UserLootlogConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly redisService: RedisService,
  ) {}

  private getUserLootlogConfigCacheKey(
    discordId: string,
    accountId: string,
  ): string {
    return `${USER_LOOTLOG_CONFIG_CACHE_KEY_PREFIX}:${discordId}:${accountId}`;
  }

  private getLootlogCharacterConfigCacheKey(
    discordId: string,
    accountId: string,
    characterId: string,
  ): string {
    return `${USER_LOOTLOG_CONFIG_CACHE_KEY_PREFIX}:${discordId}:${accountId}:${characterId}`;
  }

  async invalidateUserLootlogConfigCache(
    discordId: string,
    accountId?: string,
  ): Promise<void> {
    if (accountId) {
      const pattern = `${USER_LOOTLOG_CONFIG_CACHE_KEY_PREFIX}:${discordId}:${accountId}:*`;
      await this.redisService.deleteByPattern(pattern);
    } else {
      const pattern = `${USER_LOOTLOG_CONFIG_CACHE_KEY_PREFIX}:${discordId}:*`;
      await this.redisService.deleteByPattern(pattern);
    }
  }

  private async getUserGuildsWithWriteAccess(
    discordId: string,
  ): Promise<Set<string>> {
    const guilds =
      await this.guildsService.getUserGuildsWithPermissions(discordId);

    const guildIdsWithWriteAccess = guilds
      .filter((guildData) => {
        const isOwner = guildData.guild.ownerId === discordId;
        const hasLootlogWrite = guildData.roles.some(
          (role) =>
            role.permissions.includes(Permission.LOOTLOG_LOOTS_WRITE) ||
            role.permissions.includes(Permission.LOOTLOG_TIMERS_WRITE),
        );
        return isOwner || hasLootlogWrite;
      })
      .map((guildData) => guildData.guild.id);

    return new Set(guildIdsWithWriteAccess);
  }

  async getLootlogAccountConfig(discordId: string, accountId: string) {
    const cacheKey = this.getUserLootlogConfigCacheKey(discordId, accountId);

    const accountConfig =
      await this.prisma.userCharactersLootlogSettings.findMany({
        where: {
          userId: discordId,
          accountId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const userGuildsWithWriteAccess =
      await this.getUserGuildsWithWriteAccess(discordId);

    const configsToUpdate: Array<{
      characterId: string;
      catchingGuildIds: string[];
    }> = [];

    const result = accountConfig.reduce((acc, config) => {
      const { characterId } = config;

      const validCatchingGuildIds = config.catchingGuildIds.filter((guildId) =>
        userGuildsWithWriteAccess.has(guildId),
      );

      const needsUpdate =
        validCatchingGuildIds.length !== config.catchingGuildIds.length;

      if (needsUpdate) {
        configsToUpdate.push({
          characterId,
          catchingGuildIds: validCatchingGuildIds,
        });
      }

      const cleanedConfig = {
        catchingGuildIds: validCatchingGuildIds,
        userId: config.userId,
        accountId: config.accountId,
        characterId,
      };

      return {
        ...acc,
        [characterId]: toUserLootlogConfigResponse(cleanedConfig),
      };
    }, {});

    if (configsToUpdate.length > 0) {
      await Promise.all(
        configsToUpdate.map((update) =>
          this.prisma.userCharactersLootlogSettings.update({
            where: {
              userId_accountId_characterId: {
                userId: discordId,
                accountId,
                characterId: update.characterId,
              },
            },
            data: {
              catchingGuildIds: update.catchingGuildIds,
            },
          }),
        ),
      );
    }

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      USER_LOOTLOG_CONFIG_CACHE_TTL_SECONDS,
    );

    return result;
  }

  async getLootlogCharacterConfig(
    discordId: string,
    accountId: string,
    characterId: string,
  ) {
    const cacheKey = this.getLootlogCharacterConfigCacheKey(
      discordId,
      accountId,
      characterId,
    );

    const characterConfig =
      await this.prisma.userCharactersLootlogSettings.findFirst({
        where: {
          userId: discordId,
          accountId,
          characterId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (characterConfig) {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(characterConfig),
        USER_LOOTLOG_CONFIG_CACHE_TTL_SECONDS,
      );
    }

    return characterConfig;
  }

  async createOrUpdateLootlogCharacterConfig(
    discordId: string,
    accountId: string,
    data: CreateOrUpdateLootlogCharacterConfigDto,
  ) {
    const userGuildsWithWriteAccess =
      await this.getUserGuildsWithWriteAccess(discordId);
    const catchingGuildIds = resolveCatchingGuildIds(data);

    const validCatchingGuildIds = [
      ...new Set(
        catchingGuildIds.filter((guildId) =>
          userGuildsWithWriteAccess.has(guildId),
        ),
      ),
    ];

    const config = await this.prisma.userCharactersLootlogSettings.upsert({
      where: {
        userId_accountId_characterId: {
          userId: discordId,
          accountId,
          characterId: data.characterId,
        },
      },
      update: {
        catchingGuildIds: validCatchingGuildIds,
      },
      create: {
        userId: discordId,
        accountId,
        characterId: data.characterId,
        catchingGuildIds: validCatchingGuildIds,
      },
    });

    await this.invalidateUserLootlogConfigCache(discordId, accountId);

    return toUserLootlogConfigResponse(config);
  }
}
