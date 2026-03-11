import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "src/db/prisma.service";
import { ConfigService } from "@nestjs/config";
import { TIMER_TYPES } from "src/timers/constants/timer-limits";

const DEFAULT_RETENTION_DAYS = 7;

@Injectable()
export class TimersCleanupService {
  private readonly logger = new Logger(TimersCleanupService.name);
  private readonly retentionDays: number;
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.enabled =
      this.configService.get<string>("TIMER_CLEANUP_ENABLED") !== "false";
    this.retentionDays = parseInt(
      this.configService.get<string>("TIMER_RETENTION_DAYS") ??
        String(DEFAULT_RETENTION_DAYS),
      10,
    );
  }

  /**
   * Scheduled job that runs daily at 3 AM to clean up expired timers.
   * Deletes ONLY manual timers that have expired beyond the configured retention period.
   * Game NPC timers are preserved for historical search functionality.
   * Can be disabled via TIMER_CLEANUP_ENABLED environment variable.
   * @cron Daily at 3:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredTimers() {
    if (!this.enabled) {
      this.logger.debug("Timer cleanup is disabled");
      return;
    }

    const cutoffDate = this.createCutoffDate(this.retentionDays);

    this.logger.log(
      `Starting manual timer cleanup (cutoff: ${cutoffDate}, retention: ${this.retentionDays} days)`,
    );

    const startTime = Date.now();

    try {
      const deletedTimersCount =
        await this.deleteExpiredManualTimers(cutoffDate);

      const duration = Date.now() - startTime;

      this.logger.log(
        `Deleted ${deletedTimersCount} expired manual timers in ${duration}ms (game NPC timers preserved)`,
      );
    } catch (error) {
      this.logger.error("Timer cleanup failed", error);
    }
  }

  /**
   * Manually triggers cleanup of expired manual timers with a custom retention period.
   * Deletes ONLY manual timers, preserving game NPC timers for historical search.
   * Useful for testing or administrative operations.
   * @param retentionDays - Number of days after expiry to keep timers (default: configured retention)
   * @returns Count of deleted manual timers
   */
  async cleanupExpiredTimersManual(
    retentionDays: number = this.retentionDays,
  ): Promise<number> {
    const cutoffDate = this.createCutoffDate(retentionDays);

    this.logger.log(
      `Manual cleanup of expired manual timers (cutoff: ${cutoffDate}, retention: ${retentionDays} days)`,
    );

    const deletedTimersCount = await this.deleteExpiredManualTimers(cutoffDate);

    this.logger.log(
      `Manual cleanup deleted ${deletedTimersCount} expired manual timers (game NPC timers preserved)`,
    );

    return deletedTimersCount;
  }

  private createCutoffDate(retentionDays: number): Date {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return cutoffDate;
  }

  private deleteExpiredManualTimers(cutoffDate: Date): Promise<number> {
    return this.prisma.$executeRaw<number>`
      DELETE FROM "Timer"
      WHERE "maxSpawnTime" < ${cutoffDate}
        AND ("npc"->>'margonemType')::int = ${TIMER_TYPES.CUSTOM_MANUAL}
    `;
  }
}
