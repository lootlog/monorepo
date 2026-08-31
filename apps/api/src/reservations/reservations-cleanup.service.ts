import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PRISMA_DB, type PrismaDb } from "#src/db/prisma.provider";
import { env } from "#src/config/env";

@Injectable()
export class ReservationsCleanupService {
  private readonly logger = new Logger(ReservationsCleanupService.name);
  private readonly retentionDays: number;
  private readonly enabled: boolean;

  constructor(@Inject(PRISMA_DB) private readonly prisma: PrismaDb) {
    this.enabled = env.RESERVATIONS_CLEANUP_ENABLED !== "false";
    this.retentionDays = env.RESERVATIONS_RETENTION_DAYS;
  }

  /**
   * Scheduled job that runs daily at 4 AM to clean up expired reservations.
   * Deletes reservations whose end date is older than the configured retention window.
   * Can be disabled via RESERVATIONS_CLEANUP_ENABLED environment variable.
   * @cron Daily at 4:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupExpiredReservations() {
    if (!this.enabled) {
      this.logger.debug("Reservation cleanup is disabled");
      return;
    }

    const cutoffDate = this.createCutoffDate(this.retentionDays);

    this.logger.log(
      `Starting reservation cleanup (cutoff: ${cutoffDate.toISOString()}, retention: ${this.retentionDays} days)`,
    );

    const startTime = Date.now();

    try {
      const count = await this.deleteExpiredReservations(cutoffDate);

      const duration = Date.now() - startTime;

      this.logger.log(`Deleted ${count} expired reservations in ${duration}ms`);
    } catch (error) {
      this.logger.error("Reservation cleanup failed", error);
    }
  }

  /**
   * Manually triggers cleanup of expired reservations.
   * @param retentionDays Number of days after the reservation end date to keep entries.
   * @returns Number of deleted reservations.
   */
  async cleanupExpiredReservationsManual(
    retentionDays: number = this.retentionDays,
  ): Promise<number> {
    const cutoffDate = this.createCutoffDate(retentionDays);

    this.logger.log(
      `Manual cleanup of expired reservations (cutoff: ${cutoffDate.toISOString()}, retention: ${retentionDays} days)`,
    );

    const count = await this.deleteExpiredReservations(cutoffDate);

    this.logger.log(`Manual cleanup deleted ${count} expired reservations`);

    return count;
  }

  private createCutoffDate(retentionDays: number): Date {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return cutoffDate;
  }

  private async deleteExpiredReservations(cutoffDate: Date): Promise<number> {
    const result = await this.prisma.runtime().execute(
      this.prisma.raw.sql`
        DELETE FROM "Reservation"
        WHERE "endsAt" < ${cutoffDate.toISOString().slice(0, -1)}::timestamp
      `
        .affectedCount()
        .build(),
    );

    return result.affectedRows;
  }
}
