import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import { temporalToDate, type DatabaseTemporal } from "#src/db/temporal";

const EVENT_READ_CACHE_PREFIX = "event-read";
const EVENT_READ_CACHE_TTL_SECONDS = 10;
const EVENT_READ_CACHE_DATE_FIELDS = new Set([
  "assignedAt",
  "confirmedAt",
  "confirmationDeadlineAt",
  "createdAt",
  "editedAt",
  "endedAt",
  "endsAt",
  "generatedAt",
  "killedAt",
  "lastKilledAt",
  "maxSpawnTime",
  "maxSpawnTimeAtKill",
  "minSpawnTime",
  "minSpawnTimeAtKill",
  "startedAt",
  "startsAt",
  "unassignedAt",
  "updatedAt",
  "windowClosedAt",
  "windowOpenedAt",
]);
const ISO_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

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

  async getOrSet<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const value = await this.redis.getOrSetJsonBestEffort({
      key,
      ttlSeconds: EVENT_READ_CACHE_TTL_SECONDS,
      factory: async () => reviveEventReadCacheDates(await factory()),
      onError: (error) =>
        this.logger.warn("Event read cache unavailable", error),
    });

    return reviveEventReadCacheDates(value) as T;
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

function reviveEventReadCacheDates(value: unknown, key?: string): unknown {
  if (value instanceof Date) {
    return value;
  }

  if (
    key &&
    EVENT_READ_CACHE_DATE_FIELDS.has(key) &&
    value &&
    typeof value === "object" &&
    ("epochMilliseconds" in value || "toZonedDateTime" in value)
  ) {
    return temporalToDate(value as DatabaseTemporal);
  }

  if (
    key &&
    EVENT_READ_CACHE_DATE_FIELDS.has(key) &&
    typeof value === "string" &&
    isIsoDatetime(value)
  ) {
    return new Date(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => reviveEventReadCacheDates(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      reviveEventReadCacheDates(entryValue, entryKey),
    ]),
  );
}

function isIsoDatetime(value: string) {
  if (!ISO_DATETIME_PATTERN.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}
