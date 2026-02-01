import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Permission } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import type { CreateOrUpdateLootlogCharacterConfigDto } from 'src/user-lootlog-config/dto/create-user-account-config.dto';
import { GuildsService } from 'src/guilds/guilds.service';
import { RedisService } from 'src/lib/redis/redis.service';

const USER_LOOTLOG_CONFIG_CACHE_TTL_SECONDS = 3600;
const USER_LOOTLOG_CONFIG_CACHE_KEY_PREFIX = 'user-lootlog-config';

@Injectable()
export class UserLootlogConfigService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => GuildsService))
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
    // const cached = await this.redisService.get(cacheKey);

    // if (cached) {
    //   return JSON.parse(cached);
    // }

    const accountConfig =
      await this.prisma.userCharactersLootlogSettings.findMany({
        where: {
          userId: discordId,
          accountId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    const userGuildsWithWriteAccess =
      await this.getUserGuildsWithWriteAccess(discordId);

    const configsToUpdate: Array<{
      characterId: string;
      collectLootWhitelistGuildIds: string[];
      addTimersWhitelistGuildIds: string[];
      trackKillsWhitelistGuildIds: string[];
    }> = [];

    const result = accountConfig.reduce((acc, config) => {
      const { characterId } = config;

      const validLootGuildIds = config.collectLootWhitelistGuildIds.filter(
        (guildId) => userGuildsWithWriteAccess.has(guildId),
      );
      const validTimerGuildIds = config.addTimersWhitelistGuildIds.filter(
        (guildId) => userGuildsWithWriteAccess.has(guildId),
      );
      const validKillGuildIds = config.trackKillsWhitelistGuildIds.filter(
        (guildId) => userGuildsWithWriteAccess.has(guildId),
      );

      const needsUpdate =
        validLootGuildIds.length !==
          config.collectLootWhitelistGuildIds.length ||
        validTimerGuildIds.length !==
          config.addTimersWhitelistGuildIds.length ||
        validKillGuildIds.length !== config.trackKillsWhitelistGuildIds.length;

      if (needsUpdate) {
        configsToUpdate.push({
          characterId,
          collectLootWhitelistGuildIds: validLootGuildIds,
          addTimersWhitelistGuildIds: validTimerGuildIds,
          trackKillsWhitelistGuildIds: validKillGuildIds,
        });
      }

      const cleanedConfig = {
        ...config,
        collectLootWhitelistGuildIds: validLootGuildIds,
        addTimersWhitelistGuildIds: validTimerGuildIds,
        trackKillsWhitelistGuildIds: validKillGuildIds,
      };

      return {
        ...acc,
        [characterId]: cleanedConfig,
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
              collectLootWhitelistGuildIds: update.collectLootWhitelistGuildIds,
              addTimersWhitelistGuildIds: update.addTimersWhitelistGuildIds,
              trackKillsWhitelistGuildIds: update.trackKillsWhitelistGuildIds,
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
    // const cached = await this.redisService.get(cacheKey);

    // if (cached) {
    //   return JSON.parse(cached);
    // }

    const characterConfig =
      await this.prisma.userCharactersLootlogSettings.findFirst({
        where: {
          userId: discordId,
          accountId,
          characterId,
        },
        orderBy: {
          createdAt: 'desc',
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

    const validLootGuildIds = data.lootGuildIds.filter((guildId) =>
      userGuildsWithWriteAccess.has(guildId),
    );
    const validTimerGuildIds = data.timerGuildIds.filter((guildId) =>
      userGuildsWithWriteAccess.has(guildId),
    );
    const validKillGuildIds = (data.killGuildIds ?? []).filter((guildId) =>
      userGuildsWithWriteAccess.has(guildId),
    );

    const config = await this.prisma.userCharactersLootlogSettings.upsert({
      where: {
        userId_accountId_characterId: {
          userId: discordId,
          accountId,
          characterId: data.characterId,
        },
      },
      update: {
        collectLootWhitelistGuildIds: validLootGuildIds,
        addTimersWhitelistGuildIds: validTimerGuildIds,
        trackKillsWhitelistGuildIds: validKillGuildIds,
      },
      create: {
        userId: discordId,
        accountId,
        characterId: data.characterId,
        collectLootWhitelistGuildIds: validLootGuildIds,
        addTimersWhitelistGuildIds: validTimerGuildIds,
        trackKillsWhitelistGuildIds: validKillGuildIds,
      },
    });

    await this.invalidateUserLootlogConfigCache(discordId, accountId);

    return config;
  }
}
