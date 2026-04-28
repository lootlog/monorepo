import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { RedisService } from "@lootlog/nest-shared/redis";

export type DiscordInvalidRequestEndpoint = "guilds" | "guild-member";
export type DiscordInvalidRequestStatus = 401 | 403 | 429;
export type DiscordMemberRefreshMetricOutcome =
  | "queued"
  | "delayed"
  | "rate_limited"
  | "processed"
  | "failed"
  | "stale_used"
  | "verification_unavailable";

@Injectable()
export class DiscordSyncDiagnosticsService {
  private readonly windowMs = 10 * 60 * 1000;
  private readonly windowTtlSeconds = 20 * 60;
  private readonly RECORD_LATENCY_SCRIPT = `
redis.call("HINCRBY", KEYS[1], "count", 1)
redis.call("HINCRBY", KEYS[1], "sumMs", ARGV[1])
redis.call("EXPIRE", KEYS[1], ARGV[2])
return 1
`;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redisService: RedisService,
  ) {}

  async recordInvalidDiscordRequest(options: {
    endpoint: DiscordInvalidRequestEndpoint;
    status: DiscordInvalidRequestStatus;
    source?: string;
  }): Promise<void> {
    await this.runSafely("discord.invalid_request", async () => {
      const windowStartedAt = this.getWindowStartedAt();
      const key = `discord:invalid-requests:10m:${windowStartedAt.getTime()}:${options.endpoint}:${options.status}`;
      const count = await this.incrementCounter(key);

      this.logger.log({
        level: "warn",
        event: "discord.invalid_request",
        message: "Discord invalid request recorded",
        endpoint: options.endpoint,
        status: options.status,
        source: options.source,
        count,
        windowStartedAt: windowStartedAt.toISOString(),
      });
    });
  }

  async recordMemberRefreshMetric(options: {
    outcome: DiscordMemberRefreshMetricOutcome;
    reason?: string;
  }): Promise<void> {
    await this.runSafely("discord.member_refresh.metric", async () => {
      const windowStartedAt = this.getWindowStartedAt();
      const key = `discord:member-refresh:10m:${windowStartedAt.getTime()}:${options.outcome}`;
      const count = await this.incrementCounter(key);

      this.logger.log({
        level: "debug",
        event: "discord.member_refresh.metric",
        message: "Discord member refresh metric recorded",
        outcome: options.outcome,
        reason: options.reason,
        count,
        windowStartedAt: windowStartedAt.toISOString(),
      });
    });
  }

  async recordMemberRefreshLatency(latencyMs: number): Promise<void> {
    const boundedLatencyMs = Math.max(Math.round(latencyMs), 0);

    await this.runSafely("discord.member_refresh.latency", async () => {
      const windowStartedAt = this.getWindowStartedAt();
      const key = `discord:member-refresh:latency:10m:${windowStartedAt.getTime()}`;

      await this.redisService.eval<number>(
        this.RECORD_LATENCY_SCRIPT,
        [key],
        [boundedLatencyMs, this.windowTtlSeconds],
      );

      this.logger.log({
        level: "debug",
        event: "discord.member_refresh.latency",
        message: "Discord member refresh latency recorded",
        latencyMs: boundedLatencyMs,
        windowStartedAt: windowStartedAt.toISOString(),
      });
    });
  }

  private async incrementCounter(key: string): Promise<number> {
    const count = await this.redisService.incr(key);

    if (count === 1) {
      await this.redisService.expire(key, this.windowTtlSeconds);
    }

    return count;
  }

  private getWindowStartedAt(): Date {
    return new Date(Math.floor(Date.now() / this.windowMs) * this.windowMs);
  }

  private async runSafely(
    event: string,
    action: () => Promise<void>,
  ): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.logger.log({
        level: "debug",
        event,
        message: "Failed to record Discord diagnostics",
        error,
      });
    }
  }
}
