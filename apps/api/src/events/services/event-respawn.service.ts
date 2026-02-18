import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { Prisma } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { TIMER_TYPES } from 'src/timers/constants/timer-limits';
import { RESPAWN_WINDOW_QUEUE } from '../constants/respawn-queue.constant';
import type { AutoCloseRespawnWindowJobData } from '../respawn-window.processor';
import type {
  CloseRespawnWindowOptions,
  OpenRespawnWindowOptions,
} from '../interfaces/respawn-window.interface';
import { EventEmitterService } from './event-emitter.service';
import { EventKillService } from './event-kill.service';
import { EventTrackingService } from './event-tracking.service';
import { EventSummaryService } from './event-summary.service';
import { getSyntheticNpcId } from '../utils/get-synthetic-npc-id';

const DEFAULT_RESP_RANDOMNESS = 20;

const AUTO_CLOSE_BUFFER_MS = 5 * 60 * 1000;

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
      throw new NotFoundException('Hero not found');
    }

    const effectiveNpcId = hero.npcId ?? getSyntheticNpcId(heroId);

    this.logger.log({
      message: isAutoClose
        ? 'Auto-closing respawn window'
        : 'Manually closing respawn window',
      heroId,
      eventId,
      guildId,
      createNewWindow,
    });

    const timer = await this.prisma.timer.findUnique({
      where: {
        timerId: {
          guildId,
          world: hero.event.world,
          npcId: effectiveNpcId,
        },
      },
    });

    if (timer) {
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
          !isAutoClose,
        );
      } catch (err) {
        this.logger.error({
          message: `Failed to record hero kill on ${isAutoClose ? 'auto' : 'manual'} window close`,
          heroId,
          eventId,
          guildId,
          error: err instanceof Error ? err.message : err,
        });
        throw new InternalServerErrorException(
          'Window closed but failed to record points. Please contact support.',
        );
      }
    }

    for (const map of hero.maps) {
      if (map.assignedMembers.length > 0) {
        await this.eventEmitter.emitMapStatusUpdate(
          guildId,
          eventId,
          map.id,
          map.mapName,
        );
      }
    }

    if (timer) {
      try {
        await this.prisma.timer.delete({
          where: {
            timerId: {
              guildId,
              world: hero.event.world,
              npcId: effectiveNpcId,
            },
          },
        });
      } catch (error) {
        if (
          !(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
          )
        ) {
          throw error;
        }
      }
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
      throw new NotFoundException('Hero not found');
    }

    const effectiveNpcId = hero.npcId ?? getSyntheticNpcId(heroId);

    const { minSpawnTime, maxSpawnTime } = options;

    this.logger.log({
      message: 'Opening respawn window',
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
      throw new BadRequestException('No members found in guild');
    }

    const isUsingSyntheticId = hero.npcId === null;
    const npcData = {
      id: effectiveNpcId,
      name: hero.npcName,
      prof: '',
      location: '',
      wt: '',
      lvl: 0,
      type: 'hero',
      icon: hero.npcIcon || '',
      margonemType: isUsingSyntheticId
        ? String(TIMER_TYPES.CUSTOM_MANUAL)
        : '0',
    };

    const windowOpenedAt = new Date();
    const timer = await this.prisma.timer.upsert({
      where: {
        timerId: {
          guildId,
          world: hero.event.world,
          npcId: effectiveNpcId,
        },
      },
      create: {
        guildId,
        createdById: firstMember.id,
        world: hero.event.world,
        npcId: effectiveNpcId,
        minSpawnTime,
        maxSpawnTime,
        latestRespBaseSeconds: Math.round(
          (maxSpawnTime.getTime() - minSpawnTime.getTime()) / 2000,
        ),
        latestRespawnRandomness: DEFAULT_RESP_RANDOMNESS,
        wasReset: false,
        npc: npcData,
        windowOpenedAt,
      },
      update: {
        minSpawnTime,
        maxSpawnTime,
        wasReset: false,
        npc: npcData,
        windowOpenedAt,
      },
      include: {
        member: true,
      },
    });

    await this.scheduleAutoClose(
      guildId,
      eventId,
      heroId,
      effectiveNpcId,
      hero.event.world,
      maxSpawnTime,
    );

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
      message: 'Opened coverage gaps for hero maps',
      heroId,
      mapsCount: heroMaps.length,
      unassignedCount,
      uncoveredCount,
    });

    await this.eventEmitter.emitRespawnWindowOpened(guildId, eventId, heroId);

    for (const map of heroMaps) {
      await this.eventEmitter.emitMapStatusUpdate(
        guildId,
        eventId,
        map.id,
        map.mapName,
      );
    }

    await this.eventEmitter.emitTimerUpdate(timer);

    return { minSpawnTime, maxSpawnTime };
  }

  async getHeroRespawnConfig(
    guildId: string,
    eventId: string,
    heroId: string,
  ): Promise<{
    hasTimer: boolean;
    windowStatus: 'OPEN' | 'WAITING' | 'NONE';
    minSpawnTime: Date | null;
    maxSpawnTime: Date | null;
  }> {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: { id: heroId, event: { id: eventId, guildId } },
      include: { event: true },
    });

    if (!hero) {
      throw new NotFoundException('Hero not found');
    }

    const effectiveNpcId = hero.npcId ?? getSyntheticNpcId(heroId);

    const now = new Date();

    const timer = await this.prisma.timer.findUnique({
      where: {
        timerId: {
          guildId,
          world: hero.event.world,
          npcId: effectiveNpcId,
        },
      },
    });

    let windowStatus: 'OPEN' | 'WAITING' | 'NONE' = 'NONE';
    let hasActiveTimer = false;

    if (timer) {
      const minTime = new Date(timer.minSpawnTime);
      const maxTime = new Date(timer.maxSpawnTime);

      if (now >= minTime && now < maxTime) {
        windowStatus = 'OPEN';
        hasActiveTimer = true;
      } else if (now < minTime) {
        windowStatus = 'WAITING';
      }
    }

    return {
      hasTimer: hasActiveTimer,
      windowStatus,
      minSpawnTime: timer?.minSpawnTime ?? null,
      maxSpawnTime: timer?.maxSpawnTime ?? null,
    };
  }

  private async scheduleAutoClose(
    guildId: string,
    eventId: string,
    heroId: string,
    npcId: number,
    world: string,
    maxSpawnTime: Date,
  ): Promise<void> {
    const delay = maxSpawnTime.getTime() - Date.now() + AUTO_CLOSE_BUFFER_MS;

    if (delay <= 0) {
      this.logger.warn({
        message: 'maxSpawnTime is in the past, skipping auto-close scheduling',
        heroId,
        maxSpawnTime,
      });
      return;
    }

    const jobId = this.getAutoCloseJobId(heroId, maxSpawnTime);

    await this.respawnWindowQueue.add(
      'auto-close-respawn-window',
      { guildId, eventId, heroId, npcId, world },
      {
        delay,
        jobId,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    this.logger.log({
      message: 'Scheduled auto-close job',
      heroId,
      jobId,
      delay,
      maxSpawnTime,
      bufferMs: AUTO_CLOSE_BUFFER_MS,
    });
  }

  private async cancelScheduledAutoClose(heroId: string): Promise<void> {
    const delayedJobs = await this.respawnWindowQueue.getJobs(['delayed']);

    for (const job of delayedJobs) {
      if (job.data.heroId === heroId) {
        await job.remove();
        this.logger.log({
          message: 'Cancelled scheduled auto-close job',
          heroId,
          jobId: job.id,
        });
      }
    }
  }

  private getAutoCloseJobId(heroId: string, maxSpawnTime: Date): string {
    return `respawn-close-${heroId}-${maxSpawnTime.getTime()}`;
  }
}
