import type { Job } from "bullmq";
import { Effect } from "effect";
import type { EventKills } from "#src/events/kills/event-kill.service";
import type { EventHeroKillJobData } from "#src/events/kills/check-event-hero-kill-params";
import { deserializeKillTimerData } from "#src/events/kills/event-hero-kill-job";

export const makeEventHeroKillProcessor = (
  kills: Pick<EventKills, "checkAndRecordEventHeroKill">,
  runPromise: <A, E>(effect: Effect.Effect<A, E>) => Promise<A>,
) => ({
  async process(job: Job<EventHeroKillJobData>): Promise<void> {
    const { guildId, world, npcId, npcName, npcIcon, npcLvl, isManualClose } =
      job.data;

    await runPromise(
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

  onFailed(job: Job<EventHeroKillJobData>, error: Error): Effect.Effect<void> {
    return Effect.logError({
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
