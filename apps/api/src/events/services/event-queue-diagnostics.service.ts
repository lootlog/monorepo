import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Queue } from "bullmq";
import { PrismaService } from "src/db/prisma.service";
import { RESPAWN_WINDOW_QUEUE } from "../constants/respawn-queue.constant";
import type { AutoCloseRespawnWindowJobData } from "../interfaces/auto-close-respawn-window-job-data";

@Injectable()
export class EventQueueDiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(RESPAWN_WINDOW_QUEUE)
    private readonly respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
  ) {}

  async getAutoCloseJobsStatus(guildId: string, eventId: string) {
    const event = await this.prisma.orm.public.Event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const heroes = await this.prisma.orm.public.EventHeroNpc.findMany({
      where: { eventId },
      select: { id: true },
    });

    const heroIds = new Set(heroes.map((hero) => hero.id));

    const [pendingJobs, delayedJobs, failedJobs] = await Promise.all([
      this.respawnWindowQueue.getJobs(["waiting", "active"]),
      this.respawnWindowQueue.getJobs(["delayed"]),
      this.respawnWindowQueue.getJobs(["failed"]),
    ]);

    const filterJobsForEvent = (jobs: typeof pendingJobs) =>
      jobs.filter((job) => heroIds.has(job.data.heroId));

    const eventPendingJobs = filterJobsForEvent(pendingJobs);
    const eventDelayedJobs = filterJobsForEvent(delayedJobs);
    const eventFailedJobs = filterJobsForEvent(failedJobs);

    return {
      pending: {
        count: eventPendingJobs.length,
        jobs: eventPendingJobs.map((job) => ({
          jobId: job.id ?? "unknown",
          heroId: job.data.heroId,
        })),
      },
      delayed: {
        count: eventDelayedJobs.length,
        jobs: eventDelayedJobs.map((job) => ({
          jobId: job.id ?? "unknown",
          heroId: job.data.heroId,
          scheduledFor: new Date(job.timestamp + (job.opts.delay ?? 0)),
        })),
      },
      failed: {
        count: eventFailedJobs.length,
        jobs: eventFailedJobs.map((job) => ({
          jobId: job.id ?? "unknown",
          heroId: job.data.heroId,
          failedReason: job.failedReason ?? "Unknown",
        })),
      },
    };
  }

  async getQueueHealth(guildId: string, eventId: string) {
    const event = await this.prisma.orm.public.Event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const [jobCounts, isPaused, workers] = await Promise.all([
      this.respawnWindowQueue.getJobCounts(),
      this.respawnWindowQueue.isPaused(),
      this.respawnWindowQueue.getWorkers(),
    ]);

    return {
      queueName: this.respawnWindowQueue.name,
      isReady: workers.length > 0,
      isPaused,
      jobCounts: {
        waiting: jobCounts.waiting ?? 0,
        active: jobCounts.active ?? 0,
        completed: jobCounts.completed ?? 0,
        failed: jobCounts.failed ?? 0,
        delayed: jobCounts.delayed ?? 0,
      },
      workers: workers.length,
    };
  }
}
