import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import type { Event, EventHeroNpc } from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import type { CheckEventHeroKillParams } from "../interfaces/check-event-hero-kill-params.interface";
import { EVENT_HERO_KILL_QUEUE } from "../constants/event-hero-kill-queue.constant";
import {
  EVENT_HERO_KILL_JOB_NAME,
  buildEventHeroKillJobId,
  createEventHeroKillJobData,
  getEventHeroKillWindowKey,
} from "../utils/event-hero-kill-job";
import { findActiveEventHeroesByNpc } from "../utils/find-active-event-heroes-by-npc";

@Injectable()
export class EventTimerHooksService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EVENT_HERO_KILL_QUEUE)
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
  ): Promise<{ eventHero: EventHeroNpc; event: Event } | null> {
    const matches = await findActiveEventHeroesByNpc(
      this.prisma,
      guildId,
      world,
      npcId,
      npcName,
    );

    return matches[0] ?? null;
  }
}
