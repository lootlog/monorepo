import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import type { Job } from "bullmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { RESPAWN_WINDOW_QUEUE } from "./constants/respawn-queue.constant";
import { EventsService } from "./events.service";

export interface AutoCloseRespawnWindowJobData {
  guildId: string;
  eventId: string;
  heroId: string;
  npcId: number;
  world: string;
}

@Injectable()
@Processor(RESPAWN_WINDOW_QUEUE)
export class RespawnWindowProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly eventsService: EventsService,
  ) {
    super();
  }

  async process(job: Job<AutoCloseRespawnWindowJobData>): Promise<void> {
    const { guildId, eventId, heroId, npcId } = job.data;

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
