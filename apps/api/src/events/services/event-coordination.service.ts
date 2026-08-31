import { and, not, or } from "@prisma/orm-family-sql/orm-client";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CoverageGapType } from "#src/db/domain";
import { PrismaService } from "#src/db/prisma.service";
import { attachAssignedMembersToHeroes } from "#src/db/many-to-many";
import { TimersService } from "#src/timers/timers.service";
import { buildTimerKey } from "#src/timers/utils/timer-key";
import {
  getEventRespawnWindowStatus,
  type EventRespawnWindowStatus,
} from "../utils/event-respawn-window.util.js";

type CoordinationPriority = "CRITICAL" | "WARNING" | "OK" | "IDLE";
type RecommendedAction =
  | "CLOSE_WINDOW"
  | "ASSIGN_MAPS"
  | "JOIN_MAP"
  | "WAIT"
  | "NONE";

type EventHeroForCoordination = {
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
};

type EventTimerForCoordination = {
  npcId: number;
  timerKey: string;
  world: string;
  minSpawnTime: Date;
  maxSpawnTime: Date;
  npc: unknown;
};

type ActiveGapForCoordination = {
  id: string;
  mapId: string;
  heroNpcId: string;
  gapType: CoverageGapType;
  startedAt: Date;
  durationSeconds: number | null;
  map: {
    mapId: number;
    mapName: string;
  };
};

const PRIORITY_RANK: Record<CoordinationPriority, number> = {
  CRITICAL: 0,
  WARNING: 1,
  OK: 2,
  IDLE: 3,
};

const WINDOW_STATUS_RANK: Record<EventRespawnWindowStatus, number> = {
  OPEN: 0,
  OVERDUE: 1,
  WAITING: 2,
  NONE: 3,
};

