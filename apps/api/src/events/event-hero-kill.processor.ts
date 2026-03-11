import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable, forwardRef } from "@nestjs/common";
import type { Job } from "bullmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { EVENT_HERO_KILL_QUEUE } from "./constants/event-hero-kill-queue.constant";
import { EventsService } from "./events.service";
import type { EventHeroKillJobData } from "./interfaces/check-event-hero-kill-params.interface";
import { deserializeKillTimerData } from "./utils/event-hero-kill-job";

@Injectable()
@Processor(EVENT_HERO_KILL_QUEUE)
export class EventHeroKillProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
  ) {
    super();
  }

  async process(job: Job<EventHeroKillJobData>): Promise<void> {
    const { guildId, world, npcId, npcName, npcIcon, npcLvl, isManualClose } =
      job.data;

    await this.eventsService.checkAndRecordEventHeroKill(
      {
        guildId,
        world,
        npcId,
        npcName,
        npcIcon,
        npcLvl,
        timerData: deserializeKillTimerData(job.data.timerData),
      },
      isManualClose,
    );
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<EventHeroKillJobData>, error: Error): void {
    this.logger.log({
      level: "error",
      message: "Event hero kill job failed",
      jobId: job.id,
      guildId: job.data.guildId,
      world: job.data.world,
      npcId: job.data.npcId,
      attemptsMade: job.attemptsMade,
      error: error.message,
      stack: error.stack,
    });
  }
}
