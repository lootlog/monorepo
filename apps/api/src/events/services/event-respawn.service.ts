import { and } from "@prisma/orm-family-sql/orm-client";
import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { PrismaService } from "#src/db/prisma.service";
import {
  attachAssignedMembersToMaps,
  setMapAssignedMembers,
} from "../event-map-members.repository.js";
import { RESPAWN_WINDOW_QUEUE } from "../constants/respawn-queue.constant.js";
import type { AutoCloseRespawnWindowJobData } from "../interfaces/auto-close-respawn-window-job-data.js";
import type {
  CloseRespawnWindowOptions,
  OpenRespawnWindowOptions,
} from "../interfaces/respawn-window.interface.js";
import { EventEmitterService } from "./event-emitter.service.js";
import { EventKillService } from "./event-kill.service.js";
import { EventReadCacheService } from "./event-read-cache.service.js";
import { EventTrackingService } from "./event-tracking.service.js";
import { EventSummaryService } from "./event-summary.service.js";
import { getSyntheticNpcId } from "../utils/get-synthetic-npc-id.js";
import { TimersService } from "#src/timers/timers.service";
import { dateToTemporal, temporalToDate } from "#src/db/temporal";

const normalizeCloseRespawnWindowOptions = (
  options: CloseRespawnWindowOptions,
) => ({
  ...options,
  createNewWindow: options.createNewWindow ?? false,
  isAutoClose: options.isAutoClose ?? false,
});

const getRespawnWindowCloseLogMessage = (isAutoClose: boolean): string =>
  isAutoClose
    ? "Auto-closing respawn window"
    : "Manually closing respawn window";

