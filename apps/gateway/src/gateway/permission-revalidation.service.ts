import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GatewayService } from './gateway.service';
import { Gateway } from './gateway';
import { RedisService } from 'src/lib/redis/redis.service';

interface RevalidationStats {
  totalUsers: number;
  processedUsers: number;
  failedUsers: number;
  removedFromRooms: number;
  durationMs: number;
}

/**
 * Periodic permission revalidation service.
 *
 * Every 5 minutes, iterates through all connected sockets and rebalances
 * their room memberships based on current permissions.
 *
 * This catches cases where:
 * - Member was removed but event was lost
 * - Permissions changed but rebalance failed
 * - Connection outlived its permission grant
 *
 * Rate limiting:
 * - Processes max 100 users per cycle
 * - 100ms delay between users to avoid overwhelming API
 * - Skips users revalidated within last 5 minutes
 */
@Injectable()
export class PermissionRevalidationService implements OnModuleInit {
  private readonly logger = new Logger(PermissionRevalidationService.name);
  private readonly REVALIDATION_CACHE_KEY_PREFIX = 'gateway:revalidation:';
  private readonly REVALIDATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_USERS_PER_CYCLE = 100;
  private readonly DELAY_BETWEEN_USERS_MS = 100;
  private isRunning = false;

  constructor(
    private readonly gatewayService: GatewayService,
    private readonly gateway: Gateway,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.logger.log('Permission revalidation service initialized');
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRevalidationCron() {
    if (this.isRunning) {
      this.logger.warn('Revalidation already in progress, skipping cycle');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const stats = await this.revalidateConnectedUsers();
      this.logger.log({
        message: 'Permission revalidation cycle completed',
        ...stats,
      });
    } catch (error) {
      this.logger.error('Permission revalidation cycle failed', error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  private async revalidateConnectedUsers(): Promise<RevalidationStats> {
    const stats: RevalidationStats = {
      totalUsers: 0,
      processedUsers: 0,
      failedUsers: 0,
      removedFromRooms: 0,
      durationMs: 0,
    };

    const startTime = Date.now();

    try {
      const sockets = await this.gateway.server.fetchSockets();

      // Group by unique users (discordId + userId)
      const uniqueUsers = new Map<string, { discordId: string; userId: string }>();

      for (const socket of sockets) {
        const discordId = socket.data?.discordId;
        const userId = socket.data?.userId;

        if (discordId && userId) {
          const key = `${discordId}:${userId}`;
          if (!uniqueUsers.has(key)) {
            uniqueUsers.set(key, { discordId, userId });
          }
        }
      }

      stats.totalUsers = uniqueUsers.size;
      this.logger.debug(`Found ${stats.totalUsers} unique connected users`);

      // Process users with rate limiting
      let processedCount = 0;
      for (const [key, user] of uniqueUsers) {
        if (processedCount >= this.MAX_USERS_PER_CYCLE) {
          this.logger.debug(
            `Reached max users per cycle (${this.MAX_USERS_PER_CYCLE}), stopping`,
          );
          break;
        }

        // Check if user was recently revalidated
        const wasRecentlyRevalidated = await this.wasRecentlyRevalidated(key);
        if (wasRecentlyRevalidated) {
          continue;
        }

        try {
          await this.gatewayService.rebalanceUserSocketRooms(
            user.discordId,
            user.userId,
          );

          await this.markAsRevalidated(key);
          stats.processedUsers++;

          this.logger.debug(
            `Revalidated permissions for user ${user.discordId}`,
          );
        } catch (error) {
          stats.failedUsers++;
          this.logger.warn(
            `Failed to revalidate user ${user.discordId}: ${error.message}`,
          );
        }

        processedCount++;

        // Rate limiting delay
        if (processedCount < uniqueUsers.size) {
          await this.sleep(this.DELAY_BETWEEN_USERS_MS);
        }
      }

      stats.durationMs = Date.now() - startTime;
      return stats;
    } catch (error) {
      stats.durationMs = Date.now() - startTime;
      throw error;
    }
  }

  private async wasRecentlyRevalidated(userKey: string): Promise<boolean> {
    const cacheKey = `${this.REVALIDATION_CACHE_KEY_PREFIX}${userKey}`;
    const cached = await this.redis.get(cacheKey);
    return cached !== null;
  }

  private async markAsRevalidated(userKey: string): Promise<void> {
    const cacheKey = `${this.REVALIDATION_CACHE_KEY_PREFIX}${userKey}`;
    const ttlSeconds = Math.floor(this.REVALIDATION_INTERVAL_MS / 1000);
    await this.redis.set(cacheKey, Date.now().toString(), ttlSeconds);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
