import type {
  CachedGuildData,
  GetUserGuildsOptions,
  UserGuildData,
} from "./types/guild.types.js";
import { CACHE_TTL, getUserGuildsCacheKey } from "./utils/cache-keys.util.js";
import { RedisStore } from "../lib/redis/redis-store.js";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const REQUEST_TIMEOUT = 10000;

export class GuildsService {
  private pendingRequests = new Map<string, Promise<UserGuildData[]>>();

  constructor(
    private readonly apiUrl: string,
    private readonly redis: RedisStore,
    private readonly logger: {
      error(message: string, meta?: Record<string, unknown>): void;
      warn(message: string, meta?: Record<string, unknown>): void;
    },
  ) {}

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  async getUserGuilds(options: GetUserGuildsOptions): Promise<UserGuildData[]> {
    const { discordId, userId } = options;
    const startTime = Date.now();
    const cacheKey = getUserGuildsCacheKey(discordId, userId);
    const dedupeKey = `${discordId}:${userId}`;

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
  ): Promise<UserGuildData[]> {
    const { discordId } = options;

    try {
      const cached = await this.getCachedGuilds(cacheKey);
      if (cached) {
        return cached.guilds;
      }

      const guilds = await this.fetchFromHttpWithRetry(options);

      await this.cacheGuilds(cacheKey, guilds);
      return guilds;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error("Failed to fetch guilds", {
        discordId,
        durationMs: duration,
        error: this.getErrorMessage(error),
      });

      const staleCache = await this.getStaleCache(cacheKey);
      if (staleCache) {
        const age = Math.floor((Date.now() - staleCache.cachedAt) / 1000);
        this.logger.warn("Using stale guild cache fallback", {
          discordId,
          ageSeconds: age,
        });
        return staleCache.guilds;
      }

      this.logger.error("No guild fallback available", { discordId });
      return [];
    }
  }

  private async fetchFromHttpWithRetry(
    options: GetUserGuildsOptions,
    retryCount = 0,
  ): Promise<UserGuildData[]> {
    const { discordId, userId } = options;
    const url = new URL("/internal/guilds/user-permissions", this.apiUrl);
    url.searchParams.set("discordId", discordId);
    url.searchParams.set("userId", userId);

    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, REQUEST_TIMEOUT);

      try {
        const response = await fetch(url, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Guild API responded with status ${response.status}`);
        }

        return (await response.json()) as UserGuildData[];
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount];
        await this.sleep(delay);
        return this.fetchFromHttpWithRetry(options, retryCount + 1);
      }

      throw error;
    }
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
      this.logger.error("Guild cache read error", {
        error: this.getErrorMessage(error),
      });
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

      // Reject stale cache older than MAX_STALE_CACHE_AGE (5 minutes)
      // This prevents removed users from retaining access via ancient cache
      if (age > CACHE_TTL.MAX_STALE_CACHE_AGE * 1000) {
        this.logger.warn("Stale guild cache is too old", {
          ageSeconds: Math.floor(age / 1000),
        });
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error("Stale guild cache read error", {
        error: this.getErrorMessage(error),
      });
      return null;
    }
  }

  private async cacheGuilds(
    cacheKey: string,
    guilds: UserGuildData[],
  ): Promise<void> {
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
      this.logger.error("Guild cache write error", {
        error: this.getErrorMessage(error),
      });
    }
  }

  async invalidateUserGuildsCache(
    discordId: string,
    userId: string,
  ): Promise<void> {
    const cacheKey = getUserGuildsCacheKey(discordId, userId);
    try {
      await this.redis.del(cacheKey);
    } catch (error) {
      this.logger.error("Guild cache invalidation error", {
        discordId,
        userId,
        error: this.getErrorMessage(error),
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
