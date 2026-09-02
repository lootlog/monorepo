import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { getQueueToken } from "@nestjs/bullmq";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { RedisService } from "#src/redis/redis.service";
import { EventsService } from "./events.service.js";
import { EventAccessService } from "./services/event-access.service.js";
import { EventAccessRepository } from "./services/event-access.repository.js";
import { EventCatalogService } from "./services/event-catalog.service.js";
import { EventCatalogRepository } from "./services/event-catalog.repository.js";
import { EventReadCacheService } from "./services/event-read-cache.service.js";
import { EventPointsService } from "./services/event-points.service.js";
import { EventTrackingService } from "./services/event-tracking.service.js";
import { EventKillService } from "./services/event-kill.service.js";
import { EventQueueDiagnosticsService } from "./services/event-queue-diagnostics.service.js";
import { EventQueueDiagnosticsRepository } from "./services/event-queue-diagnostics.repository.js";
import { EventRespawnService } from "./services/event-respawn.service.js";
import { EventWrappedService } from "./services/event-wrapped.service.js";
import { EventCoordinationService } from "./services/event-coordination.service.js";
import { RESPAWN_WINDOW_QUEUE } from "./constants/respawn-queue.constant.js";
import { EVENT_HERO_KILL_QUEUE } from "./constants/event-hero-kill-queue.constant.js";
import { DEFAULT_ADVANCED_EVENT_SCORING_RULES } from "@lootlog/domain/scoring";
import { EVENT_HERO_KILL_JOB_NAME } from "./utils/event-hero-kill-job.js";

