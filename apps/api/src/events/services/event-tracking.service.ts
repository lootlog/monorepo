import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import Redlock, { ExecutionError } from 'redlock';
import { CoverageGapType } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { RedisService } from 'src/lib/redis/redis.service';
import { EventEmitterService } from './event-emitter.service';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';

/**
 * Service responsible for member assignments, presence tracking, and coverage gap management.
 * Handles who is where and tracks coverage gaps.
 */
@Injectable()
export class EventTrackingService implements OnModuleInit {
  private readonly logger = new Logger(EventTrackingService.name);
  private redlock: Redlock;
  private readonly presenceLockTtl = 5000; // 5 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitterService,
    private readonly amqpConnection: AmqpConnection,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    const client = await this.redis.getClient();
    this.redlock = new Redlock([client], {
      driftFactor: 0.01,
      retryCount: 3,
      retryDelay: 100,
      retryJitter: 50,
    });
  }

  private getPresenceLockKey(guildId: string, mapName: string, discordId: string): string {
    return `presence:lock:${guildId}:${mapName}:${discordId}`;
  }

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

    // Idempotency check - skip if member is already assigned
    const isAlreadyAssigned = map.assignedMembers.some((m) => m.id === memberId);
    if (isAlreadyAssigned) {
      this.logger.debug({
        message: 'Member already assigned to map, skipping',
        mapId,
        memberId,
      });
      return await this.prisma.eventMap.findUnique({
        where: { id: mapId },
        include: { assignedMembers: true },
      });
    }

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

    // Idempotency check - don't create duplicate assignment history
    const existingOpenAssignment =
      await this.prisma.eventMapAssignmentHistory.findFirst({
        where: {
          mapId,
          memberId,
          unassignedAt: null,
        },
      });

    if (!existingOpenAssignment) {
      // Create assignment history record only if no open assignment exists
      await this.prisma.eventMapAssignmentHistory.create({
        data: {
          mapId,
          heroNpcId: map.heroNpcId,
          memberId,
          assignedAt: new Date(),
        },
      });
    }

    // Close UNASSIGNED gap if this is the first member being assigned
    if (wasUnassigned) {
      await this.closeUnassignedGap(mapId);
      // Open UNCOVERED gap since member is assigned but not yet on the map
      await this.openUncoveredGap(mapId, map.heroNpcId);
      // Request gateway to check if anyone is already on this map
      // If so, the gap will be closed by the PRESENCE_COVERAGE_CHECK response
      this.amqpConnection.publish(DEFAULT_EXCHANGE_NAME, RoutingKey.PRESENCE_CHECK_REQUEST, {
        guildId,
        mapName: map.mapName,
      });
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
   * @param startedAt Optional start time for the gap. If not provided, uses current time.
   */
  async openUnassignedGap(
    mapId: string,
    heroNpcId: string,
    startedAt?: Date,
  ): Promise<void> {
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
        startedAt: startedAt ?? new Date(),
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
   * @param startedAt Optional start time for the gap. If not provided, uses current time.
   */
  async openUncoveredGap(
    mapId: string,
    heroNpcId: string,
    startedAt?: Date,
  ): Promise<void> {
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
        startedAt: startedAt ?? new Date(),
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
   * Uses a transaction for atomicity - prevents race conditions where
   * a presence event might open a new gap during sequential updates.
   */
  async closeAllGapsForHero(heroNpcId: string): Promise<void> {
    const now = new Date();

    const openGaps = await this.prisma.eventMapCoverageGap.findMany({
      where: {
        heroNpcId,
        endedAt: null,
      },
    });

    if (openGaps.length === 0) {
      return;
    }

    // Atomic operation - all gaps closed in a single transaction
    await this.prisma.$transaction(
      openGaps.map((gap) => {
        const durationSeconds = Math.round(
          (now.getTime() - gap.startedAt.getTime()) / 1000,
        );
        return this.prisma.eventMapCoverageGap.update({
          where: { id: gap.id },
          data: {
            endedAt: now,
            durationSeconds,
          },
        });
      }),
    );

    this.logger.debug({
      message: 'Closed all gaps for hero',
      heroNpcId,
      closedCount: openGaps.length,
    });
  }

  /**
   * Get coverage gaps for a specific map.
   * Validates that the map belongs to the specified guild and event.
   */
  async getMapCoverageGaps(guildId: string, eventId: string, mapId: string) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
    });

    if (!map) {
      throw new NotFoundException('Map not found');
    }

    return this.prisma.eventMapCoverageGap.findMany({
      where: { mapId },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Get coverage gaps for a hero (all maps).
   * Validates that the hero belongs to the specified guild and event.
   */
  async getHeroCoverageGaps(guildId: string, eventId: string, heroNpcId: string) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroNpcId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException('Hero not found');
    }

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
   * Validates that the map belongs to the specified guild and event.
   */
  async getActiveGapForMap(guildId: string, eventId: string, mapId: string) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
    });

    if (!map) {
      throw new NotFoundException('Map not found');
    }

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
   * Validates that the hero belongs to the specified guild and event.
   */
  async getActiveGapsForHero(guildId: string, eventId: string, heroNpcId: string) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroNpcId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException('Hero not found');
    }

    return this.prisma.eventMapCoverageGap.findMany({
      where: {
        heroNpcId,
        endedAt: null,
      },
    });
  }

  /**
   * Create or update presence log when a player enters/leaves a map or changes AFK status.
   * This tracks individual member presence for points calculation and analytics.
   *
   * @deprecated This method's logic has been integrated into handlePlayerPresenceChange
   * to eliminate duplicate database queries. Use handlePlayerPresenceChange instead.
   */
  async createOrUpdatePresenceLog(
    guildId: string,
    mapName: string,
    discordId: string,
    hasPlayer: boolean,
    isAfk: boolean,
  ): Promise<void> {
    // Get member for this discord user
    const member = await this.getMemberByDiscordId(discordId, guildId);
    if (!member) {
      // Non-guild member on the map - skip logging
      this.logger.debug({
        message: 'Skipping presence log - member not found',
        discordId,
        guildId,
        mapName,
      });
      return;
    }

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
    });

    const now = new Date();

    for (const map of eventMaps) {
      if (hasPlayer) {
        // Player is on the map - close existing log if any and create new one
        await this.prisma.eventPresenceLog.updateMany({
          where: {
            mapId: map.id,
            memberId: member.id,
            endedAt: null,
          },
          data: {
            endedAt: now,
          },
        });

        // Create new presence log
        await this.prisma.eventPresenceLog.create({
          data: {
            mapId: map.id,
            memberId: member.id,
            isAfk,
          },
        });

        this.logger.debug({
          message: 'Created presence log',
          mapId: map.id,
          memberId: member.id,
          isAfk,
        });
      } else {
        // Player left the map - close existing log
        const result = await this.prisma.eventPresenceLog.updateMany({
          where: {
            mapId: map.id,
            memberId: member.id,
            endedAt: null,
          },
          data: {
            endedAt: now,
          },
        });

        if (result.count > 0) {
          this.logger.debug({
            message: 'Closed presence log - player left map',
            mapId: map.id,
            memberId: member.id,
          });
        }
      }
    }
  }

  /**
   * Handle player presence change from gateway.
   * Creates presence logs and manages coverage gaps.
   * Called when a player enters/leaves a map or changes AFK status.
   *
   * Optimized to use a single query for event maps (eliminates duplicate query
   * that was previously in createOrUpdatePresenceLog).
   *
   * Uses distributed lock to prevent race conditions when multiple presence
   * updates arrive for the same player on the same map.
   */
  async handlePlayerPresenceChange(
    guildId: string,
    mapName: string,
    discordId: string,
    hasPlayer: boolean,
    isAfk = false,
  ): Promise<void> {
    const lockKey = this.getPresenceLockKey(guildId, mapName, discordId);

    try {
      await this.redlock.using([lockKey], this.presenceLockTtl, async () => {
        await this.handlePlayerPresenceChangeInternal(
          guildId,
          mapName,
          discordId,
          hasPlayer,
          isAfk,
        );
      });
    } catch (error) {
      if (error instanceof ExecutionError) {
        this.logger.warn({
          message: 'Failed to acquire presence lock, skipping update',
          guildId,
          mapName,
          discordId,
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Internal implementation of presence change handling.
   * Called within a distributed lock to ensure atomicity.
   */
  private async handlePlayerPresenceChangeInternal(
    guildId: string,
    mapName: string,
    discordId: string,
    hasPlayer: boolean,
    isAfk: boolean,
  ): Promise<void> {
    // Get member for this discord user (may be null for non-guild members)
    const member = await this.getMemberByDiscordId(discordId, guildId);

    // Single query for event maps - used for both presence logging and gap management
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
        heroNpc: {
          include: {
            event: {
              select: { world: true },
            },
          },
        },
      },
    });

    const now = new Date();

    // Batch query: Get all active timers for the heroes in one query
    // This eliminates N+1 problem from calling hasActiveRespawnWindow per map
    const timerKeys = eventMaps.map((map) => ({
      guildId,
      world: map.heroNpc.event.world,
      npcId: map.heroNpc.npcId ?? this.getSyntheticNpcId(map.heroNpc.id),
    }));

    const activeTimers = await this.prisma.timer.findMany({
      where: {
        OR: timerKeys,
        maxSpawnTime: { gt: now },
      },
      select: {
        guildId: true,
        world: true,
        npcId: true,
      },
    });

    // Create a Set for O(1) lookup
    const activeTimerSet = new Set(
      activeTimers.map((t) => `${t.guildId}:${t.world}:${t.npcId}`),
    );

    for (const map of eventMaps) {
      // 0. Check if respawn window is active using batch-loaded data
      const effectiveNpcId =
        map.heroNpc.npcId ?? this.getSyntheticNpcId(map.heroNpc.id);
      const timerKey = `${guildId}:${map.heroNpc.event.world}:${effectiveNpcId}`;
      const hasActiveWindow = activeTimerSet.has(timerKey);

      if (!hasActiveWindow) {
        // No active respawn window - skip tracking for this hero
        continue;
      }

      // 1. Update presence logs (only if member exists in guild)
      if (member) {
        if (hasPlayer) {
          // Player is on the map - close existing log and create new one
          await this.prisma.eventPresenceLog.updateMany({
            where: {
              mapId: map.id,
              memberId: member.id,
              endedAt: null,
            },
            data: { endedAt: now },
          });

          await this.prisma.eventPresenceLog.create({
            data: {
              mapId: map.id,
              memberId: member.id,
              isAfk,
            },
          });

          this.logger.debug({
            message: 'Created presence log',
            mapId: map.id,
            memberId: member.id,
            isAfk,
          });
        } else {
          // Player left the map - close existing log
          const result = await this.prisma.eventPresenceLog.updateMany({
            where: {
              mapId: map.id,
              memberId: member.id,
              endedAt: null,
            },
            data: { endedAt: now },
          });

          if (result.count > 0) {
            this.logger.debug({
              message: 'Closed presence log - player left map',
              mapId: map.id,
              memberId: member.id,
            });
          }
        }
      }

      // 2. Handle coverage gaps (only for maps with assigned members)
      const hasAssignedMembers = map.assignedMembers.length > 0;

      if (!hasAssignedMembers) {
        // No assigned members - UNASSIGNED gap is managed in assign/unassign methods
        continue;
      }

      // Map has assigned members - manage UNCOVERED gap
      if (hasPlayer) {
        if (isAfk) {
          // AFK player doesn't count as coverage
          const activeNonAfkPlayers = await this.getActiveNonAfkPlayersOnMap(
            map.id,
          );
          if (activeNonAfkPlayers.length === 0) {
            await this.openUncoveredGap(map.id, map.heroNpcId);
          }
        } else {
          // Active player arrived - close UNCOVERED gap if open
          await this.closeUncoveredGap(map.id);
        }
      } else {
        // Player left - check if map is now uncovered
        const activeNonAfkPlayers = await this.getActiveNonAfkPlayersOnMap(
          map.id,
        );

        if (activeNonAfkPlayers.length === 0) {
          await this.openUncoveredGap(map.id, map.heroNpcId);
        }
      }

      // 3. Always emit status update to refresh frontend
      // (previously was only emitted in some branches, causing stale UI)
      await this.eventEmitter.emitMapStatusUpdate(
        guildId,
        map.heroNpc.eventId,
        map.id,
        map.mapName,
      );
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

  /**
   * Get presence statistics for a hero across all maps and members.
   * Returns aggregated data for UI display.
   * Validates that the hero belongs to the specified guild and event.
   */
  async getHeroPresenceStats(
    guildId: string,
    eventId: string,
    heroNpcId: string,
  ): Promise<{
    totalCoverageSeconds: number;
    totalEventSeconds: number;
    presencePercentage: number;
    memberStats: Array<{
      memberId: number;
      memberName: string;
      memberAvatar: string | null;
      totalTimeSeconds: number;
      afkTimeSeconds: number;
      afkPercentage: number;
    }>;
  }> {
    // Get hero with event and maps, validating ownership
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroNpcId,
        eventId,
        event: { guildId },
      },
      include: {
        event: true,
        maps: {
          include: {
            assignedMembers: true,
          },
        },
      },
    });

    if (!hero) {
      throw new NotFoundException('Hero not found');
    }

    const mapIds = hero.maps.map((m) => m.id);

    // Calculate total event duration
    const eventStart = hero.event.startsAt || hero.event.createdAt;
    const eventEnd = hero.event.endsAt || new Date();
    const totalEventSeconds = Math.max(
      0,
      Math.round((eventEnd.getTime() - eventStart.getTime()) / 1000),
    );

    // Get all unique assigned members across all maps
    const assignedMemberIds = new Set<number>();
    for (const map of hero.maps) {
      for (const member of map.assignedMembers) {
        assignedMemberIds.add(member.id);
      }
    }

    // Get all presence logs for this hero's maps
    const presenceLogs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId: { in: mapIds },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    const now = new Date();

    // Aggregate by member
    const memberStatsMap = new Map<
      number,
      {
        memberId: number;
        memberName: string;
        memberAvatar: string | null;
        totalTimeMs: number;
        afkTimeMs: number;
      }
    >();

    // Initialize stats for assigned members
    for (const memberId of assignedMemberIds) {
      const member = hero.maps
        .flatMap((m) => m.assignedMembers)
        .find((m) => m.id === memberId);
      if (member) {
        memberStatsMap.set(memberId, {
          memberId: member.id,
          memberName: member.name,
          memberAvatar: member.avatar,
          totalTimeMs: 0,
          afkTimeMs: 0,
        });
      }
    }

    // Calculate presence time per member from logs
    let totalCoverageMs = 0;

    for (const log of presenceLogs) {
      const endTime = log.endedAt || now;
      const duration = Math.max(0, endTime.getTime() - log.startedAt.getTime());

      // Only count non-AFK time as coverage
      if (!log.isAfk) {
        totalCoverageMs += duration;
      }

      // Update member stats
      let memberStats = memberStatsMap.get(log.memberId);
      if (!memberStats) {
        // Member who has logs but isn't currently assigned (was unassigned)
        memberStats = {
          memberId: log.member.id,
          memberName: log.member.name,
          memberAvatar: log.member.avatar,
          totalTimeMs: 0,
          afkTimeMs: 0,
        };
        memberStatsMap.set(log.memberId, memberStats);
      }

      memberStats.totalTimeMs += duration;
      if (log.isAfk) {
        memberStats.afkTimeMs += duration;
      }
    }

    // Convert to response format
    const memberStats = Array.from(memberStatsMap.values()).map((stats) => ({
      memberId: stats.memberId,
      memberName: stats.memberName,
      memberAvatar: stats.memberAvatar,
      totalTimeSeconds: Math.round(stats.totalTimeMs / 1000),
      afkTimeSeconds: Math.round(stats.afkTimeMs / 1000),
      afkPercentage:
        stats.totalTimeMs > 0
          ? Math.round((stats.afkTimeMs / stats.totalTimeMs) * 10000) / 100
          : 0,
    }));

    // Sort by total time descending
    memberStats.sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);

    const totalCoverageSeconds = Math.round(totalCoverageMs / 1000);
    const presencePercentage =
      totalEventSeconds > 0
        ? Math.round((totalCoverageSeconds / totalEventSeconds) * 10000) / 100
        : 0;

    return {
      totalCoverageSeconds,
      totalEventSeconds,
      presencePercentage,
      memberStats,
    };
  }

  // ========== RESPAWN WINDOW HELPERS ==========

  /**
   * Check if there's an active respawn window for a hero.
   * Used to determine if presence tracking should be active.
   */
  private async hasActiveRespawnWindow(
    guildId: string,
    world: string,
    npcId: number | null,
    heroId: string,
  ): Promise<boolean> {
    const effectiveNpcId = npcId ?? this.getSyntheticNpcId(heroId);

    const timer = await this.prisma.timer.findUnique({
      where: {
        timerId: { guildId, world, npcId: effectiveNpcId },
      },
      select: { maxSpawnTime: true },
    });

    if (!timer) return false;

    // Active if maxSpawnTime hasn't passed yet
    return new Date(timer.maxSpawnTime) > new Date();
  }

  /**
   * Generate synthetic negative npcId from heroId for heroes without real npcId.
   * Uses negative values to avoid collision with real Margonem NPC IDs.
   */
  private getSyntheticNpcId(heroId: string): number {
    let hash = 0;
    for (let i = 0; i < heroId.length; i++) {
      hash = ((hash << 5) - hash) + heroId.charCodeAt(i);
      hash |= 0;
    }
    return -Math.abs(hash || 1);
  }
}
