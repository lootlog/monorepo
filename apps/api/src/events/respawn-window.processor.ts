import { InjectQueue } from "@nestjs/bullmq";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import type { Job, Queue } from "bullmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { PrismaService } from "src/db/prisma.service";
import { RESPAWN_WINDOW_QUEUE } from "./constants/respawn-queue.constant";
import { EventsService } from "./events.service";
import { isEventActiveAt } from "./utils/event-activity.util";
import { getSyntheticNpcId } from "./utils/get-synthetic-npc-id";
import {
  AUTO_CLOSE_EVENT_END_BUFFER_MS,
  AUTO_CLOSE_MAX_EXTENSIONS,
  AUTO_CLOSE_RESCHEDULE_DELAY_MS,
  RESPAWN_AUTO_CLOSE_JOB_NAME,
} from "./utils/respawn-auto-close-job";

export interface AutoCloseRespawnWindowJobData {
  guildId: string;
  eventId: string;
  heroId: string;
  npcId: number;
  world: string;
  autoCloseAttempt?: number;
}

@Injectable()
@Processor(RESPAWN_WINDOW_QUEUE)
export class RespawnWindowProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly eventsService: EventsService,
    private readonly prisma: PrismaService,
    @InjectQueue(RESPAWN_WINDOW_QUEUE)
    private readonly respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
  ) {
    super();
  }

  async process(job: Job<AutoCloseRespawnWindowJobData>): Promise<void> {
    const { guildId, eventId, heroId, npcId } = job.data;

    const shouldDefer = await this.shouldDeferAutoClose(job.data);

    if (shouldDefer) {
      await this.rescheduleAutoClose(job.data);
      return;
    }

    this.logger.log({
      level: "info",
      message: `Auto-closing respawn window for hero ${heroId} (npcId: ${npcId}) in event ${eventId}`,
    });

    try {
      await this.eventsService.closeRespawnWindow(guildId, eventId, heroId, {
        createNewWindow: false,
        isAutoClose: true,
      });

      this.logger.log({
        level: "info",
        message: `Successfully auto-closed respawn window for hero ${heroId}`,
      });
    } catch (error) {
      this.logger.log({
        level: "error",
        message: `Failed to auto-close respawn window for hero ${heroId}`,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async shouldDeferAutoClose(
    data: AutoCloseRespawnWindowJobData,
  ): Promise<boolean> {
    const { autoCloseAttempt = 0 } = data;

    if (autoCloseAttempt >= AUTO_CLOSE_MAX_EXTENSIONS) {
      this.logger.log({
        level: "warn",
        message: "Max auto-close extensions reached, proceeding with close",
        heroId: data.heroId,
        attempt: autoCloseAttempt,
      });
      return false;
    }

    const event = await this.prisma.event.findFirst({
      where: { id: data.eventId, guildId: data.guildId },
      select: { startsAt: true, endsAt: true, createdAt: true },
    });

    if (!event) {
      return false;
    }

    const now = new Date();

    if (!isEventActiveAt(event, now)) {
      return false;
    }

    if (event.endsAt) {
      const maxDeferUntil = new Date(
        event.endsAt.getTime() + AUTO_CLOSE_EVENT_END_BUFFER_MS,
      );
      const nextFireTime = new Date(
        now.getTime() + AUTO_CLOSE_RESCHEDULE_DELAY_MS,
      );
      if (nextFireTime > maxDeferUntil) {
        return false;
      }
    }

    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: { id: data.heroId, eventId: data.eventId },
      select: { npcId: true },
    });

    if (!hero) {
      return false;
    }

    const effectiveNpcId = hero.npcId ?? getSyntheticNpcId(data.heroId);
    const timer = await this.prisma.timer.findUnique({
      where: {
        timerId: {
          guildId: data.guildId,
          world: data.world,
          npcId: effectiveNpcId,
        },
      },
      select: { npcId: true },
    });

    return timer !== null;
  }

  private async rescheduleAutoClose(
    data: AutoCloseRespawnWindowJobData,
  ): Promise<void> {
    const nextAttempt = (data.autoCloseAttempt ?? 0) + 1;
    const jobId = `respawn-close-deferred-${data.heroId}-${nextAttempt}-${Date.now()}`;

    await this.respawnWindowQueue.add(
      RESPAWN_AUTO_CLOSE_JOB_NAME,
      { ...data, autoCloseAttempt: nextAttempt },
      {
        delay: AUTO_CLOSE_RESCHEDULE_DELAY_MS,
        jobId,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    this.logger.log({
      level: "info",
      message:
        "Deferred auto-close for active event hero, rescheduled for later",
      heroId: data.heroId,
      eventId: data.eventId,
      attempt: nextAttempt,
      nextFireInMs: AUTO_CLOSE_RESCHEDULE_DELAY_MS,
    });
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<AutoCloseRespawnWindowJobData>, error: Error): void {
    this.logger.log({
      level: "error",
      message: "Auto-close respawn window job failed",
      jobId: job.id,
      heroId: job.data.heroId,
      eventId: job.data.eventId,
      guildId: job.data.guildId,
      npcId: job.data.npcId,
      world: job.data.world,
      attemptsMade: job.attemptsMade,
      error: error.message,
      stack: error.stack,
    });
  }
}
