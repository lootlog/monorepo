import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { PrismaService } from "src/db/prisma.service";
import { RESPAWN_WINDOW_QUEUE } from "../constants/respawn-queue.constant";
import type { AutoCloseRespawnWindowJobData } from "../respawn-window.processor";
import type {
  CloseRespawnWindowOptions,
  OpenRespawnWindowOptions,
} from "../interfaces/respawn-window.interface";
import { EventEmitterService } from "./event-emitter.service";
import { EventKillService } from "./event-kill.service";
import { EventTrackingService } from "./event-tracking.service";
import { EventSummaryService } from "./event-summary.service";
import { getSyntheticNpcId } from "../utils/get-synthetic-npc-id";
import { TimersService } from "src/timers/timers.service";

@Injectable()
export class EventRespawnService {
  private readonly logger = new Logger(EventRespawnService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(RESPAWN_WINDOW_QUEUE)
    private readonly respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
    private readonly eventEmitter: EventEmitterService,
    private readonly killService: EventKillService,
    private readonly trackingService: EventTrackingService,
    private readonly summaryService: EventSummaryService,
    private readonly timersService: TimersService,
  ) {}

  async closeRespawnWindow(
    guildId: string,
    eventId: string,
    heroId: string,
    options: CloseRespawnWindowOptions = {},
  ): Promise<void> {
    const {
      createNewWindow = false,
      newMinSpawnTime,
      newMaxSpawnTime,
      isAutoClose = false,
    } = options;

    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: { id: heroId, event: { id: eventId, guildId } },
      include: {
        event: true,
        maps: {
          include: { assignedMembers: true },
        },
      },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const effectiveNpcId = hero.npcId ?? getSyntheticNpcId(heroId);

    this.logger.log({
      message: isAutoClose
        ? "Auto-closing respawn window"
        : "Manually closing respawn window",
      heroId,
      eventId,
      guildId,
      createNewWindow,
    });

    const timer = await this.timersService.getEventRespawnTimer({
      guildId,
      world: hero.event.world,
      npcId: effectiveNpcId,
      npcName: hero.npcName,
    });

    if (timer && isAutoClose) {
      const closedAt = new Date();

      try {
        await this.prisma.$transaction(async (tx) => {
          if (hero.maps.length > 0) {
            await Promise.all(
              hero.maps.map((map) =>
                tx.eventMap.update({
                  where: { id: map.id },
                  data: {
                    assignedMembers: { set: [] },
                  },
                }),
              ),
            );

            await tx.eventMapAssignmentHistory.updateMany({
              where: {
                mapId: { in: hero.maps.map((map) => map.id) },
                unassignedAt: null,
              },
              data: {
                unassignedAt: closedAt,
              },
            });
          }
        });

        await this.trackingService.closeAllGapsForHero(heroId);

        await this.summaryService.createWindowSummary(
          heroId,
          null,
          timer.windowOpenedAt ?? timer.minSpawnTime ?? closedAt,
          closedAt,
          timer.minSpawnTime,
          timer.maxSpawnTime,
          false,
        );
      } catch (err) {
        this.logger.error({
          message: "Failed to close auto respawn window without scoring",
          heroId,
          eventId,
          guildId,
          error: err instanceof Error ? err.message : err,
        });
        throw new InternalServerErrorException(
          "Window auto-closed but cleanup failed. Please contact support.",
        );
      }
    } else if (timer) {
      try {
        await this.killService.recordHeroKill(
          guildId,
          hero,
          hero.event,
          {
            minSpawnTime: timer.minSpawnTime,
            maxSpawnTime: timer.maxSpawnTime,
            memberId: timer.createdById,
            previousMinSpawnTime: timer.minSpawnTime,
            previousMaxSpawnTime: timer.maxSpawnTime,
            windowOpenedAt: timer.windowOpenedAt,
          },
          true,
        );
      } catch (err) {
        this.logger.error({
          message: "Failed to record hero kill on manual window close",
          heroId,
          eventId,
          guildId,
          error: err instanceof Error ? err.message : err,
        });
        throw new InternalServerErrorException(
          "Window closed but failed to record points. Please contact support.",
        );
      }
    }

    if (isAutoClose || !timer) {
      for (const map of hero.maps) {
        await this.eventEmitter.emitMapStatusUpdate(guildId, eventId, map.id);
      }
    }

    if (timer) {
      await this.timersService.closeEventRespawnTimer({
        guildId,
        world: hero.event.world,
        npcId: effectiveNpcId,
        npcName: hero.npcName,
      });
    }

    await this.cancelScheduledAutoClose(heroId);

    await this.eventEmitter.emitRespawnWindowClosed(guildId, eventId, heroId);

    if (createNewWindow) {
      await this.openRespawnWindow(guildId, eventId, heroId, {
        minSpawnTime: newMinSpawnTime!,
        maxSpawnTime: newMaxSpawnTime!,
      });
    }
  }

