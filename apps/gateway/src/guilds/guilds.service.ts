import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/lib/redis/redis.service';
import { CircuitBreakerService, CircuitBreakerError } from 'src/lib/circuit-breaker/circuit-breaker.service';
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

const CIRCUIT_BREAKER_KEY = 'guilds-http';
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
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly configService: ConfigService,
  ) {
    const apiConfig = this.configService.get<ApiConfig>(ConfigKey.API);
    this.apiUrl = apiConfig.url;
  }

  async getUserGuilds(options: GetUserGuildsOptions): Promise<UserGuildData[]> {
    const { discordId, userId } = options;
    const startTime = Date.now();

    this.logger.log(`Fetching guilds for user ${discordId}`);

    const cacheKey = getUserGuildsCacheKey(discordId, userId);
    const dedupeKey = `${discordId}:${userId}`;

    if (this.pendingRequests.has(dedupeKey)) {
      this.logger.debug(`Request deduplication: returning pending request for ${discordId}`);
      return this.pendingRequests.get(dedupeKey)!;
    }

    const promise = this.fetchUserGuildsWithFallback(options, startTime);
    this.pendingRequests.set(dedupeKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(dedupeKey);
    }
  }

  private async fetchUserGuildsWithFallback(
    options: GetUserGuildsOptions,
    startTime: number,
  ): Promise<UserGuildData[]> {
    const { discordId, userId } = options;
    const cacheKey = getUserGuildsCacheKey(discordId, userId);

    try {
      const cached = await this.getCachedGuilds(cacheKey);
      if (cached) {
        this.logger.log(
          `Cache hit for user ${discordId} (age: ${Date.now() - cached.cachedAt}ms)`,
        );

        this.refreshInBackground(options, cacheKey).catch((err) => {
          this.logger.warn(`Background refresh failed for ${discordId}: ${err.message}`);
        });

        return cached.guilds;
      }

      const guilds = await this.fetchFromHttpWithRetry(options);
      const duration = Date.now() - startTime;
      this.logger.log(`HTTP fetch completed for ${discordId} in ${duration}ms`);

      await this.cacheGuilds(cacheKey, guilds);
      return guilds;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof CircuitBreakerError) {
        this.logger.error(
          `Circuit breaker open for ${discordId}, attempting stale cache fallback`,
        );
      } else {
        this.logger.error(
          `Failed to fetch guilds for ${discordId} after ${duration}ms: ${error.message}`,
        );
      }

      const staleCache = await this.getStaleCache(cacheKey);
      if (staleCache) {
        this.logger.warn(
          `Returning stale cache for ${discordId} (age: ${Date.now() - staleCache.cachedAt}ms)`,
        );
        return staleCache.guilds;
      }

      this.logger.error(`No fallback available for ${discordId}, returning empty array`);
      return [];
    }
  }

  private async fetchFromHttpWithRetry(
    options: GetUserGuildsOptions,
    retryCount = 0,
  ): Promise<UserGuildData[]> {
    const { discordId, userId } = options;

    try {
      return await this.circuitBreaker.execute(
        CIRCUIT_BREAKER_KEY,
        async () => {
          this.logger.debug(
            `Making HTTP call for ${discordId} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`,
          );

          const url = `${this.apiUrl}/internal/guilds/user-permissions`;
          const response = await firstValueFrom(
            this.httpService.get<UserGuildData[]>(url, {
              params: { discordId, userId },
              timeout: REQUEST_TIMEOUT,
            }),
          );

          return response.data as UserGuildData[];
        },
        {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: REQUEST_TIMEOUT,
          resetTimeout: 30000,
        },
      );
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        throw error;
      }

      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount];
        this.logger.warn(
          `HTTP call failed for ${discordId}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`,
        );
        await this.sleep(delay);
        return this.fetchFromHttpWithRetry(options, retryCount + 1);
      }

      this.logger.error(`HTTP call failed for ${discordId} after ${MAX_RETRIES + 1} attempts`);
      throw error;
    }
  }

  private async refreshInBackground(
    options: GetUserGuildsOptions,
    cacheKey: string,
  ): Promise<void> {
    const { discordId } = options;
    this.logger.debug(`Starting background refresh for ${discordId}`);

    try {
      const guilds = await this.fetchFromHttpWithRetry(options);
      await this.cacheGuilds(cacheKey, guilds);
      this.logger.debug(`Background refresh completed for ${discordId}`);
    } catch (error) {
      this.logger.warn(`Background refresh failed for ${discordId}: ${error.message}`);
    }
  }

  private async getCachedGuilds(cacheKey: string): Promise<CachedGuildData | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) return null;

      const data: CachedGuildData = JSON.parse(cached);
      const age = Date.now() - data.cachedAt;

      if (age > CACHE_TTL.USER_GUILDS * 1000) {
        this.logger.debug(`Cache expired for key ${cacheKey} (age: ${age}ms)`);
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error(`Failed to read cache for ${cacheKey}: ${error.message}`);
      return null;
    }
  }

  private async getStaleCache(cacheKey: string): Promise<CachedGuildData | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) return null;

      return JSON.parse(cached);
    } catch (error) {
      this.logger.error(`Failed to read stale cache for ${cacheKey}: ${error.message}`);
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
      this.logger.debug(`Cached guilds with key ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Failed to cache guilds for ${cacheKey}: ${error.message}`);
    }
  }

  async invalidateUserGuildsCache(discordId: string, userId: string): Promise<void> {
    const cacheKey = getUserGuildsCacheKey(discordId, userId);
    try {
      await this.redis.del(cacheKey);
      this.logger.log(`Invalidated cache for user ${discordId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for ${discordId}: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
