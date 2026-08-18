import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { Permission } from "src/generated/prisma/client";
import { PermissionResolver } from "src/shared/permissions/permission-resolver";
import { filterHeroesByLevel } from "src/shared/utils/can-view-event-hero";
import {
  type EventHeroTimerLookupResult,
  TimersService,
} from "src/timers/timers.service";
import { buildTimerKey } from "src/timers/utils/timer-key";
import {
  getEventRespawnWindowStatus,
  type EventRespawnWindowStatus,
} from "../utils/event-respawn-window.util";

interface GetEventModeOptions {
  userId: string;
  discordId: string;
  world: string;
}

interface EventModeGuildContext {
  guild: {
    id: string;
  };
  roles: Array<{
    lvlRangeFrom: number | null;
    lvlRangeTo: number | null;
    permissions: Permission[];
  }>;
  permissions: Permission[];
}

interface EventModeSourceEvent {
  id: string;
  guildId: string;
  name: string;
  world: string;
  guild: {
    id: string;
    name: string;
  };
  heroNpcs: EventModeSourceHero[];
}

interface EventModeSourceHero {
  id: string;
  npcId: number | null;
  npcName: string;
  npcIcon: string | null;
  npcLvl: number | null;
  maps: Array<{
    id: string;
    mapId: number;
    mapName: string;
    assignedMembers: Array<{ id: number }>;
  }>;
}

interface EventModeAssignment {
  eventMapId: string;
  heroId: string;
  npcId: number | null;
  npcName: string;
  npcIcon: string | null;
  margonemMapId: number;
  mapName: string;
}

interface EventModeRespawnCandidate {
  heroId: string;
  npcId: number | null;
  npcName: string;
  minSpawnTime: Date;
  maxSpawnTime: Date;
  status: Exclude<EventRespawnWindowStatus, "NONE">;
}

const RESPAWN_STATUS_RANK: Record<EventModeRespawnCandidate["status"], number> =
  {
    OVERDUE: 0,
    OPEN: 1,
    WAITING: 2,
  };

