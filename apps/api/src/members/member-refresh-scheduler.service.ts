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

type MemberRefreshJobState =
  | 'active'
  | 'completed'
  | 'delayed'
  | 'failed'
  | 'paused'
  | 'prioritized'
  | 'unknown'
  | 'waiting'
  | 'waiting-children';

@Injectable()
export class MemberRefreshSchedulerService {
  private readonly MEMBER_ENDPOINT = 'guild-member';
  private readonly USER_LOCK_TTL_SECONDS = 30;
  private readonly EXTEND_USER_REFRESH_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("EXPIRE", KEYS[1], ARGV[2])
end
return 0
`;
  private readonly RELEASE_USER_REFRESH_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

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
      const existingState = await this.getExistingJobState(existingJob);

      if (this.shouldReplaceExistingJob(existingState)) {
        await this.replaceExistingJob(jobId, existingJob, data, delay);
      } else {
        await this.updateExistingJob(existingJob, data, delay, existingState);
      }

      return {
        queued: true,
        nextRefreshAt,
      };
    }

    await this.addRefreshJob(jobId, data, delay);

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
    await this.redisService.eval<number>(
      this.EXTEND_USER_REFRESH_LOCK_SCRIPT,
      [lockKey],
      [owner, ttlSeconds],
    );
  }

  async releaseUserRefreshLock(userId: string, owner: string): Promise<void> {
    const lockKey = this.getUserLockKey(userId);
    await this.redisService.eval<number>(
      this.RELEASE_USER_REFRESH_LOCK_SCRIPT,
      [lockKey],
      [owner],
    );
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
    state: MemberRefreshJobState,
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

    if (state === 'delayed' && delay === 0) {
      await this.promoteDelayedJob(job);
    }
  }

  private async addRefreshJob(
    jobId: string,
    data: MemberRefreshJobData,
    delay: number,
  ): Promise<void> {
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
  }

  private async replaceExistingJob(
    jobId: string,
    job: Job<MemberRefreshJobData>,
    data: MemberRefreshJobData,
    delay: number,
  ): Promise<void> {
    await this.removeExistingJob(job);
    await this.addRefreshJob(jobId, data, delay);
  }

  private async removeExistingJob(
    job: Job<MemberRefreshJobData>,
  ): Promise<void> {
    try {
      await job.remove();
    } catch (error) {
      if (this.isMissingJobError(error)) {
        return;
      }

      this.logger.log({
        level: 'debug',
        message: 'Failed to remove stale member refresh job before requeue',
        jobId: job.id,
        error,
      });
      throw error;
    }
  }

  private async promoteDelayedJob(
    job: Job<MemberRefreshJobData>,
  ): Promise<void> {
    try {
      await job.promote();
    } catch (error) {
      if (this.isJobNotInStateError(error)) {
        const currentState = await this.getExistingJobState(job);

        if (currentState !== 'delayed') {
          this.logger.log({
            level: 'debug',
            message:
              'Skipped promoting member refresh job because it already left delayed state',
            jobId: job.id,
            state: currentState,
          });
          return;
        }
      }

      this.logger.log({
        level: 'debug',
        message: 'Failed to promote member refresh job',
        jobId: job.id,
        error,
      });
    }
  }

  private async getExistingJobState(
    job: Job<MemberRefreshJobData>,
  ): Promise<MemberRefreshJobState> {
    return (await job.getState()) as MemberRefreshJobState;
  }

  private shouldReplaceExistingJob(state: MemberRefreshJobState): boolean {
    return state === 'completed' || state === 'failed' || state === 'unknown';
  }

  private isJobNotInStateError(
    error: unknown,
  ): error is Error & { code: number } {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === -3,
    );
  }

  private isMissingJobError(error: unknown): error is Error & { code: number } {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === -1,
    );
  }

  private getJobId(userId: string, guildId: string): string {
    return `member-refresh:${userId}:${guildId}`;
  }

  private getUserLockKey(userId: string): string {
    return `member:refresh:lock:${userId}`;
  }
}
