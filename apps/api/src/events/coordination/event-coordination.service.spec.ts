import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
  vi,
} from "bun:test";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { Effect } from "effect";
import type { EventTimersPort } from "#src/events/respawn/event-timers.port";
import { buildTimerKey } from "#src/timers/timer-key";
import {
  makeEventCoordination,
  type EventCoordination,
} from "#src/events/coordination/event-coordination.service";
import type { EventCoordinationStore } from "#src/events/coordination/event-coordination.repository";

const CoverageGapType = {
  UNASSIGNED: "UNASSIGNED",
  UNCOVERED: "UNCOVERED",
} as const;

describe("EventCoordination", () => {
  const now = new Date("2026-06-19T12:00:00.000Z");
  const guildId = "guild-1";
  const eventId = "event-1";

  const findEvent = mock<EventCoordinationStore["findEvent"]>();
  const findActiveGaps = mock<EventCoordinationStore["findActiveGaps"]>();
  const repository = { findEvent, findActiveGaps };
  const getTimersForEventHeroFilters =
    mock<EventTimersPort["getTimersForEventHeroFilters"]>();
  const mockTimersService: EventTimersPort = {
    getTimersForEventHeroFilters,
    getEventRespawnTimer: () => Effect.die("Unexpected timer lookup"),
    openEventRespawnTimer: () => Effect.die("Unexpected timer mutation"),
    closeEventRespawnTimer: () => Effect.die("Unexpected timer mutation"),
    getActiveTimerKeys: () => Effect.die("Unexpected timer lookup"),
  };

  let service: EventCoordination;

  beforeEach(() => {
    setSystemTime(now);
    vi.clearAllMocks();

    service = makeEventCoordination(repository, mockTimersService);

    findEvent.mockReturnValue(
      Effect.succeed({
        assignmentTimeoutMinutes: 7,
        id: eventId,
        world: "tempest",
        heroNpcs: [createHero()],
      }),
    );
    findActiveGaps.mockReturnValue(Effect.succeed([]));
    getTimersForEventHeroFilters.mockReturnValue(Effect.succeed([]));
  });

  afterEach(() => {
    setSystemTime();
  });

  it("throws when event does not exist", async () => {
    findEvent.mockReturnValue(Effect.succeed(null));

    await expect(
      Effect.runPromise(service.getCoordination(guildId, eventId)),
    ).rejects.toThrow(ResourceNotFoundError);
  });

  it("marks heroes without timers as idle and uses assigned maps as coverage", async () => {
    const result = await Effect.runPromise(
      service.getCoordination(guildId, eventId),
    );

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
    getTimersForEventHeroFilters.mockReturnValue(
      Effect.succeed([
        createTimer({
          minSpawnTime: "2026-06-19T11:30:00.000Z",
          maxSpawnTime: "2026-06-19T12:30:00.000Z",
        }),
      ]),
    );
    findActiveGaps.mockReturnValue(
      Effect.succeed([
        {
          id: "gap-1",
          mapId: "map-2",
          heroNpcId: "hero-1",
          gapType: CoverageGapType.UNASSIGNED,
          startedAt: new Date("2026-06-19T11:45:00.000Z"),
          durationSeconds: null,
          endedAt: null,
          hadAssignedMembers: null,
          map: {
            mapId: 102,
            mapName: "Map 2",
          },
        },
      ]),
    );

    const result = await Effect.runPromise(
      service.getCoordination(guildId, eventId),
    );

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
    getTimersForEventHeroFilters.mockReturnValue(
      Effect.succeed([
        createTimer({
          minSpawnTime: "2026-06-19T10:00:00.000Z",
          maxSpawnTime: "2026-06-19T11:55:00.000Z",
        }),
      ]),
    );

    const result = await Effect.runPromise(
      service.getCoordination(guildId, eventId),
    );

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
    getTimersForEventHeroFilters.mockReturnValue(
      Effect.succeed([
        createTimer({
          minSpawnTime: "2026-06-19T12:30:00.000Z",
          maxSpawnTime: "2026-06-19T13:30:00.000Z",
        }),
      ]),
    );

    const result = await Effect.runPromise(
      service.getCoordination(guildId, eventId),
    );

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
    getTimersForEventHeroFilters.mockReturnValue(
      Effect.succeed([
        createTimer({
          minSpawnTime: "2026-06-19T11:30:00.000Z",
          maxSpawnTime: "2026-06-19T12:30:00.000Z",
        }),
      ]),
    );

    const result = await Effect.runPromise(
      service.getCoordination(guildId, eventId),
    );

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
    findEvent.mockReturnValue(
      Effect.succeed({
        assignmentTimeoutMinutes: 7,
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
      }),
    );
    getTimersForEventHeroFilters.mockReturnValue(
      Effect.succeed([
        createTimer({
          minSpawnTime: "2026-06-19T11:30:00.000Z",
          maxSpawnTime: "2026-06-19T12:30:00.000Z",
        }),
      ]),
    );
    findActiveGaps.mockReturnValue(
      Effect.succeed([
        {
          id: "gap-1",
          mapId: "map-2",
          heroNpcId: "hero-1",
          gapType: CoverageGapType.UNCOVERED,
          startedAt: new Date("2026-06-19T11:45:00.000Z"),
          durationSeconds: null,
          endedAt: null,
          hadAssignedMembers: null,
          map: {
            mapId: 102,
            mapName: "Map 2",
          },
        },
      ]),
    );

    const result = await Effect.runPromise(
      service.getCoordination(guildId, eventId),
    );

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
    findEvent.mockReturnValue(
      Effect.succeed({
        assignmentTimeoutMinutes: 7,
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
      }),
    );
    getTimersForEventHeroFilters.mockReturnValue(
      Effect.succeed([
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
      ]),
    );

    const result = await Effect.runPromise(
      service.getCoordination(guildId, eventId),
    );

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
    createdById: 1,
    guildId: "guild-1",
    latestRespBaseSeconds: 0,
    latestRespawnRandomness: 0,
    tempId: null,
    wasReset: false,
    windowOpenedAt: null,
    actorCharacterSnapshotId: null,
    actorCharacterLvl: null,
    deletedAt: null,
    createdAt: new Date(minSpawnTime),
    updatedAt: new Date(minSpawnTime),
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
