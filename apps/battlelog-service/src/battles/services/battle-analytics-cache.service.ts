import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import type { QueryBattleAnalyticsDto } from "src/battles/dto/query-battle-analytics.dto";
import type { QueryBattleStatisticsDto } from "src/battles/dto/query-battle-statistics.dto";

@Injectable()
export class BattleAnalyticsCacheService {
  private readonly logger = new Logger(BattleAnalyticsCacheService.name);
  private readonly ANALYTICS_CACHE_PREFIX = "analytics";
  private readonly ANALYTICS_CACHE_TTL_SECONDS = 5 * 60;

  constructor(private readonly redisService: RedisService) {}

  get ttlSeconds() {
    return this.ANALYTICS_CACHE_TTL_SECONDS;
  }

  async getJson<T>(cacheKey: string): Promise<T | null> {
    const cachedResult = await this.redisService.get(cacheKey);
    return cachedResult ? (JSON.parse(cachedResult) as T) : null;
  }

  async setJson<T>(cacheKey: string, result: T): Promise<void> {
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.ANALYTICS_CACHE_TTL_SECONDS,
    );
  }

  getOrSetJson<T>(cacheKey: string, factory: () => Promise<T>): Promise<T> {
    return this.redisService.getOrSetJsonBestEffort({
      key: cacheKey,
      ttlSeconds: this.ANALYTICS_CACHE_TTL_SECONDS,
      factory,
      onError: (error) =>
        this.logger.warn("Battle analytics cache unavailable", error),
    });
  }

  async invalidateUserAnalytics(userId: string): Promise<void> {
    try {
      const patterns = [
        `${this.ANALYTICS_CACHE_PREFIX}:${userId}:*`,
        `statistics:*:${userId}:*`,
        `battle-characters:*:${userId}*`,
        `battle-worlds:${userId}:*`,
      ];

      for (const pattern of patterns) {
        await this.redisService.deleteByPattern(pattern);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate analytics cache for user ${userId}:`,
        error,
      );
    }
  }

  buildAnalyticsCacheKey(
    userId: string,
    query: QueryBattleAnalyticsDto,
  ): string {
    return [
      this.ANALYTICS_CACHE_PREFIX,
      userId,
      this.formatCacheSegment(query.characterId),
      this.formatCacheSegment(query.world),
      this.formatCacheSegment(query.period),
      this.formatCacheSegment(query.startDate),
      this.formatCacheSegment(query.endDate),
      this.formatLevelCacheSegment(query),
      this.formatBooleanCacheSegment(query.ph, "ph"),
      this.formatBooleanCacheSegment(query.matchmaking, "matchmaking"),
    ].join(":");
  }

  buildStatisticsCacheKey(
    metric: string,
    userId: string,
    query: QueryBattleStatisticsDto,
    options: { includeBattleFilters?: boolean } = {},
  ): string {
    const cacheKeySegments = [
      "statistics",
      metric,
      userId,
      this.formatCacheSegment(query.characterId),
      this.formatCacheSegment(query.world),
      this.formatCacheSegment(query.period),
      this.formatCacheSegment(query.startDate),
      this.formatCacheSegment(query.endDate),
      this.formatLevelCacheSegment(query),
    ];

    if (options.includeBattleFilters ?? true) {
      cacheKeySegments.push(
        this.formatBooleanCacheSegment(query.ph, "ph"),
        this.formatBooleanCacheSegment(query.matchmaking, "matchmaking"),
      );
    }

    return cacheKeySegments.join(":");
  }

  buildQueryCacheKey(
    prefix: string,
    metric: string,
    userId: string,
    query: object,
  ): string {
    return [
      prefix,
      metric,
      userId,
      Buffer.from(this.stableSerialize(query)).toString("base64url"),
    ].join(":");
  }

  private stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableSerialize(entry)).join(",")}]`;
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

  private formatCacheSegment(
    value: string | number | undefined,
    fallback = "all",
  ): string {
    return String(value ?? fallback);
  }

  private formatLevelCacheSegment(query: {
    minLevel?: number;
    maxLevel?: number;
  }): string {
    return `${this.formatCacheSegment(query.minLevel, "any")}-${this.formatCacheSegment(query.maxLevel, "any")}`;
  }

  private formatBooleanCacheSegment(
    enabled: boolean | undefined,
    enabledSegment: string,
  ): string {
    if (enabled === undefined) {
      return "all";
    }

    return enabled ? enabledSegment : `not-${enabledSegment}`;
  }
}
