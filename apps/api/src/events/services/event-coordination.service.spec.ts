import { db as prismaDb } from "#src/prisma/db";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import { attachPrismaOrmMock } from "#src/test/prisma-orm.mock";
import { TimersService } from "#src/timers/timers.service";
import { buildTimerKey } from "#src/timers/utils/timer-key";
import { mockFn } from "#src/test/mock-fn";
import { EventCoordinationService } from "./event-coordination.service.js";

const CoverageGapType = prismaDb.nativeEnums.public.CoverageGapType.members;
type CoverageGapType = (typeof CoverageGapType)[keyof typeof CoverageGapType];

describe("EventCoordinationService", () => {
  const now = new Date("2026-06-19T12:00:00.000Z");
  const guildId = "guild-1";
  const eventId = "event-1";

  const mockPrisma = {
    event: {
      findFirst: mockFn(),
    },
    eventMapCoverageGap: {
      findMany: mockFn(),
    },
  };

  const mockTimersService = {
    getTimersForEventHeroFilters: mockFn(),
  };

  let service: EventCoordinationService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();

    service = new EventCoordinationService(
      attachPrismaOrmMock(mockPrisma) as unknown as PrismaService,
      mockTimersService as unknown as TimersService,
    );

    mockPrisma.event.findFirst.mockResolvedValue({
      assignmentTimeoutMinutes: 7,
      id: eventId,
      world: "tempest",
      heroNpcs: [createHero()],
    });
    mockPrisma.eventMapCoverageGap.findMany.mockResolvedValue([]);
    mockTimersService.getTimersForEventHeroFilters.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws when event does not exist", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(null);

    await expect(service.getCoordination(guildId, eventId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("marks heroes without timers as idle and uses assigned maps as coverage", async () => {
    const result = await service.getCoordination(guildId, eventId);

    expect(result.assignmentTimeoutMinutes).toBe(7);
    expect(result.summary).toMatchObject({
      criticalCount: 0,
      warningCount: 0,
      coveredMaps: 1,
      totalMaps: 2,
      nextSpawnAt: null,
    });
    expect(result.heroes[0]).toMatchObject({
      heroId: "hero-1",
      timer: null,
      priority: "IDLE",
      recommendedAction: "NONE",
      coverage: {
        totalMaps: 2,
        assignedMaps: 1,
        coveredMaps: 1,
        unassignedMaps: 1,
        uncoveredMaps: 0,
        activeGapCount: 0,
      },
    });
  });

  it("marks open windows with active gaps as critical and recommends map action", async () => {
    mockTimersService.getTimersForEventHeroFilters.mockResolvedValue([
      createTimer({
        minSpawnTime: "2026-06-19T11:30:00.000Z",
        maxSpawnTime: "2026-06-19T12:30:00.000Z",
      }),
    ]);
    mockPrisma.eventMapCoverageGap.findMany.mockResolvedValue([
      {
        id: "gap-1",
        mapId: "map-2",
        heroNpcId: "hero-1",
        gapType: CoverageGapType.UNASSIGNED,
        startedAt: new Date("2026-06-19T11:45:00.000Z"),
        durationSeconds: null,
        map: {
          mapId: 102,
          mapName: "Map 2",
        },
      },
    ]);

    const result = await service.getCoordination(guildId, eventId);

    expect(result.summary.criticalCount).toBe(1);
    expect(result.summary.nextSpawnAt).toEqual(
      new Date("2026-06-19T11:30:00.000Z"),
    );
    expect(result.heroes[0]).toMatchObject({
      priority: "CRITICAL",
      recommendedAction: "ASSIGN_MAPS",
      timer: {
        status: "OPEN",
        overdueMs: null,
      },
      coverage: {
        coveredMaps: 1,
        unassignedMaps: 1,
        activeGapCount: 1,
      },
    });
    expect(result.heroes[0]?.activeGaps).toEqual([
      expect.objectContaining({
        mapId: "map-2",
        numericMapId: 102,
        mapName: "Map 2",
        gapType: CoverageGapType.UNASSIGNED,
        durationSeconds: 900,
      }),
    ]);
  });

  it("marks overdue windows as critical and recommends closing the window", async () => {
    mockTimersService.getTimersForEventHeroFilters.mockResolvedValue([
      createTimer({
        minSpawnTime: "2026-06-19T10:00:00.000Z",
        maxSpawnTime: "2026-06-19T11:55:00.000Z",
      }),
    ]);

    const result = await service.getCoordination(guildId, eventId);

    expect(result.heroes[0]).toMatchObject({
      priority: "CRITICAL",
      recommendedAction: "CLOSE_WINDOW",
      timer: {
        status: "OVERDUE",
        overdueMs: 300_000,
      },
    });
  });

  it("marks waiting windows with missing assignments as warnings", async () => {
    mockTimersService.getTimersForEventHeroFilters.mockResolvedValue([
      createTimer({
        minSpawnTime: "2026-06-19T12:30:00.000Z",
        maxSpawnTime: "2026-06-19T13:30:00.000Z",
      }),
    ]);

    const result = await service.getCoordination(guildId, eventId);

    expect(result.summary.warningCount).toBe(1);
    expect(result.heroes[0]).toMatchObject({
      priority: "WARNING",
      recommendedAction: "ASSIGN_MAPS",
      timer: {
        status: "WAITING",
      },
    });
  });

  it("does not count unassigned maps as covered during an active window without gap records", async () => {
    mockTimersService.getTimersForEventHeroFilters.mockResolvedValue([
      createTimer({
        minSpawnTime: "2026-06-19T11:30:00.000Z",
        maxSpawnTime: "2026-06-19T12:30:00.000Z",
      }),
    ]);

    const result = await service.getCoordination(guildId, eventId);

    expect(result.heroes[0]).toMatchObject({
      priority: "CRITICAL",
      recommendedAction: "ASSIGN_MAPS",
      coverage: {
        totalMaps: 2,
        assignedMaps: 1,
        coveredMaps: 1,
        unassignedMaps: 1,
        activeGapCount: 0,
      },
    });
  });

  it("recommends joining a map for uncovered active gaps", async () => {
    mockPrisma.event.findFirst.mockResolvedValue({
      id: eventId,
      world: "tempest",
      heroNpcs: [
        createHero({
          maps: [
            createMap({ id: "map-1", assigned: true }),
            createMap({ id: "map-2", assigned: true }),
          ],
        }),
      ],
    });
    mockTimersService.getTimersForEventHeroFilters.mockResolvedValue([
      createTimer({
        minSpawnTime: "2026-06-19T11:30:00.000Z",
        maxSpawnTime: "2026-06-19T12:30:00.000Z",
      }),
    ]);
    mockPrisma.eventMapCoverageGap.findMany.mockResolvedValue([
      {
        id: "gap-1",
        mapId: "map-2",
        heroNpcId: "hero-1",
        gapType: CoverageGapType.UNCOVERED,
        startedAt: new Date("2026-06-19T11:45:00.000Z"),
        durationSeconds: null,
        map: {
          mapId: 102,
          mapName: "Map 2",
        },
      },
    ]);

    const result = await service.getCoordination(guildId, eventId);

    expect(result.heroes[0]).toMatchObject({
      priority: "CRITICAL",
      recommendedAction: "JOIN_MAP",
      coverage: {
        coveredMaps: 1,
        unassignedMaps: 0,
        uncoveredMaps: 1,
        activeGapCount: 1,
      },
    });
  });

  it("sorts critical, active, waiting, then idle heroes", async () => {
    mockPrisma.event.findFirst.mockResolvedValue({
      id: eventId,
      world: "tempest",
      heroNpcs: [
        createHero({ id: "idle", npcId: 1, npcName: "Idle" }),
        createHero({ id: "waiting", npcId: 2, npcName: "Waiting" }),
        createHero({
          id: "active-clean",
          npcId: 3,
          npcName: "Active Clean",
          maps: [createMap({ id: "map-active", assigned: true })],
        }),
        createHero({ id: "overdue", npcId: 4, npcName: "Overdue" }),
      ],
    });
    mockTimersService.getTimersForEventHeroFilters.mockResolvedValue([
      createTimer({
        npcId: 2,
        npcName: "Waiting",
        minSpawnTime: "2026-06-19T12:20:00.000Z",
        maxSpawnTime: "2026-06-19T13:00:00.000Z",
      }),
      createTimer({
        npcId: 3,
        npcName: "Active Clean",
        minSpawnTime: "2026-06-19T11:30:00.000Z",
        maxSpawnTime: "2026-06-19T12:30:00.000Z",
      }),
      createTimer({
        npcId: 4,
        npcName: "Overdue",
        minSpawnTime: "2026-06-19T10:30:00.000Z",
        maxSpawnTime: "2026-06-19T11:30:00.000Z",
      }),
    ]);

    const result = await service.getCoordination(guildId, eventId);

    expect(result.heroes.map((hero) => hero.heroId)).toEqual([
      "overdue",
      "active-clean",
      "waiting",
      "idle",
    ]);
  });
});

function createHero(
  overrides: Partial<{
    id: string;
    npcId: number | null;
    npcName: string;
    npcIcon: string | null;
    npcLvl: number | null;
    maps: ReturnType<typeof createMap>[];
  }> = {},
) {
  return {
    id: overrides.id ?? "hero-1",
    npcId: overrides.npcId ?? 123,
    npcName: overrides.npcName ?? "Test Hero",
    npcIcon: overrides.npcIcon ?? "hero.png",
    npcLvl: overrides.npcLvl ?? 100,
    maps: overrides.maps ?? [
      createMap({ id: "map-1", assigned: true }),
      createMap({ id: "map-2", assigned: false }),
    ],
  };
}

function createMap({ id, assigned }: { id: string; assigned: boolean }) {
  return {
    id,
    mapId: id === "map-1" ? 101 : 102,
    mapName: id === "map-1" ? "Map 1" : "Map 2",
    assignedMembers: assigned ? [{ id: 1 }] : [],
  };
}

function createTimer({
  npcId = 123,
  npcName = "Test Hero",
  minSpawnTime,
  maxSpawnTime,
}: {
  npcId?: number;
  npcName?: string;
  minSpawnTime: string;
  maxSpawnTime: string;
}) {
  return {
    npcId,
    timerKey: buildTimerKey(npcId, npcName),
    world: "tempest",
    minSpawnTime: new Date(minSpawnTime),
    maxSpawnTime: new Date(maxSpawnTime),
    npc: {
      name: npcName,
      icon: "hero.png",
    },
  };
}
