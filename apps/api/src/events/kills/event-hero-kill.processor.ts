import type { Job } from "bullmq";
import { Effect } from "effect";
import type { ApplicationLogger as Logger } from "#src/shared/application-logger";
import type { EventKills } from "#src/events/kills/event-kill.service";
import type { EventHeroKillJobData } from "#src/events/kills/check-event-hero-kill-params";
import { deserializeKillTimerData } from "#src/events/kills/event-hero-kill-job";

export const makeEventHeroKillProcessor = (
  logger: Logger,
  kills: Pick<EventKills, "checkAndRecordEventHeroKill">,
) => ({
  async process(job: Job<EventHeroKillJobData>): Promise<void> {
    const { guildId, world, npcId, npcName, npcIcon, npcLvl, isManualClose } =
      job.data;

    await Effect.runPromise(
      kills.checkAndRecordEventHeroKill(
        guildId,
        world,
        npcId,
        npcName,
        npcIcon,
        deserializeKillTimerData(job.data.timerData),
        isManualClose,
        npcLvl,
      ),
    );
  },

  onFailed(job: Job<EventHeroKillJobData>, error: Error): void {
    logger.log({
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
  },
});
