import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { type Event, type EventHeroNpc } from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import type { CheckEventHeroKillParams } from "../interfaces";
import { EVENT_HERO_KILL_QUEUE } from "../constants/event-hero-kill-queue.constant";
import {
  EVENT_HERO_KILL_JOB_NAME,
  buildEventHeroKillJobId,
  createEventHeroKillJobData,
  getEventHeroKillWindowKey,
} from "../utils/event-hero-kill-job";
import { buildActiveEventWhere } from "../utils/event-activity.util";

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
    const now = new Date();

    const directIdMatches = await this.prisma.eventHeroNpc.findMany({
      where: {
        npcId,
        event: {
          guildId,
          world,
          ...buildActiveEventWhere(now),
        },
      },
      include: {
        event: true,
      },
    });

    const nameMatches = await this.prisma.eventHeroNpc.findMany({
      where: {
        npcName,
        npcId: null,
        event: {
          guildId,
          world,
          ...buildActiveEventWhere(now),
        },
      },
      include: {
        event: true,
      },
    });

    const uniqueMatches = new Map<
      string,
      { eventHero: EventHeroNpc; event: Event }
    >();

    for (const hero of [...directIdMatches, ...nameMatches]) {
      uniqueMatches.set(hero.id, { eventHero: hero, event: hero.event });
    }

    return (
      Array.from(uniqueMatches.values()).sort((leftHero, rightHero) => {
        const leftStart =
          leftHero.event.startsAt?.getTime() ??
          leftHero.event.createdAt?.getTime?.() ??
          0;
        const rightStart =
          rightHero.event.startsAt?.getTime() ??
          rightHero.event.createdAt?.getTime?.() ??
          0;

        return rightStart - leftStart;
      })[0] ?? null
    );
  }
}