  async openRespawnWindow(
    guildId: string,
    eventId: string,
    heroId: string,
    options: OpenRespawnWindowOptions,
  ): Promise<{ minSpawnTime: Date; maxSpawnTime: Date }> {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: { id: heroId, event: { id: eventId, guildId } },
      include: { event: true },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const effectiveNpcId = hero.npcId ?? getSyntheticNpcId(heroId);

    const { minSpawnTime, maxSpawnTime } = options;

    this.logger.log({
      message: "Opening respawn window",
      heroId,
      eventId,
      guildId,
      minSpawnTime,
      maxSpawnTime,
    });

    const firstMember = await this.prisma.member.findFirst({
      where: { guildId },
      select: { id: true },
    });

    if (!firstMember) {
      throw new BadRequestException("No members found in guild");
    }

    const timer = await this.timersService.openEventRespawnTimer({
      guildId,
      world: hero.event.world,
      npcId: effectiveNpcId,
      npcName: hero.npcName,
      npcIcon: hero.npcIcon ?? null,
      minSpawnTime,
      maxSpawnTime,
      createdById: firstMember.id,
      isUsingSyntheticId: hero.npcId === null,
    });

    const windowOpenedAt = timer.windowOpenedAt ?? new Date();
    await this.cancelScheduledAutoClose(heroId);

    const heroMaps = await this.prisma.eventMap.findMany({
      where: { heroNpcId: heroId },
      include: {
        assignedMembers: true,
      },
    });

    let unassignedCount = 0;
    let uncoveredCount = 0;

    for (const map of heroMaps) {
      if (!map.assignedMembers || map.assignedMembers.length === 0) {
        await this.trackingService.openUnassignedGap(
          map.id,
          heroId,
          windowOpenedAt,
        );
        unassignedCount++;
      } else {
        await this.trackingService.openUncoveredGap(
          map.id,
          heroId,
          windowOpenedAt,
        );
        uncoveredCount++;
      }
    }

    this.logger.log({
      message: "Opened coverage gaps for hero maps",
      heroId,
      mapsCount: heroMaps.length,
      unassignedCount,
      uncoveredCount,
    });

    await this.eventEmitter.emitRespawnWindowOpened(guildId, eventId, heroId);

    for (const map of heroMaps) {
      await this.eventEmitter.emitMapStatusUpdate(guildId, eventId, map.id);
    }

    return { minSpawnTime, maxSpawnTime };
  }

  async getHeroRespawnConfig(
    guildId: string,
    eventId: string,
    heroId: string,
  ): Promise<{
    hasTimer: boolean;
    windowStatus: "OPEN" | "WAITING" | "OVERDUE" | "NONE";
    minSpawnTime: Date | null;
    maxSpawnTime: Date | null;
    overdueMs: number | null;
  }> {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: { id: heroId, event: { id: eventId, guildId } },
      include: { event: true },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const effectiveNpcId = hero.npcId ?? getSyntheticNpcId(heroId);

    const now = new Date();

    const timer = await this.timersService.getEventRespawnTimer({
      guildId,
      world: hero.event.world,
      npcId: effectiveNpcId,
      npcName: hero.npcName,
    });

    let windowStatus: "OPEN" | "WAITING" | "OVERDUE" | "NONE" = "NONE";
    let hasActiveTimer = false;
    let overdueMs: number | null = null;

    if (timer) {
      const minTime = new Date(timer.minSpawnTime);
      const maxTime = new Date(timer.maxSpawnTime);

      if (now >= minTime && now < maxTime) {
        windowStatus = "OPEN";
        hasActiveTimer = true;
      } else if (now < minTime) {
        windowStatus = "WAITING";
      } else if (now >= maxTime) {
        windowStatus = "OVERDUE";
        hasActiveTimer = true;
        overdueMs = Math.max(0, now.getTime() - maxTime.getTime());
      }
    }

    return {
      hasTimer: hasActiveTimer,
      windowStatus,
      minSpawnTime: timer?.minSpawnTime ?? null,
      maxSpawnTime: timer?.maxSpawnTime ?? null,
      overdueMs,
    };
  }

  private async cancelScheduledAutoClose(heroId: string): Promise<void> {
    const delayedJobs = await this.respawnWindowQueue.getJobs(["delayed"]);

    for (const job of delayedJobs) {
      if (job.data.heroId === heroId) {
        await job.remove();
        this.logger.log({
          message: "Cancelled scheduled auto-close job",
          heroId,
          jobId: job.id,
        });
      }
    }
  }
}
