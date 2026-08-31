import { db as prismaDb } from "#src/prisma/db";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import type { Pool } from "pg";
import { POSTGRES_POOL } from "#src/db/postgres.provider";
import { GuildsService } from "#src/guilds/guilds.service";
import { getUserLootlogConfigCachePattern } from "#src/shared/constants/cache.constant";
import type { CreateOrUpdateLootlogCharacterConfigDto } from "#src/user-lootlog-config/dto/create-user-account-config.dto";
import {
  toUserLootlogConfigResponse,
  type UserLootlogPlayersCatchingGuildsRequest,
  type UserLootlogPlayersCatchingGuildsResponse,
} from "#src/shared/dto/user-lootlog-config-response.dto";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

const USER_LOOTLOG_CONFIG_CACHE_TTL_SECONDS = 60;

type LootlogCharacterConfigRow = {
  userId: string;
  accountId: string;
  characterId: string;
  catchingGuildIds: string[];
};

@Injectable()
export class UserLootlogConfigService {
  private readonly logger = new Logger(UserLootlogConfigService.name);

  constructor(
    @Inject(POSTGRES_POOL) private readonly postgres: Pool,
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
      this.postgres.query<LootlogCharacterConfigRow>(
        `SELECT "userId", "accountId", "characterId", "catchingGuildIds"
         FROM "UserCharactersLootlogSettings"
         WHERE "userId" = $1 AND "accountId" = $2
         ORDER BY "createdAt" DESC`,
        [discordId, accountId],
      ),
      this.getWritableLootlogGuildIds(discordId),
    ]);

    return accountConfig.rows.reduce<
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
  ): Promise<LootlogCharacterConfigRow | null> {
    return this.redis.getOrSetJsonBestEffort({
      key: this.getCharacterConfigCacheKey(discordId, accountId, characterId),
      ttlSeconds: USER_LOOTLOG_CONFIG_CACHE_TTL_SECONDS,
      onError: (error) =>
        this.logger.warn("User lootlog character cache unavailable", error),
      factory: async () => {
        const result = await this.postgres.query<LootlogCharacterConfigRow>(
          `SELECT "userId", "accountId", "characterId", "catchingGuildIds"
           FROM "UserCharactersLootlogSettings"
           WHERE "userId" = $1 AND "accountId" = $2 AND "characterId" = $3
           ORDER BY "createdAt" DESC
           LIMIT 1`,
          [discordId, accountId, characterId],
        );

        return result.rows[0] ?? null;
      },
    });
  }

  private async getPlayersCatchingGuildsUncached(
    discordId: string,
    players: Array<{ userId: string; accountId: string; characterId: string }>,
  ): Promise<UserLootlogPlayersCatchingGuildsResponse> {
    const accessibleGuilds = await this.getAccessibleLootlogGuilds(discordId);
    const accessibleGuildsById = new Map<
      string,
      (typeof accessibleGuilds)[number]
    >(accessibleGuilds.map((guild) => [guild.id, guild] as const));
    const accessibleGuildIds = [...accessibleGuildsById.keys()];

    if (players.length === 0 || accessibleGuildIds.length === 0) {
      return {
        players: players.map((player) => ({
          ...player,
          guilds: [],
        })),
      };
    }

    const playerRecords = players.map((player) => [
      player.userId,
      player.accountId,
      player.characterId,
    ]);
    const configsResult = await this.postgres.query<LootlogCharacterConfigRow>(
      `SELECT settings."userId", settings."accountId", settings."characterId", settings."catchingGuildIds"
       FROM "UserCharactersLootlogSettings" AS settings
       JOIN jsonb_to_recordset($1::jsonb)
         AS requested("userId" text, "accountId" text, "characterId" text)
         ON requested."userId" = settings."userId"
        AND requested."accountId" = settings."accountId"
        AND requested."characterId" = settings."characterId"
       WHERE settings."catchingGuildIds" && $2::text[]
       ORDER BY settings."createdAt" DESC`,
      [
        JSON.stringify(
          playerRecords.map(([userId, accountId, characterId]) => ({
            userId,
            accountId,
            characterId,
          })),
        ),
        accessibleGuildIds,
      ],
    );
    const configs = configsResult.rows;

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

    const result = await this.postgres.query<LootlogCharacterConfigRow>(
      `INSERT INTO "UserCharactersLootlogSettings"
         ("userId", "accountId", "characterId", "catchingGuildIds", "updatedAt")
       VALUES ($1, $2, $3, $4::text[], NOW())
       ON CONFLICT ("userId", "accountId", "characterId") DO UPDATE
       SET "catchingGuildIds" = EXCLUDED."catchingGuildIds", "updatedAt" = NOW()
       RETURNING "userId", "accountId", "characterId", "catchingGuildIds"`,
      [discordId, accountId, data.characterId, normalizedCatchingGuildIds],
    );
    const config = result.rows[0];
    if (!config) {
      throw new Error("Failed to persist user Lootlog configuration");
    }

    await this.invalidateUserLootlogConfig(discordId);

    return toUserLootlogConfigResponse(config);
  }
}
