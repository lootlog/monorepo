import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ConfigKey } from 'src/config/config-key.enum';
import type { ApiConfig } from 'src/config/api.config';
import type {
  CachedGuildData,
  GetUserGuildsOptions,
  UserGuildData,
  UserGuildsResponseData,
  UserLootlogSettings,
} from 'src/guilds/types/guild.types';
import {
  CACHE_TTL,
  getUserGuildsCacheKey,
  getUserGuildsCachePattern,
} from 'src/guilds/utils/cache-keys.util';
import { RedisService } from 'src/lib/redis/redis.service';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const REQUEST_TIMEOUT = 10000;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name);
  private pendingRequests = new Map<string, Promise<UserGuildsResponseData>>();
  private readonly apiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    const apiConfig = this.configService.get<ApiConfig>(ConfigKey.API);
    this.apiUrl = apiConfig.url;
  }

  async getUserGuilds(
    options: GetUserGuildsOptions,
  ): Promise<UserGuildsResponseData> {
    const { discordId, userId, accountId, characterId } = options;
    const startTime = Date.now();
    const cacheKey = getUserGuildsCacheKey(
      discordId,
      userId,
      accountId,
      characterId,
    );
    const dedupeKey = [
      discordId,
      userId,
      accountId ?? 'none',
      characterId ?? 'none',
    ].join(':');

    if (this.pendingRequests.has(dedupeKey)) {
      return this.pendingRequests.get(dedupeKey)!;
    }

    const promise = this.fetchUserGuildsWithFallback(
      options,
      cacheKey,
      startTime,
    );
    this.pendingRequests.set(dedupeKey, promise);

    try {
      return await promise;
    } finally {
      this.pendingRequests.delete(dedupeKey);
    }
  }

  private async fetchUserGuildsWithFallback(
    options: GetUserGuildsOptions,
    cacheKey: string,
    startTime: number,
  ): Promise<UserGuildsResponseData> {
    const { discordId } = options;

    try {
      const cached = await this.getCachedGuilds(cacheKey);
      if (cached) {
        return {
          guilds: cached.guilds,
          lootlogSettings: cached.lootlogSettings,
        };
      }

      const guildsResponse = await this.fetchFromHttpWithRetry(options);

      await this.cacheGuilds(cacheKey, guildsResponse);
      return guildsResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to fetch guilds for ${discordId} after ${duration}ms: ${error.message}`,
      );

      const staleCache = await this.getStaleCache(cacheKey);
      if (staleCache) {
        const age = Math.floor((Date.now() - staleCache.cachedAt) / 1000);
        this.logger.warn(`Using stale cache for ${discordId} (${age}s old)`);
        return {
          guilds: staleCache.guilds,
          lootlogSettings: staleCache.lootlogSettings,
        };
      }

      this.logger.error(`No fallback available for ${discordId}`);
      return { guilds: [] };
    }
  }

  private normalizeLootlogSettings(
    value: unknown,
  ): UserLootlogSettings | undefined {
    if (!isRecord(value)) {
      return undefined;
    }

    const accountId =
      typeof value.accountId === 'string' ? value.accountId : undefined;
    const characterId =
      typeof value.characterId === 'string' ? value.characterId : undefined;
    const rawGuildStatusByGuildId = isRecord(value.guildStatusByGuildId)
      ? value.guildStatusByGuildId
      : undefined;

    if (!accountId || !characterId || !rawGuildStatusByGuildId) {
      return undefined;
    }

    const guildStatusByGuildId: UserLootlogSettings['guildStatusByGuildId'] =
      {};

    for (const [guildId, rawGuildStatus] of Object.entries(
      rawGuildStatusByGuildId,
    )) {
      if (!isRecord(rawGuildStatus) || !guildId) {
        continue;
      }

      guildStatusByGuildId[guildId] = {
        timersEnabled: rawGuildStatus.timersEnabled === true,
        lootEnabled: rawGuildStatus.lootEnabled === true,
      };
    }

    return {
      accountId,
      characterId,
      guildStatusByGuildId,
    };
  }

  private normalizeGuildsResponse(payload: unknown): UserGuildsResponseData {
    if (Array.isArray(payload)) {
      return {
        guilds: payload as UserGuildData[],
      };
    }

    if (!isRecord(payload)) {
      return {
        guilds: [],
      };
    }

    const guilds = Array.isArray(payload.guilds)
      ? (payload.guilds as UserGuildData[])
      : [];
    const lootlogSettings = this.normalizeLootlogSettings(
      payload.lootlogSettings,
    );

    return {
      guilds,
      ...(lootlogSettings ? { lootlogSettings } : {}),
    };
  }

  private async fetchFromHttpWithRetry(
    options: GetUserGuildsOptions,
    retryCount = 0,
  ): Promise<UserGuildsResponseData> {
    const { discordId, userId, accountId, characterId } = options;

    try {
      const url = `${this.apiUrl}/internal/guilds/user-permissions`;
      const response = await firstValueFrom(
        this.httpService.get<UserGuildData[] | UserGuildsResponseData>(url, {
          params: {
            discordId,
            userId,
            ...(accountId ? { accountId } : {}),
            ...(characterId ? { characterId } : {}),
          },
          timeout: REQUEST_TIMEOUT,
        }),
      );

      return this.normalizeGuildsResponse(response.data);
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount];
        await this.sleep(delay);
        return this.fetchFromHttpWithRetry(options, retryCount + 1);
      }

      throw error;
    }
  }

  private async refreshInBackground(
    options: GetUserGuildsOptions,
    cacheKey: string,
  ): Promise<void> {
    const guildsResponse = await this.fetchFromHttpWithRetry(options);
    await this.cacheGuilds(cacheKey, guildsResponse);
  }

  private async getCachedGuilds(
    cacheKey: string,
  ): Promise<CachedGuildData | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) return null;

      const data: CachedGuildData = JSON.parse(cached);
      const age = Date.now() - data.cachedAt;

      if (age > CACHE_TTL.USER_GUILDS * 1000) {
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error(`Cache read error: ${error.message}`);
      return null;
    }
  }

  private async getStaleCache(
    cacheKey: string,
  ): Promise<CachedGuildData | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) return null;

      const data: CachedGuildData = JSON.parse(cached);
      const age = Date.now() - data.cachedAt;

      if (age > CACHE_TTL.MAX_STALE_CACHE_AGE * 1000) {
        this.logger.warn(
          `Stale cache too old (${Math.floor(age / 1000)}s), rejecting`,
        );
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error(`Stale cache read error: ${error.message}`);
      return null;
    }
  }

  private async cacheGuilds(
    cacheKey: string,
    guildsResponse: UserGuildsResponseData,
  ): Promise<void> {
    try {
      const data: CachedGuildData = {
        guilds: guildsResponse.guilds,
        lootlogSettings: guildsResponse.lootlogSettings,
        cachedAt: Date.now(),
      };
      await this.redis.set(
        cacheKey,
        JSON.stringify(data),
        CACHE_TTL.USER_GUILDS * 2,
      );
    } catch (error) {
      this.logger.error(`Cache write error: ${error.message}`);
    }
  }

  async invalidateUserGuildsCache(
    discordId: string,
    userId: string,
  ): Promise<void> {
    const cachePattern = getUserGuildsCachePattern(discordId, userId);

    try {
      const keys = await this.redis.scan(cachePattern);
      await Promise.all(keys.map((key) => this.redis.del(key)));
    } catch (error) {
      this.logger.error(`Cache invalidation error: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
