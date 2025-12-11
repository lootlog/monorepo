import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CoverageGapType } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { EventEmitterService } from './event-emitter.service';
import type { PresenceLogWithMember } from '../interfaces/presence-log.interface';

/**
 * Service responsible for member assignments, presence tracking, and coverage gap management.
 * Handles who is where and tracks coverage gaps.
 */
@Injectable()
export class EventTrackingService {
  private readonly logger = new Logger(EventTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitterService,
  ) {}

  /**
   * Assign a member to track a specific map.
   */
  async assignMemberToMap(
    guildId: string,
    eventId: string,
    mapId: string,
    memberId: number,
  ) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          event: {
            id: eventId,
            guildId,
          },
        },
      },
      include: {
        assignedMembers: true,
        heroNpc: {
          include: {
            event: {
              select: {
                mapAssignmentCap: true,
              },
            },
          },
        },
      },
    });

    if (!map) {
      throw new NotFoundException('Map not found');
    }

    // Check map assignment cap
    const cap = map.heroNpc.event.mapAssignmentCap;
    if (cap && cap > 0 && map.assignedMembers.length >= cap) {
      throw new BadRequestException(
        `Map assignment limit reached (${cap} members max)`,
      );
    }

    const wasUnassigned = map.assignedMembers.length === 0;

    const updated = await this.prisma.eventMap.update({
      where: { id: mapId },
      data: {
        assignedMembers: {
          connect: { id: memberId },
        },
      },
      include: {
        assignedMembers: true,
      },
    });

    // Create assignment history record
    await this.prisma.eventMapAssignmentHistory.create({
      data: {
        mapId,
        heroNpcId: map.heroNpcId,
        memberId,
        assignedAt: new Date(),
      },
    });

    // Close UNASSIGNED gap if this is the first member being assigned
    if (wasUnassigned) {
      await this.closeUnassignedGap(mapId);
      // Open UNCOVERED gap since member is assigned but not yet on the map
      await this.openUncoveredGap(mapId, map.heroNpcId);
    }

    await this.eventEmitter.emitMapStatusUpdate(
      guildId,
      eventId,
      mapId,
      map.mapName,
    );

    return updated;
  }

  /**
   * Unassign a member from a map.
   */
  async unassignMemberFromMap(
    guildId: string,
    eventId: string,
    mapId: string,
    memberId?: number,
  ) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          event: {
            id: eventId,
            guildId,
          },
        },
      },
      include: {
        assignedMembers: true,
        heroNpc: true,
      },
    });

    if (!map) {
      throw new NotFoundException('Map not found');
    }

    // If memberId provided, disconnect specific member; otherwise disconnect all
    const updated = await this.prisma.eventMap.update({
      where: { id: mapId },
      data: {
        assignedMembers: memberId ? { disconnect: { id: memberId } } : { set: [] },
      },
      include: {
        assignedMembers: true,
      },
    });

    // Close assignment history records
    const now = new Date();
    if (memberId) {
      // Close specific member's assignment history
      await this.prisma.eventMapAssignmentHistory.updateMany({
        where: { mapId, memberId, unassignedAt: null },
        data: { unassignedAt: now },
      });
    } else {
      // Close all assignment history for this map
      await this.prisma.eventMapAssignmentHistory.updateMany({
        where: { mapId, unassignedAt: null },
        data: { unassignedAt: now },
      });
    }

    // Open UNASSIGNED gap if no members are left
    if (updated.assignedMembers.length === 0) {
      await this.openUnassignedGap(mapId, map.heroNpcId);
      // Also close any UNCOVERED gap since there's no one to cover
      await this.closeUncoveredGap(mapId);
    }

    await this.eventEmitter.emitMapStatusUpdate(
      guildId,
      eventId,
      mapId,
      map.mapName,
    );

    return updated;
  }

  /**
   * Update presence for a member on a map.
   */
  async updatePresence(
    guildId: string,
    eventId: string,
    memberId: number,
    mapName: string,
    isAfk: boolean,
  ): Promise<PresenceLogWithMember | null> {
    // Find the map for this event (now through heroNpc)
    const map = await this.prisma.eventMap.findFirst({
      where: {
        mapName,
        heroNpc: {
          event: {
            id: eventId,
            guildId,
          },
        },
      },
    });

    if (!map) {
      // Member is not on a tracked map
      return null;
    }

    // Close any existing open presence log for this member on this map
    await this.prisma.eventPresenceLog.updateMany({
      where: {
        mapId: map.id,
        memberId,
        endedAt: null,
      },
      data: {
        endedAt: new Date(),
      },
    });

    // Create new presence log
    const presenceLog = await this.prisma.eventPresenceLog.create({
      data: {
        mapId: map.id,
        memberId,
        isAfk,
      },
      include: {
        member: true,
      },
    });

    await this.eventEmitter.emitPresenceUpdate(guildId, eventId, map.id, presenceLog);

    return presenceLog;
  }

  /**
   * Get a member by their Discord ID.
   */
  async getMemberByDiscordId(discordId: string, guildId: string) {
    return this.prisma.member.findFirst({
      where: {
        userId: discordId,
        guildId,
        active: true,
      },
    });
  }

  // ========== COVERAGE GAP MANAGEMENT ==========

  /**
   * Open an UNASSIGNED gap when a map has no assigned members.
   * Called when the last member is unassigned from a map.
   */
  async openUnassignedGap(mapId: string, heroNpcId: string): Promise<void> {
    // Check if there's already an open UNASSIGNED gap
    const existingGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNASSIGNED,
        endedAt: null,
      },
    });

    if (existingGap) {
      return; // Gap already open
    }

    await this.prisma.eventMapCoverageGap.create({
      data: {
        mapId,
        heroNpcId,
        gapType: CoverageGapType.UNASSIGNED,
        startedAt: new Date(),
      },
    });

    this.logger.debug({
      message: 'Opened UNASSIGNED gap',
      mapId,
      heroNpcId,
    });
  }

  /**
   * Close an UNASSIGNED gap when a member is assigned to a map.
   */
  async closeUnassignedGap(mapId: string): Promise<void> {
    const now = new Date();

    const openGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNASSIGNED,
        endedAt: null,
      },
    });

    if (!openGap) {
      return;
    }

    const durationSeconds = Math.round(
      (now.getTime() - openGap.startedAt.getTime()) / 1000,
    );

    await this.prisma.eventMapCoverageGap.update({
      where: { id: openGap.id },
      data: {
        endedAt: now,
        durationSeconds,
      },
    });

    this.logger.debug({
      message: 'Closed UNASSIGNED gap',
      mapId,
      durationSeconds,
    });
  }

  /**
   * Open an UNCOVERED gap when no players are present on a map with assigned members.
   */
  async openUncoveredGap(mapId: string, heroNpcId: string): Promise<void> {
    // Check if there's already an open UNCOVERED gap
    const existingGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNCOVERED,
        endedAt: null,
      },
    });

    if (existingGap) {
      return; // Gap already open
    }

    await this.prisma.eventMapCoverageGap.create({
      data: {
        mapId,
        heroNpcId,
        gapType: CoverageGapType.UNCOVERED,
        startedAt: new Date(),
      },
    });

    this.logger.debug({
      message: 'Opened UNCOVERED gap',
      mapId,
      heroNpcId,
    });
  }

  /**
   * Close an UNCOVERED gap when a player arrives on the map.
   */
  async closeUncoveredGap(mapId: string): Promise<void> {
    const now = new Date();

    const openGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNCOVERED,
        endedAt: null,
      },
    });

    if (!openGap) {
      return;
    }

    const durationSeconds = Math.round(
      (now.getTime() - openGap.startedAt.getTime()) / 1000,
    );

    await this.prisma.eventMapCoverageGap.update({
      where: { id: openGap.id },
      data: {
        endedAt: now,
        durationSeconds,
      },
    });

    this.logger.debug({
      message: 'Closed UNCOVERED gap',
      mapId,
      durationSeconds,
    });
  }

  /**
   * Close all open gaps for a hero when killed.
   */
  async closeAllGapsForHero(heroNpcId: string): Promise<void> {
    const now = new Date();

    const openGaps = await this.prisma.eventMapCoverageGap.findMany({
      where: {
        heroNpcId,
        endedAt: null,
      },
    });

    for (const gap of openGaps) {
      const durationSeconds = Math.round(
        (now.getTime() - gap.startedAt.getTime()) / 1000,
      );

      await this.prisma.eventMapCoverageGap.update({
        where: { id: gap.id },
        data: {
          endedAt: now,
          durationSeconds,
        },
      });
    }

    this.logger.debug({
      message: 'Closed all gaps for hero',
      heroNpcId,
      closedCount: openGaps.length,
    });
  }

  /**
   * Get coverage gaps for a specific map.
   */
  async getMapCoverageGaps(mapId: string) {
    return this.prisma.eventMapCoverageGap.findMany({
      where: { mapId },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Get coverage gaps for a hero (all maps).
   */
  async getHeroCoverageGaps(heroNpcId: string) {
    return this.prisma.eventMapCoverageGap.findMany({
      where: { heroNpcId },
      orderBy: { startedAt: 'desc' },
      include: {
        map: {
          select: {
            mapName: true,
            mapId: true,
          },
        },
      },
    });
  }

  /**
   * Get active (ongoing) gap for a map.
   */
  async getActiveGapForMap(mapId: string) {
    return this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        endedAt: null,
      },
    });
  }

  /**
   * Get all active (ongoing) gaps for a hero.
   * Returns all gaps where endedAt is null for all maps of this hero.
   */
  async getActiveGapsForHero(heroNpcId: string) {
    return this.prisma.eventMapCoverageGap.findMany({
      where: {
        heroNpcId,
        endedAt: null,
      },
    });
  }

  /**
   * Handle coverage gap logic when presence changes.
   * Called from the gateway handler when a player changes maps.
   * AFK players don't count as coverage - only active players close the gap.
   */
  async handlePresenceCoverageCheck(
    guildId: string,
    mapName: string,
    _discordId: string,
    hasPlayer: boolean,
    isAfk = false,
  ): Promise<void> {
    // Find all event maps with this name in active events for this guild
    const eventMaps = await this.prisma.eventMap.findMany({
      where: {
        mapName,
        heroNpc: {
          event: {
            guildId,
            active: true,
          },
        },
      },
      include: {
        assignedMembers: true,
        heroNpc: true,
      },
    });

    for (const map of eventMaps) {
      const hasAssignedMembers = map.assignedMembers.length > 0;

      if (!hasAssignedMembers) {
        // No assigned members - UNASSIGNED gap should be open
        // (handled in assign/unassign methods)
        continue;
      }

      // Map has assigned members - check UNCOVERED gap
      if (hasPlayer) {
        if (isAfk) {
          // AFK player doesn't count as coverage
          // Check if there are any other active (non-AFK) players
          const activeNonAfkPlayers = await this.getActiveNonAfkPlayersOnMap(
            map.id,
          );
          if (activeNonAfkPlayers.length === 0) {
            // No active players - open UNCOVERED gap
            await this.openUncoveredGap(map.id, map.heroNpcId);
          }
        } else {
          // Active player arrived - close UNCOVERED gap if open
          await this.closeUncoveredGap(map.id);
        }
        // Emit map status update to refresh frontend
        await this.eventEmitter.emitMapStatusUpdate(
          guildId,
          map.heroNpc.eventId,
          map.id,
          map.mapName,
        );
      } else {
        // Player left - check if map is now uncovered
        // We need to check if any other active (non-AFK) players are still on this map
        const activeNonAfkPlayers = await this.getActiveNonAfkPlayersOnMap(
          map.id,
        );

        if (activeNonAfkPlayers.length === 0) {
          // No active players on the map - open UNCOVERED gap
          await this.openUncoveredGap(map.id, map.heroNpcId);
          // Emit map status update to refresh frontend
          await this.eventEmitter.emitMapStatusUpdate(
            guildId,
            map.heroNpc.eventId,
            map.id,
            map.mapName,
          );
        }
      }
    }
  }

  /**
   * Get active non-AFK players on a map (from presence logs).
   * Used for coverage gap logic - AFK players don't count as coverage.
   */
  async getActiveNonAfkPlayersOnMap(mapId: string): Promise<number[]> {
    const activeLogs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId,
        endedAt: null,
        isAfk: false,
      },
      select: {
        memberId: true,
      },
      distinct: ['memberId'],
    });

    return activeLogs.map((log) => log.memberId);
  }

  /**
   * Get count of active players on a map (from presence logs).
   */
  async getActivePlayersOnMap(mapId: string): Promise<number[]> {
    const activeLogs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId,
        endedAt: null,
      },
      select: {
        memberId: true,
      },
      distinct: ['memberId'],
    });

    return activeLogs.map((log) => log.memberId);
  }
}
