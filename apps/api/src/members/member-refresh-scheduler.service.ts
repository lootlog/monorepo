import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue as BullQueue } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { DiscordRateLimiterService } from 'src/discord/discord-rate-limiter.service';
import { RedisService } from 'src/lib/redis/redis.service';
import { MEMBER_REFRESH_QUEUE } from './constants/member-refresh-queue.constant';

export interface MemberRefreshJobData {
  discordId: string;
  guildId: string;
  userId: string;
  priority: number;
  reason: string;
}

export interface MemberRefreshScheduleResult {
  queued: boolean;
  nextRefreshAt: Date | null;
}

@Injectable()
export class MemberRefreshSchedulerService {
  private readonly MEMBER_ENDPOINT = 'guild-member';
  private readonly USER_LOCK_TTL_SECONDS = 30;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectQueue(MEMBER_REFRESH_QUEUE)
    private readonly memberRefreshQueue: BullQueue<MemberRefreshJobData>,
    private readonly rateLimiter: DiscordRateLimiterService,
    private readonly redisService: RedisService,
  ) {}

  async enqueueRefresh(
    data: MemberRefreshJobData,
  ): Promise<MemberRefreshScheduleResult> {
    const jobId = this.getJobId(data.userId, data.guildId);
    const nextRefreshAt = await this.rateLimiter.getNextAvailableAtForUser(
      data.userId,
      this.MEMBER_ENDPOINT,
    );
    const delay =
      nextRefreshAt === null
        ? 0
        : Math.max(nextRefreshAt.getTime() - Date.now(), 0);

    const existingJob = await this.memberRefreshQueue.getJob(jobId);
    if (existingJob) {
      await this.updateExistingJob(existingJob, data, delay);
      return {
        queued: true,
        nextRefreshAt,
      };
    }

    await this.memberRefreshQueue.add('member-refresh', data, {
      jobId,
      delay,
      priority: data.priority,
      attempts: 10,
      backoff: {
        type: 'fixed',
        delay: 1000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
        count: 1000,
      },
    });

    this.logger.log({
      level: 'debug',
      message: 'Queued member refresh job',
      jobId,
      guildId: data.guildId,
      userId: data.userId,
      priority: data.priority,
      reason: data.reason,
      delay,
    });

    return {
      queued: true,
      nextRefreshAt,
    };
  }

  async isUserRefreshLocked(userId: string): Promise<boolean> {
    return Boolean(await this.redisService.get(this.getUserLockKey(userId)));
  }

  async acquireUserRefreshLock(
    userId: string,
    owner: string,
    ttlSeconds = this.USER_LOCK_TTL_SECONDS,
  ): Promise<boolean> {
    return this.redisService.setNX(
      this.getUserLockKey(userId),
      owner,
      ttlSeconds,
    );
  }

  async extendUserRefreshLock(
    userId: string,
    owner: string,
    ttlSeconds: number,
  ): Promise<void> {
    const lockKey = this.getUserLockKey(userId);
    const currentOwner = await this.redisService.get(lockKey);
    if (currentOwner !== owner) {
      return;
    }

    await this.redisService.expire(lockKey, ttlSeconds);
  }

  async releaseUserRefreshLock(userId: string, owner: string): Promise<void> {
    const lockKey = this.getUserLockKey(userId);
    const currentOwner = await this.redisService.get(lockKey);
    if (currentOwner !== owner) {
      return;
    }

    await this.redisService.del(lockKey);
  }

  async getNextRefreshAt(userId: string): Promise<Date | null> {
    return this.rateLimiter.getNextAvailableAtForUser(
      userId,
      this.MEMBER_ENDPOINT,
    );
  }

  private async updateExistingJob(
    job: Job<MemberRefreshJobData>,
    data: MemberRefreshJobData,
    delay: number,
  ): Promise<void> {
    const nextData: MemberRefreshJobData = {
      ...job.data,
      ...data,
      priority: Math.min(job.data.priority, data.priority),
    };

    await job.updateData(nextData);

    if ((job.opts.priority ?? nextData.priority) > nextData.priority) {
      try {
        await job.changePriority({ priority: nextData.priority });
      } catch (error) {
        this.logger.log({
          level: 'debug',
          message: 'Failed to reprioritize member refresh job',
          jobId: job.id,
          error,
        });
      }
    }

    if (delay === 0) {
      try {
        await job.promote();
      } catch (error) {
        this.logger.log({
          level: 'debug',
          message: 'Failed to promote member refresh job',
          jobId: job.id,
          error,
        });
      }
    }
  }

  private getJobId(userId: string, guildId: string): string {
    return `member-refresh:${userId}:${guildId}`;
  }

  private getUserLockKey(userId: string): string {
    return `member:refresh:lock:${userId}`;
  }
}
