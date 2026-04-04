import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import type { Job } from "bullmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { RESPAWN_WINDOW_QUEUE } from "./constants/respawn-queue.constant";

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
  ) {
    super();
  }

  async process(job: Job<AutoCloseRespawnWindowJobData>) {
    this.logger.log({
      level: "info",
      message:
        "Ignoring deprecated auto-close respawn window job because manual close is required",
      jobId: job.id,
      heroId: job.data.heroId,
      eventId: job.data.eventId,
      guildId: job.data.guildId,
      npcId: job.data.npcId,
      world: job.data.world,
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