describe("EventsService", () => {
  let service: EventsService;

  const mockRepositoryBackend = {
    event: {
      create: mockFn(),
      findMany: mockFn(),
      findFirst: mockFn(),
      update: mockFn(),
      delete: mockFn(),
    },
    eventHeroNpc: {
      create: mockFn(),
      findFirst: mockFn(),
      findMany: mockFn(),
      update: mockFn(),
      delete: mockFn(),
      deleteMany: mockFn(),
    },
    eventMap: {
      create: mockFn(),
      findFirst: mockFn(),
      findMany: mockFn(),
      update: mockFn(),
      delete: mockFn(),
    },
    eventMapLocation: {
      create: mockFn(),
      findFirst: mockFn(),
      findMany: mockFn(),
      update: mockFn(),
      delete: mockFn(),
      aggregate: mockFn(),
    },
    userPinnedEvent: {
      deleteMany: mockFn(),
    },
    $transaction: mockFn(),
    $queryRaw: mockFn(),
  };

  const mockPointsService = {
    getRanking: mockFn(),
    recalculateEventPoints: mockFn(),
    getMemberPresenceStats: mockFn(),
    updateRankingAfterKill: mockFn(),
    updateKillPoint: mockFn(),
    updateRankingPoints: mockFn(),
    getRankingEditHistories: mockFn(),
  };

  const mockTrackingService = {
    assignMemberToMap: mockFn(),
    unassignMemberFromMap: mockFn(),
    getMemberByDiscordId: mockFn(),
    openUnassignedGap: mockFn(),
    closeUnassignedGap: mockFn(),
    openUncoveredGap: mockFn(),
    closeUncoveredGap: mockFn(),
    closeAllGapsForHero: mockFn(),
    getMapCoverageGaps: mockFn(),
    getHeroCoverageGaps: mockFn(),
    getActiveGapForMap: mockFn(),
    getActiveGapsForHero: mockFn(),
    handlePlayerPresenceChange: mockFn(),
    getHeroPresenceStats: mockFn(),
  };

  const mockKillService = {
    getEventHeroTimers: mockFn(),
    getEventHeroStats: mockFn(),
    checkAndRecordEventHeroKill: mockFn(),
    findActiveEventHeroByNpc: mockFn(),
    recordHeroKill: mockFn(),
    getHeroKillHistory: mockFn(),
    getEventKillHistory: mockFn(),
    getMemberKillHistory: mockFn(),
    getKillDetail: mockFn(),
    getKillTimelineData: mockFn(),
  };

  const mockRespawnService = {
    closeRespawnWindow: mockFn(),
    openRespawnWindow: mockFn(),
    getHeroRespawnConfig: mockFn(),
  };

  const mockWrappedService = {
    getWrapped: mockFn(),
  };

  const mockCoordinationService = {
    getCoordination: mockFn(),
  };

  const mockQueue = {
    getJobs: mockFn(),
    getJobCounts: mockFn(),
    isPaused: mockFn(),
    getWorkers: mockFn(),
    name: "respawn-window",
  };

  const mockEventHeroKillQueue = {
    add: mockFn(),
    name: "event-hero-kill",
  };

  const mockRedisService = {
    del: mockFn(),
    deleteByPattern: mockFn(),
  };

  const mockEventReadCache = {
    getGuildKey: mockFn(
      (guildId: string, scope: string) =>
        `event-read:${guildId}:guild:${scope}`,
    ),
    getEventKey: mockFn(
      (guildId: string, eventId: string, scope: string) =>
        `event-read:${guildId}:${eventId}:${scope}`,
    ),
    getOrSet: mockFn((_key: string, factory: () => Promise<unknown>) =>
      factory(),
    ),
    invalidateGuild: mockFn(),
    invalidateEvent: mockFn(),
  };

  const mockEventAccessRepository = {
    findHero: mockFn().mockImplementation((guildId, eventId, heroId) =>
      mockRepositoryBackend.eventHeroNpc.findFirst({
        where: { id: heroId, eventId, event: { guildId } },
      }),
    ),
    findMap: mockFn().mockImplementation((guildId, eventId, mapId) =>
      mockRepositoryBackend.eventMap.findFirst({
        where: {
          id: mapId,
          heroNpc: { eventId, event: { guildId } },
        },
        include: { heroNpc: true },
      }),
    ),
  };
  const mockQueueDiagnosticsRepository = {
    eventExists: mockFn().mockImplementation(async (guildId, eventId) =>
      Boolean(
        await mockRepositoryBackend.event.findFirst({
          where: { id: eventId, guildId },
          select: { id: true },
        }),
      ),
    ),
    findHeroIds: mockFn().mockImplementation(async (eventId) => {
      const heroes = await mockRepositoryBackend.eventHeroNpc.findMany({
        where: { eventId },
        select: { id: true },
      });
      return heroes.map(({ id }) => id);
    }),
  };
  const mockCatalogRepository = {
    createEvent: mockFn().mockImplementation((data, heroNpcs) =>
      mockRepositoryBackend.event.create({
        data: {
          ...data,
          ...(heroNpcs.length > 0 && {
            heroNpcs: {
              create: heroNpcs.map((npc) => ({
                npcId: npc.npcId,
                npcName: npc.npcName,
                maps: npc.maps
                  ? { create: npc.maps.map((map) => ({ ...map })) }
                  : undefined,
              })),
            },
          }),
        },
        include: {
          heroNpcs: {
            include: {
              maps: {
                orderBy: { mapId: "asc" },
                include: { assignedMembers: { select: expect.any(Object) } },
              },
            },
          },
        },
      }),
    ),
    findEvents: mockFn().mockImplementation((guildId, world, activeOnly, now) =>
      mockRepositoryBackend.event.findMany({
        where: {
          guildId,
          ...(world && { world }),
          ...(activeOnly && {
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            ],
          }),
        },
        select: expect.any(Object),
        orderBy: [{ createdAt: "desc" }],
      }),
    ),
    findOverview: mockFn().mockImplementation((guildId, eventId) =>
      mockRepositoryBackend.event.findFirst({
        where: { id: eventId, guildId },
        select: expect.any(Object),
      }),
    ),
    findEventMaps: mockFn().mockImplementation((guildId, eventId) =>
      mockRepositoryBackend.event.findFirst({
        where: { id: eventId, guildId },
        select: {
          id: true,
          heroNpcs: {
            select: {
              locations: { select: { maps: { orderBy: { mapId: "asc" } } } },
              maps: { orderBy: { mapId: "asc" } },
            },
          },
        },
      }),
    ),
    findScopedEvent: mockFn().mockImplementation((guildId, eventId) =>
      mockRepositoryBackend.event.findFirst({
        where: { id: eventId, guildId },
      }),
    ),
    updateEvent: mockFn().mockImplementation(
      (eventId, data, heroNpcs, clearPins) =>
        mockRepositoryBackend.$transaction(async (transactionClient) => {
          if (clearPins) {
            await transactionClient.userPinnedEvent.deleteMany({
              where: { eventId },
            });
          }
          if (heroNpcs) {
            await transactionClient.eventHeroNpc.deleteMany({
              where: { eventId },
            });
          }
          return transactionClient.event.update({
            where: { id: eventId },
            data: {
              ...data,
              ...(heroNpcs && {
                heroNpcs: {
                  create: heroNpcs.map((npc) => ({
                    npcId: npc.npcId,
                    npcName: npc.npcName,
                    maps: { create: npc.maps.map((map) => ({ ...map })) },
                  })),
                },
              }),
            },
            include: {
              heroNpcs: { include: { maps: { orderBy: { mapId: "asc" } } } },
            },
          });
        }),
    ),
    deleteEvent: mockFn().mockImplementation((eventId) =>
      mockRepositoryBackend.event.delete({ where: { id: eventId } }),
    ),
    findActiveEvent: mockFn().mockImplementation((guildId, eventId) =>
      mockRepositoryBackend.event.findFirst({
        where: { id: eventId, guildId, ...expect.any(Object) },
      }),
    ),
    findHero: mockFn().mockImplementation((guildId, eventId, heroId) =>
      mockRepositoryBackend.eventHeroNpc.findFirst({
        where: { id: heroId, eventId, event: { guildId } },
      }),
    ),
    createHero: mockFn().mockImplementation((eventId, hero, maps) =>
      mockRepositoryBackend.eventHeroNpc.create({
        data: { eventId, ...hero, maps: { create: maps } },
        include: { maps: { orderBy: { mapId: "asc" } } },
      }),
    ),
    updateHero: mockFn().mockImplementation((heroId, data) =>
      mockRepositoryBackend.eventHeroNpc.update({
        where: { id: heroId },
        data,
      }),
    ),
    deleteHero: mockFn().mockImplementation((heroId) =>
      mockRepositoryBackend.eventHeroNpc.delete({ where: { id: heroId } }),
    ),
    findMap: mockFn().mockImplementation((_guildId, eventId, heroId, mapId) =>
      mockRepositoryBackend.eventMap.findFirst({
        where: {
          id: mapId,
          heroNpcId: heroId,
          heroNpc: { eventId, event: expect.any(Object) },
        },
      }),
    ),
    findMapByNumericId: mockFn().mockImplementation((heroId, mapId) =>
      mockRepositoryBackend.eventMap.findFirst({
        where: { heroNpcId: heroId, mapId },
      }),
    ),
    createMap: mockFn().mockImplementation((heroNpcId, mapId, mapName) =>
      mockRepositoryBackend.eventMap.create({
        data: { heroNpcId, mapId, mapName },
        include: { maps: { orderBy: { mapId: "asc" } } },
      }),
    ),
    deleteMap: mockFn().mockImplementation((id) =>
      mockRepositoryBackend.eventMap.delete({ where: { id } }),
    ),
    findLocation: mockFn().mockImplementation((_guildId, eventId, heroId, id) =>
      mockRepositoryBackend.eventMapLocation.findFirst({
        where: {
          id,
          heroNpcId: heroId,
          heroNpc: { eventId, event: expect.any(Object) },
        },
      }),
    ),
    findLocationByName: mockFn().mockImplementation(
      (heroNpcId, name, excludedId) =>
        mockRepositoryBackend.eventMapLocation.findFirst({
          where: {
            heroNpcId,
            name,
            ...(excludedId && { id: { not: excludedId } }),
          },
        }),
    ),
    createLocation: mockFn().mockImplementation(async (heroNpcId, name) => {
      const result = await mockRepositoryBackend.eventMapLocation.aggregate({
        where: { heroNpcId },
        _max: { order: true },
      });
      return mockRepositoryBackend.eventMapLocation.create({
        data: { heroNpcId, name, order: (result._max.order ?? -1) + 1 },
        include: { maps: { orderBy: { mapId: "asc" } } },
      });
    }),
    updateLocation: mockFn().mockImplementation((id, name) =>
      mockRepositoryBackend.eventMapLocation.update({
        where: { id },
        data: { name },
        include: { maps: { orderBy: { mapId: "asc" } } },
      }),
    ),
    deleteLocation: mockFn().mockImplementation((id) =>
      mockRepositoryBackend.eventMapLocation.delete({ where: { id } }),
    ),
    findLocationsByIds: mockFn().mockImplementation((heroNpcId, ids) =>
      mockRepositoryBackend.eventMapLocation.findMany({
        where: { heroNpcId, id: { in: ids } },
      }),
    ),
    reorderLocations: mockFn().mockImplementation((ids) =>
      mockRepositoryBackend.$transaction(
        ids.map((id, order) =>
          mockRepositoryBackend.eventMapLocation.update({
            where: { id },
            data: { order },
          }),
        ),
      ),
    ),
    assignMapToLocation: mockFn().mockImplementation((id, locationId) =>
      mockRepositoryBackend.eventMap.update({
        where: { id },
        data: { locationId },
        include: expect.any(Object),
      }),
    ),
    findLocationsWithMaps: mockFn().mockImplementation((heroNpcId) =>
      mockRepositoryBackend.eventMapLocation.findMany({
        where: { heroNpcId },
        orderBy: { order: "asc" },
        include: { maps: { orderBy: { mapId: "asc" } } },
      }),
    ),
    findTimerNpc: mockFn().mockImplementation(async () => {
      const rows = await mockRepositoryBackend.$queryRaw();
      return rows[0]?.npc ?? null;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        EventAccessService,
        { provide: EventAccessRepository, useValue: mockEventAccessRepository },
        EventCatalogService,
        { provide: EventCatalogRepository, useValue: mockCatalogRepository },
        EventQueueDiagnosticsService,
        {
          provide: EventQueueDiagnosticsRepository,
          useValue: mockQueueDiagnosticsRepository,
        },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EventReadCacheService, useValue: mockEventReadCache },
        { provide: EventPointsService, useValue: mockPointsService },
        { provide: EventTrackingService, useValue: mockTrackingService },
        { provide: EventKillService, useValue: mockKillService },
        { provide: EventRespawnService, useValue: mockRespawnService },
        { provide: EventWrappedService, useValue: mockWrappedService },
        {
          provide: EventCoordinationService,
          useValue: mockCoordinationService,
        },
        { provide: getQueueToken(RESPAWN_WINDOW_QUEUE), useValue: mockQueue },
        {
          provide: getQueueToken(EVENT_HERO_KILL_QUEUE),
          useValue: mockEventHeroKillQueue,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ========== EVENT CRUD ==========

  describe("createEvent", () => {
    const guildId = "guild-1";
    const createDto = {
      name: "Test Event",
      world: "tempest",
      heroNpcs: [
        {
          npcId: 123,
          npcName: "Test Hero",
          maps: [{ mapId: 1, mapName: "Map One" }],
        },
      ],
    };

    it("should create event with hero npcs", async () => {
      const createdEvent = {
        id: "event-1",
        ...createDto,
        guildId,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: null,
        createdAt: new Date(Date.now() - 60_000),
      };
      mockRepositoryBackend.event.create.mockResolvedValue(createdEvent);

      const result = await service.createEvent(guildId, createDto);

      expect(mockRepositoryBackend.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Test Event",
          world: "tempest",
          guildId,
          heroNpcs: {
            create: expect.arrayContaining([
              expect.objectContaining({
                npcId: 123,
                npcName: "Test Hero",
              }),
            ]),
          },
        }),
        include: expect.any(Object),
      });
      expect(result).toEqual({
        ...createdEvent,
        active: true,
      });
    });

    it("should request created hero maps sorted by mapId", async () => {
      mockRepositoryBackend.event.create.mockResolvedValue({});

      await service.createEvent(guildId, createDto);

      const queryArg = mockRepositoryBackend.event.create.mock.calls[0][0];
      expect(queryArg.include.heroNpcs.include.maps.orderBy).toEqual({
        mapId: "asc",
      });
    });

    it("should create event without hero npcs", async () => {
      const dtoWithoutHeroes = { name: "Test Event", world: "tempest" };
      const createdEvent = { id: "event-1", ...dtoWithoutHeroes, guildId };
      mockRepositoryBackend.event.create.mockResolvedValue(createdEvent);

      await service.createEvent(guildId, dtoWithoutHeroes);

      expect(mockRepositoryBackend.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Test Event",
          world: "tempest",
          guildId,
        }),
        include: expect.any(Object),
      });
    });

    it("should persist advanced scoring rules on create", async () => {
      const createDtoWithAdvancedScoring = {
        name: "Advanced Event",
        world: "tempest",
        scoringMode: "ADVANCED" as const,
        scoringRules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
      };
      mockRepositoryBackend.event.create.mockResolvedValue({
        id: "event-advanced",
        ...createDtoWithAdvancedScoring,
        guildId,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: null,
        createdAt: new Date(Date.now() - 60_000),
      });

      await service.createEvent(guildId, createDtoWithAdvancedScoring);

      expect(mockRepositoryBackend.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scoringMode: "ADVANCED",
          scoringRules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
        }),
        include: expect.any(Object),
      });
    });

    it("should handle startsAt and endsAt dates", async () => {
      const dtoWithDates = {
        name: "Test Event",
        world: "tempest",
        startsAt: "2024-01-01T00:00:00Z",
        endsAt: "2024-01-31T23:59:59Z",
      };
      mockRepositoryBackend.event.create.mockResolvedValue({});

      await service.createEvent(guildId, dtoWithDates);

      expect(mockRepositoryBackend.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startsAt: new Date("2024-01-01T00:00:00Z"),
          endsAt: new Date("2024-01-31T23:59:59Z"),
        }),
        include: expect.any(Object),
      });
    });

    it("should normalize world to lowercase and trim spaces", async () => {
      const dtoWithMixedCaseWorld = {
        name: "Test Event",
        world: "  Tempest  ",
      };
      mockRepositoryBackend.event.create.mockResolvedValue({});

      await service.createEvent(guildId, dtoWithMixedCaseWorld);

      expect(mockRepositoryBackend.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          world: "tempest",
        }),
        include: expect.any(Object),
      });
    });

    it("should throw when world is empty after trim", async () => {
      await expect(
        service.createEvent(guildId, {
          name: "Test Event",
          world: "   ",
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepositoryBackend.event.create).not.toHaveBeenCalled();
    });
  });

  describe("getEvents", () => {
    const guildId = "guild-1";

    it("should return active events by default", async () => {
      const now = Date.now();
      const events = [
        {
          id: "event-1",
          startsAt: new Date(now - 60_000),
          endsAt: new Date(now + 60_000),
          createdAt: new Date(now - 120_000),
          heroNpcs: [],
        },
      ];
      mockRepositoryBackend.event.findMany.mockResolvedValue(events);

      const result = await service.getEvents(guildId);

      expect(mockRepositoryBackend.event.findMany).toHaveBeenCalledWith({
        where: {
          guildId,
          AND: [
            {
              OR: [{ startsAt: null }, { startsAt: { lte: expect.any(Date) } }],
            },
            {
              OR: [{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }],
            },
          ],
        },
        select: expect.any(Object),
        orderBy: [{ createdAt: "desc" }],
      });
      expect(result).toEqual([
        expect.objectContaining({
          id: "event-1",
          active: true,
        }),
      ]);
    });

    it("should filter by world when provided", async () => {
      mockRepositoryBackend.event.findMany.mockResolvedValue([]);

      await service.getEvents(guildId, "tempest");

      expect(mockRepositoryBackend.event.findMany).toHaveBeenCalledWith({
        where: {
          guildId,
          world: "tempest",
          AND: [
            {
              OR: [{ startsAt: null }, { startsAt: { lte: expect.any(Date) } }],
            },
            {
              OR: [{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }],
            },
          ],
        },
        select: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it("should return all events when activeOnly is false", async () => {
      mockRepositoryBackend.event.findMany.mockResolvedValue([]);

      await service.getEvents(guildId, undefined, false);

      expect(mockRepositoryBackend.event.findMany).toHaveBeenCalledWith({
        where: { guildId },
        select: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });
  });

  describe("getEvent", () => {
    const guildId = "guild-1";
    const eventId = "event-1";

    it("should return event when found", async () => {
      const event = {
        id: eventId,
        guildId,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 60_000),
        createdAt: new Date(Date.now() - 120_000),
      };
      mockRepositoryBackend.event.findFirst.mockResolvedValue(event);

      const result = await service.getEvent(guildId, eventId);

      expect(result).toEqual({
        ...event,
        active: true,
      });
    });

    it("should throw NotFoundException when event not found", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(null);

      await expect(service.getEvent(guildId, eventId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getEventOverview", () => {
    const guildId = "guild-1";
    const eventId = "event-1";

    it("should return event overview when found", async () => {
      const event = {
        id: eventId,
        guildId,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 60_000),
        createdAt: new Date(Date.now() - 120_000),
      };
      mockRepositoryBackend.event.findFirst.mockResolvedValue(event);

      const result = await service.getEventOverview(guildId, eventId);

      expect(result).toEqual({
        ...event,
        active: true,
      });
    });

    it("should throw NotFoundException when overview event not found", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(null);

      await expect(service.getEventOverview(guildId, eventId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getEventMaps", () => {
    const guildId = "guild-1";
    const eventId = "event-1";

    it("should return event maps when found", async () => {
      const event = { id: eventId, heroNpcs: [] };
      mockRepositoryBackend.event.findFirst.mockResolvedValue(event);

      const result = await service.getEventMaps(guildId, eventId);

      expect(result).toEqual(event);
    });

    it("should request maps sorted by mapId in each location and ungrouped maps", async () => {
      const event = { id: eventId, heroNpcs: [] };
      mockRepositoryBackend.event.findFirst.mockResolvedValue(event);

      await service.getEventMaps(guildId, eventId);

      const queryArg = mockRepositoryBackend.event.findFirst.mock.calls[0][0];

      expect(
        queryArg.select.heroNpcs.select.locations.select.maps.orderBy,
      ).toEqual({
        mapId: "asc",
      });
      expect(queryArg.select.heroNpcs.select.maps.orderBy).toEqual({
        mapId: "asc",
      });
    });

    it("should throw NotFoundException when maps event not found", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(null);

      await expect(service.getEventMaps(guildId, eventId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateEvent", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const existingEvent = {
      id: eventId,
      guildId,
      startsAt: new Date(Date.now() - 60_000),
      endsAt: null,
      createdAt: new Date(Date.now() - 120_000),
      basePointsPerKill: 100,
      scoringMode: "SIMPLE",
      scoringRules: null,
    };

    it("should throw NotFoundException when event not found", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(null);

      await expect(
        service.updateEvent(guildId, eventId, { name: "Updated" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update event successfully", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(existingEvent);
      mockRepositoryBackend.$transaction.mockImplementation((callback) =>
        callback(mockRepositoryBackend),
      );
      mockRepositoryBackend.event.update.mockResolvedValue({
        ...existingEvent,
        name: "Updated",
      });

      await service.updateEvent(guildId, eventId, { name: "Updated" });

      expect(mockRepositoryBackend.$transaction).toHaveBeenCalled();
    });

    it("should request updated hero maps sorted by mapId", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(existingEvent);
      mockRepositoryBackend.$transaction.mockImplementation((callback) =>
        callback(mockRepositoryBackend),
      );
      mockRepositoryBackend.event.update.mockResolvedValue({});

      await service.updateEvent(guildId, eventId, { name: "Updated" });

      const callArg = mockRepositoryBackend.event.update.mock.calls[0][0];
      expect(callArg.include.heroNpcs.include.maps.orderBy).toEqual({
        mapId: "asc",
      });
    });

    it("should set endsAt when provided", async () => {
      const newEndsAt = new Date(Date.now() + 60_000);
      mockRepositoryBackend.event.findFirst.mockResolvedValue(existingEvent);
      mockRepositoryBackend.$transaction.mockImplementation((callback) =>
        callback(mockRepositoryBackend),
      );
      mockRepositoryBackend.event.update.mockResolvedValue({});

      await service.updateEvent(guildId, eventId, {
        endsAt: newEndsAt.toISOString(),
      });

      expect(mockRepositoryBackend.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            endsAt: newEndsAt,
          }),
        }),
      );
    });

    it("removes pins when an active event is ended", async () => {
      const endedAt = new Date(Date.now() - 1);
      mockRepositoryBackend.event.findFirst.mockResolvedValue(existingEvent);
      mockRepositoryBackend.$transaction.mockImplementation((callback) =>
        callback(mockRepositoryBackend),
      );
      mockRepositoryBackend.event.update.mockResolvedValue({
        ...existingEvent,
        endsAt: endedAt,
      });

      await service.updateEvent(guildId, eventId, {
        endsAt: endedAt.toISOString(),
      });

      expect(
        mockRepositoryBackend.userPinnedEvent.deleteMany,
      ).toHaveBeenCalledWith({ where: { eventId } });
    });

    it("removes stale pins before an inactive event is resumed", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue({
        ...existingEvent,
        endsAt: new Date(Date.now() - 60_000),
      });
      mockRepositoryBackend.$transaction.mockImplementation((callback) =>
        callback(mockRepositoryBackend),
      );
      mockRepositoryBackend.event.update.mockResolvedValue(existingEvent);

      await service.updateEvent(guildId, eventId, { endsAt: null });

      expect(
        mockRepositoryBackend.userPinnedEvent.deleteMany,
      ).toHaveBeenCalledWith({ where: { eventId } });
    });

    it("should persist advanced scoring rules on update", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(existingEvent);
      mockRepositoryBackend.$transaction.mockImplementation((callback) =>
        callback(mockRepositoryBackend),
      );
      mockRepositoryBackend.event.update.mockResolvedValue({
        ...existingEvent,
        scoringMode: "ADVANCED",
        scoringRules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
      });

      await service.updateEvent(guildId, eventId, {
        scoringMode: "ADVANCED",
        scoringRules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
      });

      expect(mockRepositoryBackend.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scoringMode: "ADVANCED",
            scoringRules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
          }),
        }),
      );
    });

    it("should not recalculate points automatically when basePointsPerKill changes", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(existingEvent);
      mockRepositoryBackend.$transaction.mockImplementation((callback) =>
        callback(mockRepositoryBackend),
      );
      mockRepositoryBackend.event.update.mockResolvedValue({});

      await service.updateEvent(guildId, eventId, { basePointsPerKill: 200 });

      expect(mockPointsService.recalculateEventPoints).not.toHaveBeenCalled();
    });

    it("should recalculate points manually via dedicated method", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue({
        id: eventId,
        basePointsPerKill: 150,
      });

      const result = await service.recalculateEventPointsForEvent(
        guildId,
        eventId,
      );

      expect(mockPointsService.recalculateEventPoints).toHaveBeenCalledWith(
        eventId,
        150,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe("deleteEvent", () => {
    const guildId = "guild-1";
    const eventId = "event-1";

    it("should throw NotFoundException when event not found", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(null);

      await expect(service.deleteEvent(guildId, eventId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should hard delete event and remove pending jobs", async () => {
      const removeEventJob = mockFn().mockResolvedValue(undefined);
      const removeOtherEventJob = mockFn().mockResolvedValue(undefined);

      mockRepositoryBackend.event.findFirst.mockResolvedValue({ id: eventId });
      mockQueue.getJobs
        .mockResolvedValueOnce([
          { data: { eventId }, remove: removeEventJob },
          { data: { eventId: "event-2" }, remove: removeOtherEventJob },
        ])
        .mockResolvedValueOnce([{ data: { eventId }, remove: removeEventJob }]);
      mockRepositoryBackend.event.delete.mockResolvedValue({});

      const result = await service.deleteEvent(guildId, eventId);

      expect(removeEventJob).toHaveBeenCalledTimes(2);
      expect(removeOtherEventJob).not.toHaveBeenCalled();
      expect(mockRepositoryBackend.event.delete).toHaveBeenCalledWith({
        where: { id: eventId },
      });
      expect(result).toEqual({ success: true });
    });

    it("should delete inactive event too", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue({
        id: eventId,
        active: false,
      });
      mockQueue.getJobs.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockRepositoryBackend.event.delete.mockResolvedValue({});

      await service.deleteEvent(guildId, eventId);

      expect(mockRepositoryBackend.event.delete).toHaveBeenCalledWith({
        where: { id: eventId },
      });
    });
  });

  // ========== HERO MANAGEMENT ==========

  describe("createHero", () => {
    const guildId = "guild-1";
    const eventId = "event-1";

    it("should throw NotFoundException when event not found", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(null);

      await expect(
        service.createHero(guildId, eventId, { npcName: "Hero" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should create hero with provided npcId", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue({
        id: eventId,
        world: "tempest",
      });
      mockRepositoryBackend.eventHeroNpc.create.mockResolvedValue({});

      await service.createHero(guildId, eventId, {
        npcId: 123,
        npcName: "Hero",
      });

      expect(mockRepositoryBackend.eventHeroNpc.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId,
          npcId: 123,
          npcName: "Hero",
        }),
        include: expect.any(Object),
      });
    });

    it("should request created hero maps sorted by mapId", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue({
        id: eventId,
        world: "tempest",
      });
      mockRepositoryBackend.eventHeroNpc.create.mockResolvedValue({});

      await service.createHero(guildId, eventId, {
        npcId: 123,
        npcName: "Hero",
      });

      const queryArg =
        mockRepositoryBackend.eventHeroNpc.create.mock.calls[0][0];
      expect(queryArg.include.maps.orderBy).toEqual({ mapId: "asc" });
    });

    it("should lookup npcId from timers when not provided", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue({
        id: eventId,
        world: "tempest",
      });
      mockRepositoryBackend.$queryRaw.mockResolvedValue([
        { npc: { id: 456, name: "Hero", icon: "hero.gif" } },
      ]);
      mockRepositoryBackend.eventHeroNpc.create.mockResolvedValue({});

      await service.createHero(guildId, eventId, { npcName: "Hero" });

      expect(mockRepositoryBackend.eventHeroNpc.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          npcId: 456,
          npcName: "Hero",
          npcIcon: "hero.gif",
        }),
        include: expect.any(Object),
      });
    });
  });

  describe("updateHero", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should throw NotFoundException when hero not found", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.updateHero(guildId, eventId, heroId, { npcName: "Updated" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update hero name", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
        npcId: null,
        npcName: "Current Hero",
      });
      mockRepositoryBackend.eventHeroNpc.update.mockResolvedValue({});

      await service.updateHero(guildId, eventId, heroId, {
        npcName: "Updated",
      });

      expect(mockRepositoryBackend.eventHeroNpc.update).toHaveBeenCalledWith({
        where: { id: heroId },
        data: { npcName: "Updated" },
      });
    });

    // it("should block renaming hero after npcId is set", async () => {
    //   mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue({
    //     id: heroId,
    //     npcId: 123,
    //     npcName: "Current Hero",
    //   });

    //   await expect(
    //     service.updateHero(guildId, eventId, heroId, { npcName: "Updated" }),
    //   ).rejects.toThrow(BadRequestException);

    //   expect(mockRepositoryBackend.eventHeroNpc.update).not.toHaveBeenCalled();
    // });
  });

  describe("deleteHero", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should throw NotFoundException when hero not found", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteHero(guildId, eventId, heroId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should delete hero", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockRepositoryBackend.eventHeroNpc.delete.mockResolvedValue({});

      const result = await service.deleteHero(guildId, eventId, heroId);

      expect(mockRepositoryBackend.eventHeroNpc.delete).toHaveBeenCalledWith({
        where: { id: heroId },
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ========== MAP MANAGEMENT ==========

  describe("addMap", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should throw NotFoundException when hero not found", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.addMap(guildId, eventId, heroId, {
          mapId: 1,
          mapName: "Map",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when map already exists", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockRepositoryBackend.eventMap.findFirst.mockResolvedValue({
        id: "map-1",
      });

      await expect(
        service.addMap(guildId, eventId, heroId, {
          mapId: 1,
          mapName: "Map",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create map and open unassigned gap", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockRepositoryBackend.eventMap.findFirst.mockResolvedValue(null);
      mockRepositoryBackend.eventMap.create.mockResolvedValue({
        id: "new-map-id",
        heroNpcId: heroId,
      });

      await service.addMap(guildId, eventId, heroId, {
        mapId: 1,
        mapName: "Map",
      });

      expect(mockRepositoryBackend.eventMap.create).toHaveBeenCalled();
      expect(mockTrackingService.openUnassignedGap).toHaveBeenCalledWith(
        "new-map-id",
        heroId,
      );
    });
  });

  describe("deleteMap", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";
    const mapId = "map-1";

    it("should throw NotFoundException when map not found", async () => {
      mockRepositoryBackend.eventMap.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMap(guildId, eventId, heroId, mapId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should delete map", async () => {
      mockRepositoryBackend.eventMap.findFirst.mockResolvedValue({ id: mapId });
      mockRepositoryBackend.eventMap.delete.mockResolvedValue({});

      const result = await service.deleteMap(guildId, eventId, heroId, mapId);

      expect(mockRepositoryBackend.eventMap.delete).toHaveBeenCalledWith({
        where: { id: mapId },
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ========== LOCATION MANAGEMENT ==========

  describe("createLocation", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should throw NotFoundException when hero not found", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.createLocation(guildId, eventId, heroId, { name: "Location" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when location name exists", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockRepositoryBackend.eventMapLocation.findFirst.mockResolvedValue({
        id: "loc-1",
      });

      await expect(
        service.createLocation(guildId, eventId, heroId, { name: "Location" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create location with correct order", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockRepositoryBackend.eventMapLocation.findFirst.mockResolvedValue(null);
      mockRepositoryBackend.eventMapLocation.aggregate.mockResolvedValue({
        _max: { order: 2 },
      });
      mockRepositoryBackend.eventMapLocation.create.mockResolvedValue({});

      await service.createLocation(guildId, eventId, heroId, {
        name: "Location",
      });

      expect(
        mockRepositoryBackend.eventMapLocation.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          heroNpcId: heroId,
          name: "Location",
          order: 3,
        }),
        include: expect.any(Object),
      });
    });

    it("should request location maps sorted by mapId", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockRepositoryBackend.eventMapLocation.findFirst.mockResolvedValue(null);
      mockRepositoryBackend.eventMapLocation.aggregate.mockResolvedValue({
        _max: { order: 2 },
      });
      mockRepositoryBackend.eventMapLocation.create.mockResolvedValue({});

      await service.createLocation(guildId, eventId, heroId, {
        name: "Location",
      });

      const queryArg =
        mockRepositoryBackend.eventMapLocation.create.mock.calls[0][0];
      expect(queryArg.include.maps.orderBy).toEqual({ mapId: "asc" });
    });
  });

  describe("updateLocation", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";
    const locationId = "loc-1";

    it("should throw NotFoundException when location not found", async () => {
      mockRepositoryBackend.eventMapLocation.findFirst.mockResolvedValue(null);

      await expect(
        service.updateLocation(guildId, eventId, heroId, locationId, {
          name: "Updated",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should request updated location maps sorted by mapId", async () => {
      mockRepositoryBackend.eventMapLocation.findFirst
        .mockResolvedValueOnce({
          id: locationId,
          name: "Location",
        })
        .mockResolvedValueOnce(null);
      mockRepositoryBackend.eventMapLocation.update.mockResolvedValue({});

      await service.updateLocation(guildId, eventId, heroId, locationId, {
        name: "Updated",
      });

      const queryArg =
        mockRepositoryBackend.eventMapLocation.update.mock.calls[0][0];
      expect(queryArg.include.maps.orderBy).toEqual({ mapId: "asc" });
    });
  });

  describe("getLocations", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should throw NotFoundException when hero not found", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.getLocations(guildId, eventId, heroId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should request locations with maps sorted by mapId", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockRepositoryBackend.eventMapLocation.findMany.mockResolvedValue([]);

      await service.getLocations(guildId, eventId, heroId);

      expect(
        mockRepositoryBackend.eventMapLocation.findMany,
      ).toHaveBeenCalledWith({
        where: { heroNpcId: heroId },
        orderBy: { order: "asc" },
        include: expect.objectContaining({
          maps: expect.objectContaining({
            orderBy: { mapId: "asc" },
          }),
        }),
      });
    });
  });

  describe("reorderLocations", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should throw NotFoundException when hero not found", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.reorderLocations(guildId, eventId, heroId, {
          locationIds: ["loc-1", "loc-2"],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when some locations not found", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockRepositoryBackend.eventMapLocation.findMany.mockResolvedValue([
        { id: "loc-1" },
      ]); // Only 1 found

      await expect(
        service.reorderLocations(guildId, eventId, heroId, {
          locationIds: ["loc-1", "loc-2"],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reorder locations in transaction", async () => {
      mockRepositoryBackend.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockRepositoryBackend.eventMapLocation.findMany.mockResolvedValue([
        { id: "loc-1" },
        { id: "loc-2" },
      ]);
      mockRepositoryBackend.$transaction.mockResolvedValue([]);

      const result = await service.reorderLocations(guildId, eventId, heroId, {
        locationIds: ["loc-2", "loc-1"],
      });

      expect(mockRepositoryBackend.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  // ========== DELEGATION TESTS ==========

  describe("delegation to TrackingService", () => {
    it("should delegate assignMemberToMap", async () => {
      await service.assignMemberToMap("guild-1", "event-1", "map-1", 1);
      expect(mockTrackingService.assignMemberToMap).toHaveBeenCalledWith(
        "guild-1",
        "event-1",
        "map-1",
        1,
      );
    });

    it("should delegate unassignMemberFromMap", async () => {
      await service.unassignMemberFromMap("guild-1", "event-1", "map-1", 1);
      expect(mockTrackingService.unassignMemberFromMap).toHaveBeenCalledWith(
        "guild-1",
        "event-1",
        "map-1",
        1,
      );
    });

    it("should delegate handlePlayerPresenceChange", async () => {
      await service.handlePlayerPresenceChange(
        "guild-1",
        "Map One",
        "discord-123",
        true,
        false,
      );
      expect(
        mockTrackingService.handlePlayerPresenceChange,
      ).toHaveBeenCalledWith("guild-1", "Map One", "discord-123", true, false);
    });

    it("should delegate coverage gap methods", async () => {
      await service.openUnassignedGap("map-1", "hero-1");
      expect(mockTrackingService.openUnassignedGap).toHaveBeenCalledWith(
        "map-1",
        "hero-1",
      );

      await service.closeUnassignedGap("map-1");
      expect(mockTrackingService.closeUnassignedGap).toHaveBeenCalledWith(
        "map-1",
      );
    });
  });

  describe("delegation to PointsService", () => {
    it("should delegate getRanking", async () => {
      await service.getRanking("guild-1", "event-1");
      expect(mockPointsService.getRanking).toHaveBeenCalledWith(
        "guild-1",
        "event-1",
      );
    });

    it("should delegate updateKillPoint", async () => {
      await service.updateKillPoint(
        "guild-1",
        "event-1",
        "kill-1",
        "point-1",
        50,
        "manual note",
        "user-1",
      );
      expect(mockPointsService.updateKillPoint).toHaveBeenCalledWith(
        "guild-1",
        "event-1",
        "kill-1",
        "point-1",
        50,
        "manual note",
        "user-1",
      );
    });

    it("should delegate updateRankingPoints", async () => {
      await service.updateRankingPoints(
        "guild-1",
        "event-1",
        "ranking-1",
        42,
        "ranking note",
        "user-1",
      );
      expect(mockPointsService.updateRankingPoints).toHaveBeenCalledWith(
        "guild-1",
        "event-1",
        "ranking-1",
        42,
        "ranking note",
        "user-1",
      );
    });
  });

  describe("delegation to KillService", () => {
    it("should enqueue event hero kill check job with deterministic jobId", async () => {
      const params = {
        guildId: "guild-1",
        world: "tempest",
        npcId: 123,
        npcName: "Hero",
        npcIcon: "hero.gif",
        npcLvl: 250,
        timerData: {
          minSpawnTime: new Date("2026-02-18T10:00:00.000Z"),
          maxSpawnTime: new Date("2026-02-18T12:00:00.000Z"),
          memberId: 1,
          previousMinSpawnTime: new Date("2026-02-18T08:00:00.000Z"),
          previousMaxSpawnTime: new Date("2026-02-18T09:00:00.000Z"),
          windowOpenedAt: new Date("2026-02-18T08:00:00.000Z"),
        },
      } as const;

      await service.enqueueEventHeroKillCheck(params);

      expect(mockEventHeroKillQueue.add).toHaveBeenCalledWith(
        EVENT_HERO_KILL_JOB_NAME,
        expect.objectContaining({
          guildId: "guild-1",
          world: "tempest",
          npcId: 123,
          isManualClose: false,
          timerData: expect.objectContaining({
            minSpawnTime: "2026-02-18T10:00:00.000Z",
            windowOpenedAt: "2026-02-18T08:00:00.000Z",
          }),
        }),
        expect.objectContaining({
          attempts: 5,
          backoff: { type: "exponential", delay: 1000 },
          jobId: "event-hero-kill-guild-1-tempest-123-1771401600000-timer",
        }),
      );
    });

    it("should delegate getEventHeroTimers", async () => {
      await service.getEventHeroTimers("guild-1", "event-1", "tempest");
      expect(mockKillService.getEventHeroTimers).toHaveBeenCalledWith(
        "guild-1",
        "event-1",
        "tempest",
      );
    });

    it("should delegate checkAndRecordEventHeroKill", async () => {
      const params = {
        guildId: "guild-1",
        world: "tempest",
        npcId: 123,
        npcName: "Hero",
        npcIcon: "hero.gif",
        timerData: {} as Parameters<
          typeof service.checkAndRecordEventHeroKill
        >[0]["timerData"],
      };
      await service.checkAndRecordEventHeroKill(params);
      expect(mockKillService.checkAndRecordEventHeroKill).toHaveBeenCalled();
    });

    it("should delegate getKillDetail", async () => {
      await service.getKillDetail("guild-1", "event-1", "hero-1", "kill-1");
      expect(mockKillService.getKillDetail).toHaveBeenCalledWith(
        "guild-1",
        "event-1",
        "hero-1",
        "kill-1",
      );
    });
  });

  describe("delegation to RespawnService", () => {
    it("should delegate closeRespawnWindow", async () => {
      await service.closeRespawnWindow("guild-1", "event-1", "hero-1", {});
      expect(mockRespawnService.closeRespawnWindow).toHaveBeenCalledWith(
        "guild-1",
        "event-1",
        "hero-1",
        {},
      );
    });

    it("should delegate openRespawnWindow", async () => {
      const options = { minSpawnTime: new Date(), maxSpawnTime: new Date() };
      await service.openRespawnWindow("guild-1", "event-1", "hero-1", options);
      expect(mockRespawnService.openRespawnWindow).toHaveBeenCalledWith(
        "guild-1",
        "event-1",
        "hero-1",
        options,
      );
    });

    it("should delegate getHeroRespawnConfig", async () => {
      await service.getHeroRespawnConfig("guild-1", "event-1", "hero-1");
      expect(mockRespawnService.getHeroRespawnConfig).toHaveBeenCalledWith(
        "guild-1",
        "event-1",
        "hero-1",
      );
    });
  });

  // ========== MONITORING ==========

  describe("getAutoCloseJobsStatus", () => {
    const guildId = "guild-1";
    const eventId = "event-1";

    it("should throw NotFoundException when event not found", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(null);

      await expect(
        service.getAutoCloseJobsStatus(guildId, eventId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return job status for event heroes", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue({ id: eventId });
      mockRepositoryBackend.eventHeroNpc.findMany.mockResolvedValue([
        { id: "hero-1" },
        { id: "hero-2" },
      ]);

      const pendingJob = {
        id: "job-1",
        data: { heroId: "hero-1" },
        timestamp: Date.now(),
        opts: {},
      };
      const delayedJob = {
        id: "job-2",
        data: { heroId: "hero-2" },
        timestamp: Date.now(),
        opts: { delay: 60000 },
      };
      const failedJob = {
        id: "job-3",
        data: { heroId: "hero-1" },
        failedReason: "Test error",
      };

      mockQueue.getJobs
        .mockResolvedValueOnce([pendingJob]) // waiting, active
        .mockResolvedValueOnce([delayedJob]) // delayed
        .mockResolvedValueOnce([failedJob]); // failed

      const result = await service.getAutoCloseJobsStatus(guildId, eventId);

      expect(result.pending.count).toBe(1);
      expect(result.delayed.count).toBe(1);
      expect(result.failed.count).toBe(1);
      expect(result.failed.jobs[0].failedReason).toBe("Test error");
    });

    it("should filter out jobs for heroes not in this event", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue({ id: eventId });
      mockRepositoryBackend.eventHeroNpc.findMany.mockResolvedValue([
        { id: "hero-1" },
      ]);

      const eventJob = { id: "job-1", data: { heroId: "hero-1" } };
      const otherJob = { id: "job-2", data: { heroId: "other-hero" } };

      mockQueue.getJobs
        .mockResolvedValueOnce([eventJob, otherJob])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getAutoCloseJobsStatus(guildId, eventId);

      expect(result.pending.count).toBe(1);
      expect(result.pending.jobs[0].heroId).toBe("hero-1");
    });
  });

  describe("getQueueHealth", () => {
    const guildId = "guild-1";
    const eventId = "event-1";

    it("should throw NotFoundException when event not found", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue(null);

      await expect(service.getQueueHealth(guildId, eventId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return queue health status", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue({ id: eventId });

      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 1,
        delayed: 10,
      });
      mockQueue.isPaused.mockResolvedValue(false);
      mockQueue.getWorkers.mockResolvedValue([{}, {}]); // 2 workers

      const result = await service.getQueueHealth(guildId, eventId);

      expect(result).toEqual({
        queueName: "respawn-window",
        isReady: true,
        isPaused: false,
        jobCounts: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 1,
          delayed: 10,
        },
        workers: 2,
      });
    });

    it("should indicate not ready when no workers", async () => {
      mockRepositoryBackend.event.findFirst.mockResolvedValue({ id: eventId });
      mockQueue.getJobCounts.mockResolvedValue({});
      mockQueue.isPaused.mockResolvedValue(false);
      mockQueue.getWorkers.mockResolvedValue([]);

      const result = await service.getQueueHealth(guildId, eventId);

      expect(result.isReady).toBe(false);
      expect(result.workers).toBe(0);
    });
  });
});