@Injectable()
export class EventCoordinationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timersService: TimersService,
  ) {}

  async getCoordination(guildId: string, eventId: string) {
    const eventRow = await this.prisma.db.orm.public.Event.where((row) =>
      and(row.id.eq(eventId), row.guildId.eq(guildId)),
    )
      .select("assignmentTimeoutMinutes", "id", "world")
      .include("heroNpcs", (row) =>
        row
          .select("id", "npcId", "npcName", "npcIcon", "npcLvl")
          .include("maps", (rowRow) =>
            rowRow
              .select("id", "mapId", "mapName")
              .orderBy((rowRowRow) => rowRowRow.mapId.asc()),
          ),
      )
      .first();
    const event = eventRow
      ? {
          ...eventRow,
          heroNpcs: await attachAssignedMembersToHeroes(
            this.prisma.db,
            eventRow.heroNpcs,
          ),
        }
      : null;

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const now = new Date();
    const [timers, activeGaps] = await Promise.all([
      this.timersService.getTimersForEventHeroFilters(
        guildId,
        event.world,
        event.heroNpcs,
      ),
      this.prisma.db.orm.public.EventMapCoverageGap.where((row) =>
        and(
          row.heroNpcId.in(event.heroNpcs.map((hero) => hero.id)),
          row.endedAt.isNull(),
        ),
      )
        .select(
          "id",
          "mapId",
          "heroNpcId",
          "gapType",
          "startedAt",
          "durationSeconds",
        )
        .include("map", (row) => row.select("mapId", "mapName"))
        .all(),
    ]);

    const timersByKey = new Map(timers.map((timer) => [timer.timerKey, timer]));
    const timersByNpcName = new Map(
      timers.map((timer) => [extractNpcName(timer.npc), timer]),
    );
    const activeGapsByHeroId = groupActiveGapsByHeroId(activeGaps);

    const heroes = event.heroNpcs
      .map((hero) => {
        const timer = findHeroTimer(hero, timersByKey, timersByNpcName);
        const status = getEventRespawnWindowStatus(timer, now);
        const heroActiveGaps = activeGapsByHeroId.get(hero.id) ?? [];
        const activeGapMapIds = new Set(heroActiveGaps.map((gap) => gap.mapId));
        const uncoveredGapMapIds = new Set(
          heroActiveGaps
            .filter((gap) => gap.gapType === CoverageGapType.UNCOVERED)
            .map((gap) => gap.mapId),
        );
        const totalMaps = hero.maps.length;
        const assignedMaps = hero.maps.filter(
          (map) => map.assignedMembers.length > 0,
        ).length;
        const unassignedMapIds = new Set(
          hero.maps
            .filter((map) => map.assignedMembers.length === 0)
            .map((map) => map.id),
        );
        const unassignedMapCount = Math.max(0, totalMaps - assignedMaps);
        const unassignedGapCount = heroActiveGaps.filter(
          (gap) => gap.gapType === CoverageGapType.UNASSIGNED,
        ).length;
        const uncoveredGapCount = uncoveredGapMapIds.size;
        const unassignedMaps =
          status === "NONE"
            ? unassignedMapCount
            : Math.max(unassignedMapCount, unassignedGapCount);
        const uncoveredOrUnassignedMapIds = new Set([
          ...activeGapMapIds,
          ...unassignedMapIds,
        ]);
        const coveredMaps =
          status === "NONE"
            ? assignedMaps
            : Math.max(0, totalMaps - uncoveredOrUnassignedMapIds.size);
        const coverage = {
          totalMaps,
          assignedMaps,
          coveredMaps,
          unassignedMaps,
          uncoveredMaps: uncoveredGapCount,
          activeGapCount: heroActiveGaps.length,
        };
        const priority = getPriority(status, coverage);
        const recommendedAction = getRecommendedAction(status, coverage);

        return {
          heroId: hero.id,
          npcId: hero.npcId,
          npcName: hero.npcName,
          npcIcon: hero.npcIcon,
          npcLvl: hero.npcLvl,
          timer: timer
            ? {
                npcId: timer.npcId,
                world: timer.world,
                minSpawnTime: timer.minSpawnTime,
                maxSpawnTime: timer.maxSpawnTime,
                status,
                overdueMs:
                  status === "OVERDUE"
                    ? Math.max(0, now.getTime() - timer.maxSpawnTime.getTime())
                    : null,
              }
            : null,
          coverage,
          activeGaps: heroActiveGaps
            .map((gap) => ({
              id: gap.id,
              mapId: gap.mapId,
              numericMapId: gap.map.mapId,
              mapName: gap.map.mapName,
              gapType: gap.gapType,
              startedAt: gap.startedAt,
              durationSeconds:
                gap.durationSeconds ??
                Math.max(
                  0,
                  Math.round((now.getTime() - gap.startedAt.getTime()) / 1000),
                ),
            }))
            .sort(compareActiveGaps),
          priority,
          recommendedAction,
        };
      })
      .sort(compareCoordinationHeroes);

    return {
      assignmentTimeoutMinutes: event.assignmentTimeoutMinutes,
      generatedAt: now,
      eventId: event.id,
      world: event.world,
      summary: {
        criticalCount: heroes.filter((hero) => hero.priority === "CRITICAL")
          .length,
        warningCount: heroes.filter((hero) => hero.priority === "WARNING")
          .length,
        coveredMaps: heroes.reduce(
          (total, hero) => total + hero.coverage.coveredMaps,
          0,
        ),
        totalMaps: heroes.reduce(
          (total, hero) => total + hero.coverage.totalMaps,
          0,
        ),
        nextSpawnAt: getNextSpawnAt(heroes),
      },
      heroes,
    };
  }
}

function groupActiveGapsByHeroId(activeGaps: ActiveGapForCoordination[]) {
  const grouped = new Map<string, ActiveGapForCoordination[]>();

  for (const gap of activeGaps) {
    const existing = grouped.get(gap.heroNpcId) ?? [];
    existing.push(gap);
    grouped.set(gap.heroNpcId, existing);
  }

  return grouped;
}

function findHeroTimer(
  hero: EventHeroForCoordination,
  timersByKey: Map<string, EventTimerForCoordination>,
  timersByNpcName: Map<string, EventTimerForCoordination>,
) {
  if (hero.npcId !== null) {
    return timersByKey.get(buildTimerKey(hero.npcId, hero.npcName)) ?? null;
  }

  return timersByNpcName.get(hero.npcName) ?? null;
}

