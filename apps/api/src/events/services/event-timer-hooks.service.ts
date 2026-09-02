import type { Queue } from "bullmq";
import type {
  eventHeroNpcTable,
  eventTable,
} from "#src/database/drizzle/schema";
import type { CheckEventHeroKillParams } from "../interfaces/check-event-hero-kill-params.interface.js";
import { EVENT_HERO_KILL_QUEUE } from "../constants/event-hero-kill-queue.constant.js";
import {
  EVENT_HERO_KILL_JOB_NAME,
  buildEventHeroKillJobId,
  createEventHeroKillJobData,
  getEventHeroKillWindowKey,
} from "../utils/event-hero-kill-job.js";
import { findActiveEventHeroesByNpc } from "../utils/find-active-event-heroes-by-npc.js";
import { ActiveEventHeroRepository } from "./active-event-hero.repository.js";

export class EventTimerHooksService {
  constructor(
    private readonly repository: ActiveEventHeroRepository,

    private readonly eventHeroKillQueue: Queue,
  ) {}

  async enqueueEventHeroKillCheck(
    params: CheckEventHeroKillParams,
    isManualClose = false,
  ): Promise<void> {
    const windowKey = getEventHeroKillWindowKey(params.timerData);
    const jobId = buildEventHeroKillJobId({
      guildId: params.guildId,
      world: params.world,
      npcId: params.npcId,
      windowKey,
      isManualClose,
    });

    await this.eventHeroKillQueue.add(
      EVENT_HERO_KILL_JOB_NAME,
      createEventHeroKillJobData(params, isManualClose),
      {
        jobId,
        attempts: 5,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async findActiveEventHeroByNpc(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
  ): Promise<{
    eventHero: typeof eventHeroNpcTable.$inferSelect;
    event: typeof eventTable.$inferSelect;
  } | null> {
    const matches = await findActiveEventHeroesByNpc(
      this.repository,
      guildId,
      world,
      npcId,
      npcName,
    );

    return matches[0] ?? null;
  }
}
