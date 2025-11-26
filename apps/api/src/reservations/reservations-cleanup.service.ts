import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/db/prisma.service';

const DEFAULT_RETENTION_DAYS = 30;

@Injectable()
export class ReservationsCleanupService {
  private readonly logger = new Logger(ReservationsCleanupService.name);
  private readonly retentionDays: number;
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.enabled =
      this.configService.get<string>('RESERVATIONS_CLEANUP_ENABLED') !==
      'false';
    this.retentionDays = Number.parseInt(
      this.configService.get<string>('RESERVATIONS_RETENTION_DAYS') ??
        String(DEFAULT_RETENTION_DAYS),
      10,
    );
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
      this.logger.debug('Reservation cleanup is disabled');
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    this.logger.log(
      `Starting reservation cleanup (cutoff: ${cutoffDate.toISOString()}, retention: ${this.retentionDays} days)`,
    );

    const startTime = Date.now();

    try {
      const { count } = await this.prisma.reservation.deleteMany({
        where: {
          toDate: { lt: cutoffDate },
        },
      });

      const duration = Date.now() - startTime;

      this.logger.log(`Deleted ${count} expired reservations in ${duration}ms`);
    } catch (error) {
      this.logger.error('Reservation cleanup failed', error);
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    this.logger.log(
      `Manual cleanup of expired reservations (cutoff: ${cutoffDate.toISOString()}, retention: ${retentionDays} days)`,
    );

    const { count } = await this.prisma.reservation.deleteMany({
      where: {
        toDate: { lt: cutoffDate },
      },
    });

    this.logger.log(`Manual cleanup deleted ${count} expired reservations`);

    return count;
  }
}