function extractNpcName(npc: unknown): string {
  if (!npc || typeof npc !== "object" || Array.isArray(npc)) {
    return "";
  }

  const name = (npc as Record<string, unknown>).name;
  return typeof name === "string" ? name : "";
}

function getPriority(
  status: EventRespawnWindowStatus,
  coverage: {
    activeGapCount: number;
    unassignedMaps: number;
  },
): CoordinationPriority {
  if (status === "OVERDUE") {
    return "CRITICAL";
  }

  if (
    status === "OPEN" &&
    (coverage.activeGapCount > 0 || coverage.unassignedMaps > 0)
  ) {
    return "CRITICAL";
  }

  if (
    status === "WAITING" &&
    (coverage.activeGapCount > 0 || coverage.unassignedMaps > 0)
  ) {
    return "WARNING";
  }

  if (status === "OPEN" || status === "WAITING") {
    return "OK";
  }

  return "IDLE";
}

function getRecommendedAction(
  status: EventRespawnWindowStatus,
  coverage: {
    unassignedMaps: number;
    uncoveredMaps: number;
    activeGapCount: number;
  },
): RecommendedAction {
  if (status === "NONE") {
    return "NONE";
  }

  if (status === "OVERDUE") {
    return "CLOSE_WINDOW";
  }

  if (coverage.unassignedMaps > 0) {
    return "ASSIGN_MAPS";
  }

  if (coverage.uncoveredMaps > 0 || coverage.activeGapCount > 0) {
    return "JOIN_MAP";
  }

  if (status === "WAITING") {
    return "WAIT";
  }

  return "NONE";
}

function compareActiveGaps(
  first: { gapType: CoverageGapType; startedAt: Date },
  second: { gapType: CoverageGapType; startedAt: Date },
) {
  const gapRank = {
    [CoverageGapType.UNASSIGNED]: 0,
    [CoverageGapType.UNCOVERED]: 1,
  };

  return (
    gapRank[first.gapType] - gapRank[second.gapType] ||
    first.startedAt.getTime() - second.startedAt.getTime()
  );
}

function compareCoordinationHeroes(
  first: {
    priority: CoordinationPriority;
    timer: { status: EventRespawnWindowStatus; minSpawnTime: Date } | null;
    npcName: string;
  },
  second: {
    priority: CoordinationPriority;
    timer: { status: EventRespawnWindowStatus; minSpawnTime: Date } | null;
    npcName: string;
  },
) {
  const firstStatus = first.timer?.status ?? "NONE";
  const secondStatus = second.timer?.status ?? "NONE";
  const statusDiff =
    getCoordinationSortRank(first.priority, firstStatus) -
    getCoordinationSortRank(second.priority, secondStatus);
  if (statusDiff !== 0) {
    return statusDiff;
  }

  const priorityDiff =
    PRIORITY_RANK[first.priority] - PRIORITY_RANK[second.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const firstSpawn =
    first.timer?.minSpawnTime.getTime() ?? Number.MAX_SAFE_INTEGER;
  const secondSpawn =
    second.timer?.minSpawnTime.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (firstSpawn !== secondSpawn) {
    return firstSpawn - secondSpawn;
  }

  return first.npcName.localeCompare(second.npcName);
}

function getCoordinationSortRank(
  priority: CoordinationPriority,
  status: EventRespawnWindowStatus,
) {
  if (priority === "CRITICAL") {
    return 0;
  }

  if (status === "OPEN") {
    return 1;
  }

  return 2 + WINDOW_STATUS_RANK[status];
}

function getNextSpawnAt(
  heroes: Array<{ timer: { minSpawnTime: Date } | null }>,
) {
  let nextSpawnAt: Date | null = null;

  for (const hero of heroes) {
    if (!hero.timer) {
      continue;
    }

    if (!nextSpawnAt || hero.timer.minSpawnTime < nextSpawnAt) {
      nextSpawnAt = hero.timer.minSpawnTime;
    }
  }

  return nextSpawnAt;
}
