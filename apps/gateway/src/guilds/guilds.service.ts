import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/lib/redis/redis.service';
import {
  UserGuildData,
  GetUserGuildsOptions,
  CachedGuildData,
} from 'src/guilds/types/guild.types';
import {
  getUserGuildsCacheKey,
  CACHE_TTL,
} from 'src/guilds/utils/cache-keys.util';
import { ConfigKey } from 'src/config/config-key.enum';
import { ApiConfig } from 'src/config/api.config';
import { firstValueFrom } from 'rxjs';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const REQUEST_TIMEOUT = 10000;

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name);
  private pendingRequests = new Map<string, Promise<UserGuildData[]>>();
  private readonly apiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    const apiConfig = this.configService.get<ApiConfig>(ConfigKey.API);
    this.apiUrl = apiConfig.url;
  }

  async getUserGuilds(options: GetUserGuildsOptions): Promise<UserGuildData[]> {
    const { discordId, userId } = options;
    const startTime = Date.now();
    const cacheKey = getUserGuildsCacheKey(discordId, userId);
    const dedupeKey = `${discordId}:${userId}`;

    if (this.pendingRequests.has(dedupeKey)) {
      this.logger.debug(`Request deduplication for ${discordId}`);
      return this.pendingRequests.get(dedupeKey)!;
    }

    const promise = this.fetchUserGuildsWithFallback(options, cacheKey, startTime);
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
  ): Promise<UserGuildData[]> {
    const { discordId } = options;

    try {
      const cached = await this.getCachedGuilds(cacheKey);
      if (cached) {
        this.refreshInBackground(options, cacheKey).catch((err) => {
          this.logger.warn(`Background refresh failed: ${err.message}`);
        });

        return cached.guilds;
      }

      const guilds = await this.fetchFromHttpWithRetry(options);
      const duration = Date.now() - startTime;
      this.logger.debug(`Fetched guilds for ${discordId} in ${duration}ms`);

      await this.cacheGuilds(cacheKey, guilds);
      return guilds;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to fetch guilds for ${discordId} after ${duration}ms: ${error.message}`,
      );

      const staleCache = await this.getStaleCache(cacheKey);
      if (staleCache) {
        const age = Math.floor((Date.now() - staleCache.cachedAt) / 1000);
        this.logger.warn(
          `Using stale cache for ${discordId} (${age}s old)`,
        );
        return staleCache.guilds;
      }

      this.logger.error(`No fallback available for ${discordId}`);
      return [];
    }
  }

  private async fetchFromHttpWithRetry(
    options: GetUserGuildsOptions,
    retryCount = 0,
  ): Promise<UserGuildData[]> {
    const { discordId, userId } = options;

    try {
      const url = `${this.apiUrl}/internal/guilds/user-permissions`;
      const response = await firstValueFrom(
        this.httpService.get<UserGuildData[]>(url, {
          params: { discordId, userId },
          timeout: REQUEST_TIMEOUT,
        }),
      );

      return response.data as UserGuildData[];
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount];
        this.logger.debug(
          `Retry ${retryCount + 1}/${MAX_RETRIES} for ${discordId} in ${delay}ms`,
        );
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
    try {
      const guilds = await this.fetchFromHttpWithRetry(options);
      await this.cacheGuilds(cacheKey, guilds);
    } catch (error) {
      throw error;
    }
  }

  private async getCachedGuilds(cacheKey: string): Promise<CachedGuildData | null> {
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

  private async getStaleCache(cacheKey: string): Promise<CachedGuildData | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) return null;

      return JSON.parse(cached);
    } catch (error) {
      this.logger.error(`Stale cache read error: ${error.message}`);
      return null;
    }
  }

  private async cacheGuilds(cacheKey: string, guilds: UserGuildData[]): Promise<void> {
    try {
      const data: CachedGuildData = {
        guilds,
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

  async invalidateUserGuildsCache(discordId: string, userId: string): Promise<void> {
    const cacheKey = getUserGuildsCacheKey(discordId, userId);
    try {
      await this.redis.del(cacheKey);
      this.logger.debug(`Cache invalidated for ${discordId}`);
    } catch (error) {
      this.logger.error(`Cache invalidation error: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
