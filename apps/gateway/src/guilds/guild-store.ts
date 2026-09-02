import type { GatewayConfiguration } from "#src/config/gateway-config";
import type {
  CachedGuildData,
  GetUserGuildsOptions,
  UserGuildData,
} from "#src/guilds/types/guild.types";
import {
  CACHE_TTL,
  getUserGuildsCacheKey,
} from "#src/guilds/utils/cache-keys.util";
import type { RedisGatewayStore } from "#src/platform/redis-store";

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
const REQUEST_TIMEOUT_MS = 10_000;

export class GuildStore {
  private readonly pending = new Map<string, Promise<UserGuildData[]>>();

  constructor(
    private readonly config: GatewayConfiguration,
    private readonly redis: RedisGatewayStore,
  ) {}

  getUserGuilds(options: GetUserGuildsOptions): Promise<UserGuildData[]> {
    const key = `${options.discordId}:${options.userId}`;
    const existing = this.pending.get(key);
    if (existing) return existing;

    const request = this.loadUserGuilds(options).finally(() => {
      this.pending.delete(key);
    });
    this.pending.set(key, request);
    return request;
  }

  async invalidate(options: GetUserGuildsOptions): Promise<void> {
    await this.redis.command.del(
      getUserGuildsCacheKey(options.discordId, options.userId),
    );
  }

  private async loadUserGuilds(
    options: GetUserGuildsOptions,
  ): Promise<UserGuildData[]> {
    const cacheKey = getUserGuildsCacheKey(options.discordId, options.userId);
    const cached = await this.readCache(cacheKey);
    if (
      cached &&
      Date.now() - cached.cachedAt <= CACHE_TTL.USER_GUILDS * 1_000
    ) {
      return cached.guilds;
    }

    try {
      const guilds = await this.fetchWithRetry(options);
      const value = JSON.stringify({ guilds, cachedAt: Date.now() });
      await this.redis.command.set(
        cacheKey,
        value,
        "EX",
        CACHE_TTL.USER_GUILDS * 2,
      );
      return guilds;
    } catch {
      if (
        cached &&
        Date.now() - cached.cachedAt <= CACHE_TTL.MAX_STALE_CACHE_AGE * 1_000
      ) {
        return cached.guilds;
      }
      return [];
    }
  }

  private async readCache(key: string): Promise<CachedGuildData | null> {
    try {
      const value = await this.redis.command.get(key);
      if (!value) return null;
      const parsed = JSON.parse(value) as CachedGuildData;
      return Array.isArray(parsed.guilds) && Number.isFinite(parsed.cachedAt)
        ? parsed
        : null;
    } catch {
      return null;
    }
  }

  private async fetchWithRetry(
    options: GetUserGuildsOptions,
  ): Promise<UserGuildData[]> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const url = new URL(
          `${this.config.apiUrl}/internal/guilds/user-permissions`,
        );
        url.searchParams.set("discordId", options.discordId);
        url.searchParams.set("userId", options.userId);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as UserGuildData[];
      } catch (error) {
        lastError = error;
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay !== undefined) {
          await Bun.sleep(delay);
        }
      }
    }
    throw lastError;
  }
}