@Injectable()
export class EventRespawnService {
  private readonly logger = new Logger(EventRespawnService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(RESPAWN_WINDOW_QUEUE)
    private readonly respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
    private readonly eventEmitter: EventEmitterService,
    private readonly killService: EventKillService,
    private readonly eventReadCache: EventReadCacheService,
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
    const { createNewWindow, newMinSpawnTime, newMaxSpawnTime, isAutoClose } =
      normalizeCloseRespawnWindowOptions(options);

    const heroRow = await this.prisma.db.orm.public.EventHeroNpc.where((row) =>
      and(
        row.id.eq(heroId),
        row.event.some((related) =>
          and(related.id.eq(eventId), related.guildId.eq(guildId)),
        ),
      ),
    )
      .include("event")
      .include("maps")
      .first();
    const hero = heroRow
      ? {
          ...heroRow,
          maps: await attachAssignedMembersToMaps(this.prisma.db, heroRow.maps),
        }
      : null;

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const effectiveNpcId = hero.npcId ?? getSyntheticNpcId(heroId);

    this.logger.log({
      message: getRespawnWindowCloseLogMessage(isAutoClose),
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
        await this.prisma.db.transaction(async (tx) => {
          if (hero.maps.length > 0) {
            for (const map of hero.maps) {
              await setMapAssignedMembers(tx, map.id, []);
            }

            await tx.orm.public.EventMapAssignmentHistory.where((row) =>
              and(
                row.mapId.in(hero.maps.map((map) => map.id)),
                row.unassignedAt.isNull(),
              ),
            ).updateAndCount({
              unassignedAt: dateToTemporal(closedAt),
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
      } catch (error) {
        this.logger.error({
          message: "Failed to close auto respawn window without scoring",
          heroId,
          eventId,
          guildId,
          error: error instanceof Error ? error.message : error,
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
            minSpawnTime: temporalToDate(timer.minSpawnTime),
            maxSpawnTime: temporalToDate(timer.maxSpawnTime),
            memberId: timer.createdById,
            previousMinSpawnTime: temporalToDate(timer.minSpawnTime),
            previousMaxSpawnTime: temporalToDate(timer.maxSpawnTime),
            windowOpenedAt: temporalToDate(timer.windowOpenedAt),
          },
          true,
        );
      } catch (error) {
        this.logger.error({
          message: "Failed to record hero kill on manual window close",
          heroId,
          eventId,
          guildId,
          error: error instanceof Error ? error.message : error,
        });
        throw new InternalServerErrorException(
          "Window closed but failed to record points. Please contact support.",
        );
      }
    }

    if (isAutoClose || !timer) {
      await Promise.all(
        hero.maps.map((map) =>
          this.eventEmitter.emitMapStatusUpdate(guildId, eventId, map.id),
        ),
      );
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

    await this.eventReadCache.invalidateEvent(guildId, eventId);
    await this.eventEmitter.emitRespawnWindowClosed(guildId, eventId, heroId);

    if (createNewWindow) {
      if (!newMinSpawnTime || !newMaxSpawnTime) {
        throw new InternalServerErrorException(
          "Missing spawn window bounds for new window",
        );
      }

      await this.openRespawnWindow(guildId, eventId, heroId, {
        minSpawnTime: newMinSpawnTime,
        maxSpawnTime: newMaxSpawnTime,
      });
    }
  }

  async openRespawnWindow(
    guildId: string,
    eventId: string,
    heroId: string,
    options: OpenRespawnWindowOptions,
  ): Promise<{ minSpawnTime: Date; maxSpawnTime: Date }> {
    const hero = await this.prisma.db.orm.public.EventHeroNpc.where((row) =>
      and(
        row.id.eq(heroId),
        row.event.some((related) =>
          and(related.id.eq(eventId), related.guildId.eq(guildId)),
        ),
      ),
    )
      .include("event")
      .first();

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

    const firstMember = await this.prisma.db.orm.public.Member.where((row) =>
      row.guildId.eq(guildId),
    )
      .select("id")
      .first();

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

    const heroMapRows = await this.prisma.db.orm.public.EventMap.where((row) =>
      row.heroNpcId.eq(heroId),
    ).all();
    const heroMaps = await attachAssignedMembersToMaps(
      this.prisma.db,
      heroMapRows,
    );

    const gapResults = await Promise.all(
      heroMaps.map(async (map) => {
        if (!map.assignedMembers || map.assignedMembers.length === 0) {
          await this.trackingService.openUnassignedGap(
            map.id,
            heroId,
            windowOpenedAt,
          );
          return { unassigned: 1, uncovered: 0 };
        }

        await this.trackingService.openUncoveredGap(
          map.id,
          heroId,
          windowOpenedAt,
        );
        return { unassigned: 0, uncovered: 1 };
      }),
    );

    const unassignedCount = gapResults.reduce(
      (count, result) => count + result.unassigned,
      0,
    );
    const uncoveredCount = gapResults.reduce(
      (count, result) => count + result.uncovered,
      0,
    );

    this.logger.log({
      message: "Opened coverage gaps for hero maps",
      heroId,
      mapsCount: heroMaps.length,
      unassignedCount,
      uncoveredCount,
    });

    await this.eventReadCache.invalidateEvent(guildId, eventId);
    await this.eventEmitter.emitRespawnWindowOpened(guildId, eventId, heroId);

    await Promise.all(
      heroMaps.map((map) =>
        this.eventEmitter.emitMapStatusUpdate(guildId, eventId, map.id),
      ),
    );

    return { minSpawnTime, maxSpawnTime };
  }

  getHeroRespawnConfig(
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
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getEventKey(guildId, eventId, "hero-respawn-config", {
        heroId,
      }),
      () => this.getHeroRespawnConfigUncached(guildId, eventId, heroId),
    );
  }

  private async getHeroRespawnConfigUncached(
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
    const hero = await this.prisma.db.orm.public.EventHeroNpc.where((row) =>
      and(
        row.id.eq(heroId),
        row.event.some((related) =>
          and(related.id.eq(eventId), related.guildId.eq(guildId)),
        ),
      ),
    )
      .include("event")
      .first();

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
    const minSpawnTime = timer ? temporalToDate(timer.minSpawnTime) : null;
    const maxSpawnTime = timer ? temporalToDate(timer.maxSpawnTime) : null;

    if (minSpawnTime && maxSpawnTime) {
      if (now >= minSpawnTime && now < maxSpawnTime) {
        windowStatus = "OPEN";
        hasActiveTimer = true;
      } else if (now < minSpawnTime) {
        windowStatus = "WAITING";
      } else if (now >= maxSpawnTime) {
        windowStatus = "OVERDUE";
        hasActiveTimer = true;
        overdueMs = Math.max(0, now.getTime() - maxSpawnTime.getTime());
      }
    }

    return {
      hasTimer: hasActiveTimer,
      windowStatus,
      minSpawnTime,
      maxSpawnTime,
      overdueMs,
    };
  }

  private async cancelScheduledAutoClose(heroId: string): Promise<void> {
    const delayedJobs = await this.respawnWindowQueue.getJobs(["delayed"]);

    await Promise.all(
      delayedJobs
        .filter((job) => job.data.heroId === heroId)
        .map(async (job) => {
          await job.remove();
          this.logger.log({
            message: "Cancelled scheduled auto-close job",
            heroId,
            jobId: job.id,
          });
        }),
    );
  }
}
