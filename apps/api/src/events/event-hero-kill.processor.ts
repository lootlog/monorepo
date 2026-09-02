import type { Job } from "bullmq";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import { EVENT_HERO_KILL_QUEUE } from "./constants/event-hero-kill-queue.constant.js";
import { EventsService } from "./events.service.js";
import type { EventHeroKillJobData } from "./interfaces/check-event-hero-kill-params.interface.js";
import { deserializeKillTimerData } from "./utils/event-hero-kill-job.js";

export class EventHeroKillProcessor {
  constructor(
    private readonly logger: Logger,
    private readonly eventsService: EventsService,
  ) {}

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
