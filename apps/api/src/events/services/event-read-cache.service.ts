import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";

const EVENT_READ_CACHE_PREFIX = "event-read";
const EVENT_READ_CACHE_TTL_SECONDS = 10;

@Injectable()
export class EventReadCacheService {
  private readonly logger = new Logger(EventReadCacheService.name);

  constructor(private readonly redis: RedisService) {}

  getGuildKey(
    guildId: string,
    scope: string,
    params: Record<string, unknown> = {},
  ) {
    return this.buildKey(guildId, "guild", scope, params);
  }

  getEventKey(
    guildId: string,
    eventId: string,
    scope: string,
    params: Record<string, unknown> = {},
  ) {
    return this.buildKey(guildId, eventId, scope, params);
  }

  getOrSet<T>(key: string, factory: () => Promise<T>): Promise<T> {
    return this.redis.getOrSetJsonBestEffort({
      key,
      ttlSeconds: EVENT_READ_CACHE_TTL_SECONDS,
      factory,
      onError: (error) =>
        this.logger.warn("Event read cache unavailable", error),
    });
  }

  async invalidateGuild(guildId: string) {
    await this.deleteByPattern(`${EVENT_READ_CACHE_PREFIX}:${guildId}:*`);
  }

  async invalidateEvent(guildId: string, eventId: string) {
    await Promise.all([
      this.deleteByPattern(`${EVENT_READ_CACHE_PREFIX}:${guildId}:guild:*`),
      this.deleteByPattern(
        `${EVENT_READ_CACHE_PREFIX}:${guildId}:${eventId}:*`,
      ),
    ]);
  }

  private async deleteByPattern(pattern: string) {
    try {
      await this.redis.deleteByPattern(pattern);
    } catch (error) {
      this.logger.warn("Failed to invalidate event read cache", error);
    }
  }

  private buildKey(
    guildId: string,
    eventSegment: string,
    scope: string,
    params: Record<string, unknown>,
  ) {
    return [
      EVENT_READ_CACHE_PREFIX,
      guildId,
      eventSegment,
      scope,
      Buffer.from(this.stableSerialize(params)).toString("base64url"),
    ].join(":");
  }

  private stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableSerialize(entry)).join(",")}]`;
    }

    if (value instanceof Date) {
      return JSON.stringify(value.toISOString());
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

      return `{${entries
        .map(
          ([key, entry]) =>
            `${JSON.stringify(key)}:${this.stableSerialize(entry)}`,
        )
        .join(",")}}`;
    }

    return JSON.stringify(value);
  }
}
