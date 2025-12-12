import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { Prisma } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { RESPAWN_WINDOW_QUEUE } from '../constants/respawn-queue.constant';
import type { AutoCloseRespawnWindowJobData } from '../respawn-window.processor';
import type {
  CloseRespawnWindowOptions,
  OpenRespawnWindowOptions,
} from '../interfaces/respawn-window.interface';
import { EventEmitterService } from './event-emitter.service';
import { EventKillService } from './event-kill.service';
import { EventTrackingService } from './event-tracking.service';

// Default respawn randomness when creating new timers
const DEFAULT_RESP_RANDOMNESS = 20; // 20%

/**
 * Generate synthetic negative npcId from heroId for heroes without real npcId.
 * Uses negative values to avoid collision with real Margonem NPC IDs.
 */
function getSyntheticNpcId(heroId: string): number {
  let hash = 0;
  for (let i = 0; i < heroId.length; i++) {
    hash = ((hash << 5) - hash) + heroId.charCodeAt(i);
    hash |= 0;
  }
  return -Math.abs(hash || 1);
}

/**
 * Service responsible for respawn window lifecycle management.
 * Handles opening, closing, and scheduling respawn windows for event heroes.
 */
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
  ) {}

  /**
   * Close a respawn window for an event hero.
   * Optionally creates a new respawn window.
   */
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

    // Get hero with event info
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

    // Use real npcId if available, otherwise generate synthetic ID from heroId
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

    // 1. Fetch the timer before deleting (needed for recording kill)
    const timer = await this.prisma.timer.findUnique({
      where: {
        timerId: {
          guildId,
          world: hero.event.world,
          npcId: effectiveNpcId,
        },
      },
    });

    // 2. Clear all map assignments for this hero
    for (const map of hero.maps) {
      if (map.assignedMembers.length > 0) {
        await this.prisma.eventMap.update({
          where: { id: map.id },
          data: { assignedMembers: { set: [] } },
        });
        await this.eventEmitter.emitMapStatusUpdate(
          guildId,
          eventId,
          map.id,
          map.mapName,
        );
      }
    }

    // 3. Close all coverage gaps for this hero
    await this.trackingService.closeAllGapsForHero(heroId);

    // 4. Delete the timer
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
        // Timer might have been deleted in the meantime, that's okay
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

    // 5. Cancel any scheduled auto-close job
    await this.cancelScheduledAutoClose(heroId);

    // 6. Emit respawn window closed event
    await this.eventEmitter.emitRespawnWindowClosed(guildId, eventId, heroId);

    // 7. Record hero "kill" for points calculation (manual close only)
    // Even if hero wasn't actually killed, players deserve points for their effort
    if (!isAutoClose && timer) {
      this.killService
        .checkAndRecordEventHeroKill(
          guildId,
          hero.event.world,
          effectiveNpcId,
          hero.npcName,
          hero.npcIcon ?? '',
          {
            minSpawnTime: timer.minSpawnTime,
            maxSpawnTime: timer.maxSpawnTime,
            memberId: timer.createdById,
            previousMinSpawnTime: timer.minSpawnTime,
            previousMaxSpawnTime: timer.maxSpawnTime,
          },
          true, // isManualClose
        )
        .catch((err) => {
          this.logger.error({
            message: 'Failed to record hero kill on manual window close',
            heroId,
            eventId,
            guildId,
            error: err instanceof Error ? err.message : err,
          });
        });
    }

    // 8. Optionally create a new respawn window
    if (createNewWindow) {
      await this.openRespawnWindow(guildId, eventId, heroId, {
        minSpawnTime: newMinSpawnTime!,
        maxSpawnTime: newMaxSpawnTime!,
      });
    }
  }

  /**
   * Open a new respawn window for an event hero.
   */
  async openRespawnWindow(
    guildId: string,
    eventId: string,
    heroId: string,
    options: OpenRespawnWindowOptions,
  ): Promise<{ minSpawnTime: Date; maxSpawnTime: Date }> {
    // Get hero with event info
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: { id: heroId, event: { id: eventId, guildId } },
      include: { event: true },
    });

    if (!hero) {
      throw new NotFoundException('Hero not found');
    }

    // Use real npcId if available, otherwise generate synthetic ID from heroId
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

    // Get the first member from the guild to use as timer creator (system action)
    const firstMember = await this.prisma.member.findFirst({
      where: { guildId },
      select: { id: true },
    });

    if (!firstMember) {
      throw new BadRequestException('No members found in guild');
    }

    // Create or update the timer
    const npcData = {
      id: effectiveNpcId,
      name: hero.npcName,
      prof: '',
      location: '',
      wt: '',
      lvl: 0,
      type: 'hero',
      icon: hero.npcIcon || '',
      margonemType: '0',
    };

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
      },
      update: {
        minSpawnTime,
        maxSpawnTime,
        wasReset: false,
        npc: npcData,
      },
      include: {
        member: true,
      },
    });

    // Schedule auto-close at maxSpawnTime
    await this.scheduleAutoClose(
      guildId,
      eventId,
      heroId,
      effectiveNpcId,
      hero.event.world,
      maxSpawnTime,
    );

    // Open coverage gaps for all hero maps
    // When manually opening a respawn window, we assume no one is on any map yet
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
        // No assigned members - open UNASSIGNED gap
        await this.trackingService.openUnassignedGap(map.id, heroId);
        unassignedCount++;
      } else {
        // Has assigned members but no one on map yet - open UNCOVERED gap
        await this.trackingService.openUncoveredGap(map.id, heroId);
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

    // Emit respawn window opened event
    await this.eventEmitter.emitRespawnWindowOpened(guildId, eventId, heroId);

    // Trigger presence check for each map
    // This will close UNCOVERED gaps if players are already on the maps
    for (const map of heroMaps) {
      await this.eventEmitter.emitMapStatusUpdate(
        guildId,
        eventId,
        map.id,
        map.mapName,
      );
    }

    // Emit timer update with full timer data (including member and npc)
    await this.eventEmitter.emitTimerUpdate(timer);

    return { minSpawnTime, maxSpawnTime };
  }

  /**
   * Get hero's respawn configuration for frontend display.
   */
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

    // Use real npcId if available, otherwise generate synthetic ID from heroId
    const effectiveNpcId = hero.npcId ?? getSyntheticNpcId(heroId);

    const now = new Date();

    // Check for active timer
    const timer = await this.prisma.timer.findUnique({
      where: {
        timerId: {
          guildId,
          world: hero.event.world,
          npcId: effectiveNpcId,
        },
      },
    });

    // Determine window status:
    // OPEN - between min and max spawn time (mob can respawn any moment)
    // WAITING - timer exists but before minSpawnTime (waiting for window to open)
    // NONE - no timer or timer expired
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
      // else: timer expired, windowStatus stays 'NONE'
    }

    return {
      hasTimer: hasActiveTimer,
      windowStatus,
      minSpawnTime: timer?.minSpawnTime ?? null,
      maxSpawnTime: timer?.maxSpawnTime ?? null,
    };
  }

  /**
   * Schedule an auto-close job for a respawn window.
   */
  private async scheduleAutoClose(
    guildId: string,
    eventId: string,
    heroId: string,
    npcId: number,
    world: string,
    maxSpawnTime: Date,
  ): Promise<void> {
    const delay = maxSpawnTime.getTime() - Date.now();

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
    });
  }

  /**
   * Cancel a scheduled auto-close job.
   */
  private async cancelScheduledAutoClose(heroId: string): Promise<void> {
    // Get all delayed jobs and find the one for this hero
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

  /**
   * Get job ID for auto-close job.
   */
  private getAutoCloseJobId(heroId: string, maxSpawnTime: Date): string {
    return `respawn-close-${heroId}-${maxSpawnTime.getTime()}`;
  }
}
