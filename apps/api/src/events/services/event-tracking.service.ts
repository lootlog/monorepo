import {
  BadRequestException,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from "#src/shared/http/http-errors";
import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";
import { ExecutionError } from "redlock";
import { RedisService } from "#src/redis/redis.service";
import { RedlockService } from "#src/lib/redlock/redlock.service";
import { EventReadCacheService } from "./event-read-cache.service.js";
import { EventEmitterService } from "./event-emitter.service.js";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { getSyntheticNpcId } from "../utils/get-synthetic-npc-id.js";
import { buildTimerKey } from "#src/timers/utils/timer-key";
import { TimersService } from "#src/timers/timers.service";
import { EventTrackingRepository } from "./event-tracking.repository.js";

const CoverageGapType = {
  UNASSIGNED: "UNASSIGNED",
  UNCOVERED: "UNCOVERED",
} as const;

export class EventTrackingService implements OnModuleInit {
  private readonly logger = new Logger(EventTrackingService.name);
  private redlock: ReturnType<RedlockService["createInstance"]>;
  private readonly presenceLockTtl = 5000;

  constructor(
    private readonly repository: EventTrackingRepository,
    private readonly eventEmitter: EventEmitterService,
    private readonly eventReadCache: EventReadCacheService,
    private readonly amqpConnection: AmqpPublisher,
    private readonly redis: RedisService,
    private readonly redlockService: RedlockService,
    private readonly timersService: TimersService,
  ) {}

  onModuleInit() {
    this.redlock = this.redlockService.createInstance();
  }

  private getPresenceLockKey(
    guildId: string,
    mapName: string,
    discordId: string,
  ): string {
    return `presence:lock:${guildId}:${mapName}:${discordId}`;
  }

  async assignMemberToMap(
    guildId: string,
    eventId: string,
    mapId: string,
    memberId: number,
  ) {
    const map = await this.repository.findScopedMap(guildId, eventId, mapId);

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    const member = await this.repository.findMember(guildId, memberId);

    if (!member) {
      throw new NotFoundException("Member not found");
    }

    const isAlreadyAssigned = map.assignedMembers.some(
      (member) => member.id === memberId,
    );
    if (isAlreadyAssigned) {
      this.logger.debug({
        message: "Member already assigned to map, skipping",
        mapId,
        memberId,
      });
      return await this.repository.findMapWithMembers(mapId);
    }

    const effectiveNpcId =
      map.heroNpc.npcId ?? getSyntheticNpcId(map.heroNpcId);
    const timer = await this.timersService.getEventRespawnTimer({
      guildId,
      world: map.heroNpc.event.world,
      npcId: effectiveNpcId,
      npcName: map.heroNpc.npcName,
    });

    if (!timer) {
      throw new BadRequestException(
        "Cannot assign members without an active respawn window",
      );
    }

    const now = new Date();

    if (now >= new Date(timer.maxSpawnTime)) {
      throw new BadRequestException(
        "Cannot assign members after the respawn window is overdue",
      );
    }

    const assignmentEnabledAt = new Date(
      new Date(timer.minSpawnTime).getTime() -
        map.heroNpc.event.assignmentTimeoutMinutes * 60 * 1000,
    );

    if (now < assignmentEnabledAt) {
      throw new BadRequestException(
        "Cannot assign members before the assignment window opens",
      );
    }

    const cap = map.heroNpc.event.mapAssignmentCap;
    if (cap && cap > 0 && map.assignedMembers.length >= cap) {
      throw new BadRequestException(
        `Map assignment limit reached (${cap} members max)`,
      );
    }

    const wasUnassigned = map.assignedMembers.length === 0;

    const updated = await this.repository.assignMember(mapId, memberId);

    const existingOpenAssignment = await this.repository.findOpenAssignment(
      mapId,
      memberId,
    );

    if (!existingOpenAssignment) {
      await this.repository.createAssignment(
        mapId,
        map.heroNpcId,
        memberId,
        new Date(),
      );
    }

    if (wasUnassigned) {
      await this.closeUnassignedGap(mapId);
      await this.openUncoveredGap(mapId, map.heroNpcId);
      this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.PRESENCE_CHECK_REQUEST,
        {
          guildId,
          mapName: map.mapName,
        },
      );
    }

    await Promise.all([
      this.eventReadCache.invalidateEvent(guildId, eventId),
      this.eventEmitter.emit(RoutingKey.EVENT_MAP_STATUS_UPDATE, {
        guildId,
        eventId,
        mapId,
      }),
    ]);

    return updated;
  }

  async unassignMemberFromMap(
    guildId: string,
    eventId: string,
    mapId: string,
    memberId?: number,
  ) {
    const map = await this.repository.findScopedMap(guildId, eventId, mapId);

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    const updated = await this.repository.unassignMember(mapId, memberId);

    const now = new Date();
    if (memberId) {
      await this.repository.closeAssignments(mapId, now, memberId);
    } else {
      await this.repository.closeAssignments(mapId, now);
    }

    if (updated.assignedMembers.length === 0) {
      await this.openUnassignedGap(mapId, map.heroNpcId);
      await this.closeUncoveredGap(mapId);
    }

    await Promise.all([
      this.eventReadCache.invalidateEvent(guildId, eventId),
      this.eventEmitter.emit(RoutingKey.EVENT_MAP_STATUS_UPDATE, {
        guildId,
        eventId,
        mapId,
      }),
    ]);

    return updated;
  }

  getMemberByDiscordId(discordId: string, guildId: string) {
    return this.repository.findMemberByDiscordId(discordId, guildId);
  }

  async openUnassignedGap(
    mapId: string,
    heroNpcId: string,
    startedAt?: Date,
  ): Promise<void> {
    const existingGap = await this.repository.findOpenGap(
      mapId,
      CoverageGapType.UNASSIGNED,
    );

    if (existingGap) {
      return;
    }

    await this.repository.createGap(
      mapId,
      heroNpcId,
      CoverageGapType.UNASSIGNED,
      startedAt ?? new Date(),
    );

    this.logger.debug({
      message: "Opened UNASSIGNED gap",
      mapId,
      heroNpcId,
    });
  }

  async closeUnassignedGap(mapId: string): Promise<void> {
    const now = new Date();

    const openGap = await this.repository.findOpenGap(
      mapId,
      CoverageGapType.UNASSIGNED,
    );

    if (!openGap) {
      return;
    }

    const durationSeconds = Math.round(
      (now.getTime() - openGap.startedAt.getTime()) / 1000,
    );

    await this.repository.closeGap(openGap.id, now, durationSeconds);

    this.logger.debug({
      message: "Closed UNASSIGNED gap",
      mapId,
      durationSeconds,
    });
  }

  async openUncoveredGap(
    mapId: string,
    heroNpcId: string,
    startedAt?: Date,
  ): Promise<void> {
    const existingGap = await this.repository.findOpenGap(
      mapId,
      CoverageGapType.UNCOVERED,
    );

    if (existingGap) {
      return;
    }

    await this.repository.createGap(
      mapId,
      heroNpcId,
      CoverageGapType.UNCOVERED,
      startedAt ?? new Date(),
    );

    this.logger.debug({
      message: "Opened UNCOVERED gap",
      mapId,
      heroNpcId,
    });
  }

  async closeUncoveredGap(mapId: string): Promise<void> {
    const now = new Date();

    const openGap = await this.repository.findOpenGap(
      mapId,
      CoverageGapType.UNCOVERED,
    );

    if (!openGap) {
      return;
    }

    const durationSeconds = Math.round(
      (now.getTime() - openGap.startedAt.getTime()) / 1000,
    );

    await this.repository.closeGap(openGap.id, now, durationSeconds);

    this.logger.debug({
      message: "Closed UNCOVERED gap",
      mapId,
      durationSeconds,
    });
  }

  async closeAllGapsForHero(heroNpcId: string): Promise<void> {
    const now = new Date();

    const openGaps = await this.repository.findOpenGapsForHero(heroNpcId);

    if (openGaps.length === 0) {
      return;
    }

    await this.repository.closeGaps(openGaps, now);

    this.logger.debug({
      message: "Closed all gaps for hero",
      heroNpcId,
      closedCount: openGaps.length,
    });
  }

  getMapCoverageGaps(guildId: string, eventId: string, mapId: string) {
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getEventKey(guildId, eventId, "map-gaps", {
        mapId,
      }),
      async () => {
        const map = await this.repository.findScopedMap(
          guildId,
          eventId,
          mapId,
        );

        if (!map) {
          throw new NotFoundException("Map not found");
        }

        return this.repository.findMapGaps(mapId);
      },
    );
  }

  getHeroCoverageGaps(guildId: string, eventId: string, heroNpcId: string) {
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getEventKey(guildId, eventId, "hero-gaps", {
        heroNpcId,
      }),
      async () => {
        const hero = await this.repository.findHero(
          guildId,
          eventId,
          heroNpcId,
        );

        if (!hero) {
          throw new NotFoundException("Hero not found");
        }

        return this.repository.findHeroGaps(heroNpcId);
      },
    );
  }

  getActiveGapForMap(guildId: string, eventId: string, mapId: string) {
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getEventKey(guildId, eventId, "map-active-gap", {
        mapId,
      }),
      async () => {
        const map = await this.repository.findScopedMap(
          guildId,
          eventId,
          mapId,
        );

        if (!map) {
          throw new NotFoundException("Map not found");
        }

        return this.repository.findOpenGap(mapId);
      },
    );
  }

  getActiveGapsForHero(guildId: string, eventId: string, heroNpcId: string) {
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getEventKey(guildId, eventId, "hero-active-gaps", {
        heroNpcId,
      }),
      async () => {
        const hero = await this.repository.findHero(
          guildId,
          eventId,
          heroNpcId,
        );

        if (!hero) {
          throw new NotFoundException("Hero not found");
        }

        return this.repository.findActiveHeroGaps(heroNpcId);
      },
    );
  }

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
          message: "Failed to acquire presence lock, skipping update",
          guildId,
          mapName,
          discordId,
        });
        return;
      }
      throw error;
    }
  }

  private async handlePlayerPresenceChangeInternal(
    guildId: string,
    mapName: string,
    discordId: string,
    hasPlayer: boolean,
    isAfk: boolean,
  ): Promise<void> {
    const member = await this.getMemberByDiscordId(discordId, guildId);
    const referenceTime = new Date();

    const eventMaps = await this.repository.findActiveMapsByName(
      guildId,
      mapName,
      referenceTime,
    );

    const now = referenceTime;

    const timerLookups = eventMaps.map((map) => ({
      guildId,
      world: map.heroNpc.event.world,
      npcId: map.heroNpc.npcId ?? getSyntheticNpcId(map.heroNpc.id),
      npcName: map.heroNpc.npcName,
    }));

    const activeTimerSet = await this.timersService.getActiveTimerKeys(
      timerLookups,
      now,
    );

    const activeMaps = eventMaps.filter((map) => {
      const effectiveNpcId =
        map.heroNpc.npcId ?? getSyntheticNpcId(map.heroNpc.id);
      const timerKey = `${guildId}:${map.heroNpc.event.world}:${buildTimerKey(effectiveNpcId, map.heroNpc.npcName)}`;
      return activeTimerSet.has(timerKey);
    });

    const assignedActiveMapIds = activeMaps
      .filter((map) => map.assignedMembers.length > 0)
      .map((map) => map.id);

    const activeNonAfkByMap =
      await this.getActiveNonAfkMembersByMap(assignedActiveMapIds);

    await Promise.all(
      activeMaps.map(async (map) => {
        const nonAfkMembers =
          activeNonAfkByMap.get(map.id) ?? new Set<number>();

        if (member) {
          if (hasPlayer) {
            await this.repository.closePresence(map.id, member.id, now);

            await this.repository.createPresence(map.id, member.id, isAfk);

            this.logger.debug({
              message: "Created presence log",
              mapId: map.id,
              memberId: member.id,
              isAfk,
            });

            if (isAfk) {
              nonAfkMembers.delete(member.id);
            } else {
              nonAfkMembers.add(member.id);
            }
          } else {
            const result = await this.repository.closePresence(
              map.id,
              member.id,
              now,
            );

            if (result.count > 0) {
              this.logger.debug({
                message: "Closed presence log - player left map",
                mapId: map.id,
                memberId: member.id,
              });
            }

            nonAfkMembers.delete(member.id);
          }
        }

        const hasAssignedMembers = map.assignedMembers.length > 0;

        if (!hasAssignedMembers) {
          return;
        }

        if (hasPlayer) {
          if (isAfk) {
            if (nonAfkMembers.size === 0) {
              await this.openUncoveredGap(map.id, map.heroNpcId);
            }
          } else {
            await this.closeUncoveredGap(map.id);
          }
        } else {
          if (nonAfkMembers.size === 0) {
            await this.openUncoveredGap(map.id, map.heroNpcId);
          }
        }

        await this.eventEmitter.emit(RoutingKey.EVENT_MAP_STATUS_UPDATE, {
          guildId,
          eventId: map.heroNpc.eventId,
          mapId: map.id,
          reason: "presence",
        });
      }),
    );
  }

  async getActiveNonAfkPlayersOnMap(mapId: string): Promise<number[]> {
    const mapMembers = await this.getActiveNonAfkMembersByMap([mapId]);
    return Array.from(mapMembers.get(mapId) ?? []);
  }

  private async getActiveNonAfkMembersByMap(
    mapIds: string[],
  ): Promise<Map<string, Set<number>>> {
    if (mapIds.length === 0) {
      return new Map();
    }

    const activeLogs = await this.repository.findActiveNonAfkLogs(mapIds);

    const membersByMap = new Map<string, Set<number>>();
    for (const mapId of mapIds) {
      membersByMap.set(mapId, new Set());
    }

    for (const log of activeLogs) {
      const members = membersByMap.get(log.mapId);
      if (members) {
        members.add(log.memberId);
      }
    }

    return membersByMap;
  }

  async getActivePlayersOnMap(mapId: string): Promise<number[]> {
    const activeLogs = await this.repository.findActiveLogs(mapId);

    return activeLogs.map((log) => log.memberId);
  }

  getHeroPresenceStats(
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
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getEventKey(guildId, eventId, "hero-presence", {
        heroNpcId,
      }),
      () => this.getHeroPresenceStatsUncached(guildId, eventId, heroNpcId),
    );
  }

  private async getHeroPresenceStatsUncached(
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
    const hero = await this.repository.findHeroForPresenceStats(
      guildId,
      eventId,
      heroNpcId,
    );

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const mapIds = hero.maps.map((m) => m.id);

    const eventStart = hero.event.startsAt || hero.event.createdAt;
    const eventEnd = hero.event.endsAt || new Date();
    const totalEventSeconds = Math.max(
      0,
      Math.round((eventEnd.getTime() - eventStart.getTime()) / 1000),
    );

    const assignedMemberIds = new Set<number>();
    for (const map of hero.maps) {
      for (const member of map.assignedMembers) {
        assignedMemberIds.add(member.id);
      }
    }

    const presenceLogs = await this.repository.findPresenceLogs(mapIds);

    const now = new Date();

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

    let totalCoverageMs = 0;

    for (const log of presenceLogs) {
      const endTime = log.endedAt || now;
      const duration = Math.max(0, endTime.getTime() - log.startedAt.getTime());

      if (!log.isAfk) {
        totalCoverageMs += duration;
      }

      let memberStats = memberStatsMap.get(log.memberId);
      if (!memberStats) {
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
}