@Injectable()
export class EventModeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly timersService: TimersService,
  ) {}

  async getEventMode(options: GetEventModeOptions) {
    const generatedAt = new Date();
    const normalizedWorld = options.world.trim().toLowerCase();
    const guildContexts = await this.getReadableGuildContexts(options);

    if (guildContexts.length === 0) {
      return { generatedAt, events: [] };
    }

    const guildIds = guildContexts.map((context) => context.guild.id);
    const pinnedEventRecords = await this.prisma.userPinnedEvent.findMany({
      where: {
        userId: options.userId,
        event: {
          guildId: { in: guildIds },
          world: normalizedWorld,
          AND: [
            {
              OR: [{ startsAt: null }, { startsAt: { lte: generatedAt } }],
            },
            {
              OR: [{ endsAt: null }, { endsAt: { gt: generatedAt } }],
            },
          ],
        },
      },
      select: {
        eventId: true,
        event: {
          select: { guildId: true },
        },
      },
    });

    const pinnedEventIdsByGuild = new Map<string, string[]>();
    for (const pinnedEventRecord of pinnedEventRecords) {
      const guildPinnedEventIds =
        pinnedEventIdsByGuild.get(pinnedEventRecord.event.guildId) ?? [];
      guildPinnedEventIds.push(pinnedEventRecord.eventId);
      pinnedEventIdsByGuild.set(
        pinnedEventRecord.event.guildId,
        guildPinnedEventIds,
      );
    }

    const pinnedSettings = Array.from(
      pinnedEventIdsByGuild,
      ([guildId, pinnedEvents]) => ({ guildId, pinnedEvents }),
    );

    if (pinnedSettings.length === 0) {
      return { generatedAt, events: [] };
    }

    const events = await this.prisma.event.findMany({
      where: {
        OR: pinnedSettings.map((setting) => ({
          guildId: setting.guildId,
          id: { in: setting.pinnedEvents },
        })),
        world: normalizedWorld,
        AND: [
          {
            OR: [{ startsAt: null }, { startsAt: { lte: generatedAt } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gt: generatedAt } }],
          },
        ],
      },
      select: {
        id: true,
        guildId: true,
        name: true,
        world: true,
        guild: {
          select: {
            id: true,
            name: true,
          },
        },
        heroNpcs: {
          select: {
            id: true,
            npcId: true,
            npcName: true,
            npcIcon: true,
            npcLvl: true,
            maps: {
              select: {
                id: true,
                mapId: true,
                mapName: true,
                assignedMembers: {
                  where: {
                    userId: options.discordId,
                    globalUserId: options.userId,
                    active: true,
                  },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    const guildContextById = new Map(
      guildContexts.map((context) => [context.guild.id, context]),
    );
    const visibleEvents = events.map((event) => {
      const context = guildContextById.get(event.guildId);
      const heroNpcs = context
        ? filterHeroesByLevel(
            event.heroNpcs,
            context.roles,
            context.permissions,
          )
        : [];

      return { ...event, heroNpcs };
    });
    const timers = await this.timersService.getTimersForEventHeroLookups(
      visibleEvents.flatMap((event) =>
        event.heroNpcs.map((hero) => ({
          guildId: event.guildId,
          world: event.world,
          npcId: hero.npcId,
          npcName: hero.npcName,
        })),
      ),
    );
    const timersByKey = createTimersByKey(timers);
    const timersByName = createTimersByName(timers);
    const projectedEvents = visibleEvents
      .map((event) =>
        projectEvent({
          event,
          generatedAt,
          timersByKey,
          timersByName,
        }),
      )
      .sort(compareEvents);

    return {
      generatedAt,
      events: projectedEvents,
    };
  }

  private async getReadableGuildContexts(
    options: GetEventModeOptions,
  ): Promise<EventModeGuildContext[]> {
    const guildAccess = await this.guildsService.getUserGuildsWithPermissions(
      options.discordId,
      options.userId,
    );

    return guildAccess.flatMap((context) => {
      const permissions = PermissionResolver.resolve(
        context.roles.flatMap((role) => role.permissions),
      );

      if (!permissions.includes(Permission.LOOTLOG_EVENTS_READ)) {
        return [];
      }

      return [{ ...context, permissions }];
    });
  }
}

function projectEvent({
  event,
  generatedAt,
  timersByKey,
  timersByName,
}: {
  event: EventModeSourceEvent;
  generatedAt: Date;
  timersByKey: Map<string, EventHeroTimerLookupResult>;
  timersByName: Map<string, EventHeroTimerLookupResult>;
}) {
  const assignments = getAssignments(event);

  return {
    id: event.id,
    name: event.name,
    world: event.world,
    guild: event.guild,
    assignments,
    nextRespawn: getNextRespawn({
      event,
      assignments,
      generatedAt,
      timersByKey,
      timersByName,
    }),
  };
}

function getAssignments(event: EventModeSourceEvent): EventModeAssignment[] {
  return event.heroNpcs
    .flatMap((hero) =>
      hero.maps
        .filter((map) => map.assignedMembers.length > 0)
        .map((map) => ({
          eventMapId: map.id,
          heroId: hero.id,
          npcId: hero.npcId,
          npcName: hero.npcName,
          npcIcon: hero.npcIcon,
          margonemMapId: map.mapId,
          mapName: map.mapName,
        })),
    )
    .sort(compareAssignments);
}

function getNextRespawn({
  event,
  assignments,
  generatedAt,
  timersByKey,
  timersByName,
}: {
  event: EventModeSourceEvent;
  assignments: EventModeAssignment[];
  generatedAt: Date;
  timersByKey: Map<string, EventHeroTimerLookupResult>;
  timersByName: Map<string, EventHeroTimerLookupResult>;
}): EventModeRespawnCandidate | null {
  const assignedHeroIds = new Set(
    assignments.map((assignment) => assignment.heroId),
  );
  const relevantHeroes =
    assignments.length > 0
      ? event.heroNpcs.filter((hero) => assignedHeroIds.has(hero.id))
      : event.heroNpcs;
  const candidates = relevantHeroes.flatMap((hero) => {
    const timer = findHeroTimer({
      event,
      hero,
      timersByKey,
      timersByName,
    });
    const status = getEventRespawnWindowStatus(timer, generatedAt);

    if (!timer || status === "NONE") {
      return [];
    }

    return [
      {
        heroId: hero.id,
        npcId: hero.npcId,
        npcName: hero.npcName,
        minSpawnTime: timer.minSpawnTime,
        maxSpawnTime: timer.maxSpawnTime,
        status,
      },
    ];
  });

  return candidates.sort(compareRespawns)[0] ?? null;
}

function findHeroTimer({
  event,
  hero,
  timersByKey,
  timersByName,
}: {
  event: EventModeSourceEvent;
  hero: EventModeSourceHero;
  timersByKey: Map<string, EventHeroTimerLookupResult>;
  timersByName: Map<string, EventHeroTimerLookupResult>;
}) {
  if (hero.npcId !== null) {
    return timersByKey.get(
      createTimerIdentity(
        event.guildId,
        event.world,
        buildTimerKey(hero.npcId, hero.npcName),
      ),
    );
  }

  return timersByName.get(
    createTimerIdentity(event.guildId, event.world, hero.npcName),
  );
}

function createTimersByKey(timers: EventHeroTimerLookupResult[]) {
  return new Map(
    timers.map((timer) => [
      createTimerIdentity(timer.guildId, timer.world, timer.timerKey),
      timer,
    ]),
  );
}

function createTimersByName(timers: EventHeroTimerLookupResult[]) {
  const timersByName = new Map<string, EventHeroTimerLookupResult>();

  for (const timer of timers) {
    const identity = createTimerIdentity(
      timer.guildId,
      timer.world,
      extractNpcName(timer.npc),
    );
    const existingTimer = timersByName.get(identity);

    if (!existingTimer || compareTimers(timer, existingTimer) < 0) {
      timersByName.set(identity, timer);
    }
  }

  return timersByName;
}

function createTimerIdentity(guildId: string, world: string, value: string) {
  return JSON.stringify([guildId, world, value]);
}

function extractNpcName(npc: unknown): string {
  if (!npc || typeof npc !== "object" || Array.isArray(npc)) {
    return "";
  }

  const name = (npc as Record<string, unknown>).name;
  return typeof name === "string" ? name : "";
}

function compareAssignments(
  left: EventModeAssignment,
  right: EventModeAssignment,
) {
  return (
    compareText(left.npcName, right.npcName) ||
    compareText(left.mapName, right.mapName) ||
    compareText(left.eventMapId, right.eventMapId)
  );
}

function compareRespawns(
  left: EventModeRespawnCandidate,
  right: EventModeRespawnCandidate,
) {
  const statusComparison =
    RESPAWN_STATUS_RANK[left.status] - RESPAWN_STATUS_RANK[right.status];

  if (statusComparison !== 0) {
    return statusComparison;
  }

  const leftTimestamp =
    left.status === "WAITING"
      ? left.minSpawnTime.getTime()
      : left.maxSpawnTime.getTime();
  const rightTimestamp =
    right.status === "WAITING"
      ? right.minSpawnTime.getTime()
      : right.maxSpawnTime.getTime();

  return (
    leftTimestamp - rightTimestamp ||
    compareText(left.npcName, right.npcName) ||
    compareText(left.heroId, right.heroId)
  );
}

function compareEvents(
  left: ReturnType<typeof projectEvent>,
  right: ReturnType<typeof projectEvent>,
) {
  return (
    compareText(left.guild.name, right.guild.name) ||
    compareText(left.name, right.name) ||
    compareText(left.id, right.id)
  );
}

function compareTimers(
  left: EventHeroTimerLookupResult,
  right: EventHeroTimerLookupResult,
) {
  return (
    left.maxSpawnTime.getTime() - right.maxSpawnTime.getTime() ||
    left.minSpawnTime.getTime() - right.minSpawnTime.getTime() ||
    compareText(left.timerKey, right.timerKey)
  );
}

function compareText(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}
