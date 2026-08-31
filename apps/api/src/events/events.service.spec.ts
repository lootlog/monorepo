import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { getQueueToken } from "@nestjs/bullmq";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import { attachPrismaOrmMock } from "#src/test/prisma-orm.mock";
import { PRISMA_DB } from "#src/db/prisma.provider";
import { RedisService } from "@lootlog/nest-shared/redis";
import { EventsService } from "./events.service.js";
import { EventAccessService } from "./services/event-access.service.js";
import { EventCatalogService } from "./services/event-catalog.service.js";
import { EventReadCacheService } from "./services/event-read-cache.service.js";
import { EventPointsService } from "./services/event-points.service.js";
import { EventTrackingService } from "./services/event-tracking.service.js";
import { EventKillService } from "./services/event-kill.service.js";
import { EventQueueDiagnosticsService } from "./services/event-queue-diagnostics.service.js";
import { EventRespawnService } from "./services/event-respawn.service.js";
import { EventWrappedService } from "./services/event-wrapped.service.js";
import { EventCoordinationService } from "./services/event-coordination.service.js";
import { RESPAWN_WINDOW_QUEUE } from "./constants/respawn-queue.constant.js";
import { EVENT_HERO_KILL_QUEUE } from "./constants/event-hero-kill-queue.constant.js";
import { DEFAULT_ADVANCED_EVENT_SCORING_RULES } from "@lootlog/scoring";
import { EVENT_HERO_KILL_JOB_NAME } from "./utils/event-hero-kill-job.js";

describe("EventsService", () => {
  let service: EventsService;

  const mockPrismaService = {
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
      createMany: mockFn(),
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
    sql: mockFn(),
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

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        EventAccessService,
        EventCatalogService,
        EventQueueDiagnosticsService,
        {
          provide: PrismaService,
          useValue: attachPrismaOrmMock(mockPrismaService),
        },
        {
          provide: PRISMA_DB,
          useValue: {
            orm: {
              public: {
                Event: {
                  where: mockFn((where: Record<string, unknown>) => ({
                    first: async () =>
                      (await mockPrismaService.orm.public.Event.first()) ?? {
                        id: where.id,
                      },
                    select: mockFn(() => ({
                      first: () =>
                        mockPrismaService.orm.public.Event.select("id").first(),
                    })),
                  })),
                },
                EventHeroNpc: {
                  where: mockFn((where: Record<string, unknown>) => ({
                    first: () =>
                      mockPrismaService.orm.public.EventHeroNpc.first(),
                    select: mockFn(() => ({
                      all: () =>
                        mockPrismaService.orm.public.EventHeroNpc.select(
                          "id",
                        ).all(),
                    })),
                  })),
                },
                EventMap: {
                  where: mockFn((where: Record<string, unknown>) => ({
                    first: () => mockPrismaService.orm.public.EventMap.first(),
                  })),
                },
              },
            },
          },
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
      mockPrismaService.event.create.mockResolvedValue(createdEvent);

      const result = await service.createEvent(guildId, createDto);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Test Event",
          world: "tempest",
          guildId,
        }),
      });
      expect(mockPrismaService.eventHeroNpc.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: createdEvent.id,
          npcId: 123,
          npcName: "Test Hero",
        }),
      });
      expect(result).toEqual({
        ...createdEvent,
        active: true,
      });
    });

    it("should create hero maps explicitly", async () => {
      mockPrismaService.event.create.mockResolvedValue({});

      await service.createEvent(guildId, createDto);

      expect(mockPrismaService.eventMap.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ mapId: 1, mapName: "Map One" })],
      });
    });

    it("should create event without hero npcs", async () => {
      const dtoWithoutHeroes = { name: "Test Event", world: "tempest" };
      const createdEvent = { id: "event-1", ...dtoWithoutHeroes, guildId };
      mockPrismaService.event.create.mockResolvedValue(createdEvent);

      await service.createEvent(guildId, dtoWithoutHeroes);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Test Event",
          world: "tempest",
          guildId,
        }),
      });
    });

    it("should persist advanced scoring rules on create", async () => {
      const createDtoWithAdvancedScoring = {
        name: "Advanced Event",
        world: "tempest",
        scoringMode: "ADVANCED" as const,
        scoringRules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
      };
      mockPrismaService.event.create.mockResolvedValue({
        id: "event-advanced",
        ...createDtoWithAdvancedScoring,
        guildId,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: null,
        createdAt: new Date(Date.now() - 60_000),
      });

      await service.createEvent(guildId, createDtoWithAdvancedScoring);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scoringMode: "ADVANCED",
          scoringRules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
        }),
      });
    });

    it("should handle startsAt and endsAt dates", async () => {
      const dtoWithDates = {
        name: "Test Event",
        world: "tempest",
        startsAt: "2024-01-01T00:00:00Z",
        endsAt: "2024-01-31T23:59:59Z",
      };
      mockPrismaService.event.create.mockResolvedValue({});

      await service.createEvent(guildId, dtoWithDates);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startsAt: new Date("2024-01-01T00:00:00Z"),
          endsAt: new Date("2024-01-31T23:59:59Z"),
        }),
      });
    });

    it("should normalize world to lowercase and trim spaces", async () => {
      const dtoWithMixedCaseWorld = {
        name: "Test Event",
        world: "  Tempest  ",
      };
      mockPrismaService.event.create.mockResolvedValue({});

      await service.createEvent(guildId, dtoWithMixedCaseWorld);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          world: "tempest",
        }),
      });
    });

    it("should throw when world is empty after trim", async () => {
      await expect(
        service.createEvent(guildId, {
          name: "Test Event",
          world: "   ",
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.event.create).not.toHaveBeenCalled();
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
      mockPrismaService.event.findMany.mockResolvedValue(events);

      const result = await service.getEvents(guildId);

      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ guildId }),
          include: { heroNpcs: true },
          select: expect.objectContaining({ id: true, startsAt: true }),
        }),
      );
      expect(result).toEqual([
        expect.objectContaining({
          id: "event-1",
          active: true,
        }),
      ]);
    });

    it("should filter by world when provided", async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);

      await service.getEvents(guildId, "tempest");

      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ guildId, world: "tempest" }),
          include: { heroNpcs: true },
        }),
      );
    });

    it("should return all events when activeOnly is false", async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);

      await service.getEvents(guildId, undefined, false);

      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: { guildId },
        select: expect.any(Object),
        include: { heroNpcs: true },
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
      mockPrismaService.event.findFirst.mockResolvedValue(event);

      const result = await service.getEvent(guildId, eventId);

      expect(result).toEqual({
        ...event,
        active: true,
      });
    });

    it("should throw NotFoundException when event not found", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(null);

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
      mockPrismaService.event.findFirst.mockResolvedValue(event);

      const result = await service.getEventOverview(guildId, eventId);

      expect(result).toEqual({
        ...event,
        active: true,
      });
    });

    it("should throw NotFoundException when overview event not found", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(null);

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
      mockPrismaService.event.findFirst.mockResolvedValue(event);

      const result = await service.getEventMaps(guildId, eventId);

      expect(result).toEqual(event);
    });

    it("should load hero map relations", async () => {
      const event = { id: eventId, heroNpcs: [] };
      mockPrismaService.event.findFirst.mockResolvedValue(event);

      await service.getEventMaps(guildId, eventId);

      expect(mockPrismaService.event.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ include: { heroNpcs: true } }),
      );
    });

    it("should throw NotFoundException when maps event not found", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(null);

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
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(
        service.updateEvent(guildId, eventId, { name: "Updated" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update event successfully", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(existingEvent);
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockPrismaService),
      );
      mockPrismaService.event.update.mockResolvedValue({
        ...existingEvent,
        name: "Updated",
      });

      await service.updateEvent(guildId, eventId, { name: "Updated" });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it("should update the event row", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(existingEvent);
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockPrismaService),
      );
      mockPrismaService.event.update.mockResolvedValue({});

      await service.updateEvent(guildId, eventId, { name: "Updated" });

      expect(mockPrismaService.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: eventId },
          data: expect.objectContaining({ name: "Updated" }),
        }),
      );
    });

    it("should set endsAt when provided", async () => {
      const newEndsAt = new Date(Date.now() + 60_000);
      mockPrismaService.event.findFirst.mockResolvedValue(existingEvent);
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockPrismaService),
      );
      mockPrismaService.event.update.mockResolvedValue({});

      await service.updateEvent(guildId, eventId, {
        endsAt: newEndsAt.toISOString(),
      });

      expect(mockPrismaService.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            endsAt: newEndsAt,
          }),
        }),
      );
    });

    it("removes pins when an active event is ended", async () => {
      const endedAt = new Date(Date.now() - 1);
      mockPrismaService.event.findFirst.mockResolvedValue(existingEvent);
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockPrismaService),
      );
      mockPrismaService.event.update.mockResolvedValue({
        ...existingEvent,
        endsAt: endedAt,
      });

      await service.updateEvent(guildId, eventId, {
        endsAt: endedAt.toISOString(),
      });

      expect(mockPrismaService.userPinnedEvent.deleteMany).toHaveBeenCalledWith(
        { where: { eventId } },
      );
    });

    it("removes stale pins before an inactive event is resumed", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({
        ...existingEvent,
        endsAt: new Date(Date.now() - 60_000),
      });
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockPrismaService),
      );
      mockPrismaService.event.update.mockResolvedValue(existingEvent);

      await service.updateEvent(guildId, eventId, { endsAt: null });

      expect(mockPrismaService.userPinnedEvent.deleteMany).toHaveBeenCalledWith(
        { where: { eventId } },
      );
    });

    it("should persist advanced scoring rules on update", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(existingEvent);
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockPrismaService),
      );
      mockPrismaService.event.update.mockResolvedValue({
        ...existingEvent,
        scoringMode: "ADVANCED",
        scoringRules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
      });

      await service.updateEvent(guildId, eventId, {
        scoringMode: "ADVANCED",
        scoringRules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
      });

      expect(mockPrismaService.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scoringMode: "ADVANCED",
            scoringRules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
          }),
        }),
      );
    });

    it("should not recalculate points automatically when basePointsPerKill changes", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(existingEvent);
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockPrismaService),
      );
      mockPrismaService.event.update.mockResolvedValue({});

      await service.updateEvent(guildId, eventId, { basePointsPerKill: 200 });

      expect(mockPointsService.recalculateEventPoints).not.toHaveBeenCalled();
    });

    it("should recalculate points manually via dedicated method", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({
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
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(service.deleteEvent(guildId, eventId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should hard delete event and remove pending jobs", async () => {
      const removeEventJob = mockFn().mockResolvedValue(undefined);
      const removeOtherEventJob = mockFn().mockResolvedValue(undefined);

      mockPrismaService.event.findFirst.mockResolvedValue({ id: eventId });
      mockQueue.getJobs
        .mockResolvedValueOnce([
          { data: { eventId }, remove: removeEventJob },
          { data: { eventId: "event-2" }, remove: removeOtherEventJob },
        ])
        .mockResolvedValueOnce([{ data: { eventId }, remove: removeEventJob }]);
      mockPrismaService.event.delete.mockResolvedValue({});

      const result = await service.deleteEvent(guildId, eventId);

      expect(removeEventJob).toHaveBeenCalledTimes(2);
      expect(removeOtherEventJob).not.toHaveBeenCalled();
      expect(mockPrismaService.event.delete).toHaveBeenCalledWith({
        where: { id: eventId },
      });
      expect(result).toEqual({ success: true });
    });

    it("should delete inactive event too", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({
        id: eventId,
        active: false,
      });
      mockQueue.getJobs.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockPrismaService.event.delete.mockResolvedValue({});

      await service.deleteEvent(guildId, eventId);

      expect(mockPrismaService.event.delete).toHaveBeenCalledWith({
        where: { id: eventId },
      });
    });
  });

  // ========== HERO MANAGEMENT ==========

  describe("createHero", () => {
    const guildId = "guild-1";
    const eventId = "event-1";

    it("should throw NotFoundException when event not found", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(
        service.createHero(guildId, eventId, { npcName: "Hero" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should create hero with provided npcId", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({
        id: eventId,
        world: "tempest",
      });
      mockPrismaService.eventHeroNpc.create.mockResolvedValue({});

      await service.createHero(guildId, eventId, {
        npcId: 123,
        npcName: "Hero",
      });

      expect(mockPrismaService.eventHeroNpc.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId,
          npcId: 123,
          npcName: "Hero",
        }),
      });
    });

    it("should create a scalar hero row", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({
        id: eventId,
        world: "tempest",
      });
      mockPrismaService.eventHeroNpc.create.mockResolvedValue({});

      await service.createHero(guildId, eventId, {
        npcId: 123,
        npcName: "Hero",
      });

      expect(mockPrismaService.eventHeroNpc.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ eventId, npcId: 123 }),
      });
    });

    it("should lookup npcId from timers when not provided", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({
        id: eventId,
        world: "tempest",
      });
      mockPrismaService.sql.mockResolvedValue([
        { npc: { id: 456, name: "Hero", icon: "hero.gif" } },
      ]);
      mockPrismaService.eventHeroNpc.create.mockResolvedValue({});

      await service.createHero(guildId, eventId, { npcName: "Hero" });

      expect(mockPrismaService.eventHeroNpc.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          npcId: 456,
          npcName: "Hero",
          npcIcon: "hero.gif",
        }),
      });
    });
  });

  describe("updateHero", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should throw NotFoundException when hero not found", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.updateHero(guildId, eventId, heroId, { npcName: "Updated" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update hero name", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
        npcId: null,
        npcName: "Current Hero",
      });
      mockPrismaService.eventHeroNpc.update.mockResolvedValue({});

      await service.updateHero(guildId, eventId, heroId, {
        npcName: "Updated",
      });

      expect(mockPrismaService.eventHeroNpc.update).toHaveBeenCalledWith({
        where: { id: heroId },
        data: { npcName: "Updated" },
      });
    });

    // it("should block renaming hero after npcId is set", async () => {
    //   mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue({
    //     id: heroId,
    //     npcId: 123,
    //     npcName: "Current Hero",
    //   });

    //   await expect(
    //     service.updateHero(guildId, eventId, heroId, { npcName: "Updated" }),
    //   ).rejects.toThrow(BadRequestException);

    //   expect(mockPrismaService.eventHeroNpc.update).not.toHaveBeenCalled();
    // });
  });

  describe("deleteHero", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should throw NotFoundException when hero not found", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteHero(guildId, eventId, heroId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should delete hero", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockPrismaService.eventHeroNpc.delete.mockResolvedValue({});

      const result = await service.deleteHero(guildId, eventId, heroId);

      expect(mockPrismaService.eventHeroNpc.delete).toHaveBeenCalledWith({
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
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.addMap(guildId, eventId, heroId, {
          mapId: 1,
          mapName: "Map",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when map already exists", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockPrismaService.eventMap.findFirst.mockResolvedValue({ id: "map-1" });

      await expect(
        service.addMap(guildId, eventId, heroId, {
          mapId: 1,
          mapName: "Map",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create map and open unassigned gap", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockPrismaService.eventMap.findFirst.mockResolvedValue(null);
      mockPrismaService.eventMap.create.mockResolvedValue({
        id: "new-map-id",
        heroNpcId: heroId,
      });

      await service.addMap(guildId, eventId, heroId, {
        mapId: 1,
        mapName: "Map",
      });

      expect(mockPrismaService.eventMap.create).toHaveBeenCalled();
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
      mockPrismaService.eventMap.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMap(guildId, eventId, heroId, mapId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should delete map", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue({ id: mapId });
      mockPrismaService.eventMap.delete.mockResolvedValue({});

      const result = await service.deleteMap(guildId, eventId, heroId, mapId);

      expect(mockPrismaService.eventMap.delete).toHaveBeenCalledWith({
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
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.createLocation(guildId, eventId, heroId, { name: "Location" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when location name exists", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockPrismaService.eventMapLocation.findFirst.mockResolvedValue({
        id: "loc-1",
      });

      await expect(
        service.createLocation(guildId, eventId, heroId, { name: "Location" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create location with correct order", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockPrismaService.eventMapLocation.findFirst.mockResolvedValue(null);
      mockPrismaService.eventMapLocation.aggregate.mockResolvedValue({
        _max: { order: 2 },
      });
      mockPrismaService.eventMapLocation.create.mockResolvedValue({});

      await service.createLocation(guildId, eventId, heroId, {
        name: "Location",
      });

      expect(mockPrismaService.eventMapLocation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          heroNpcId: heroId,
          name: "Location",
          order: 3,
        }),
      });
    });

    it("should create a scalar location row", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockPrismaService.eventMapLocation.findFirst.mockResolvedValue(null);
      mockPrismaService.eventMapLocation.aggregate.mockResolvedValue({
        _max: { order: 2 },
      });
      mockPrismaService.eventMapLocation.create.mockResolvedValue({});

      await service.createLocation(guildId, eventId, heroId, {
        name: "Location",
      });

      expect(mockPrismaService.eventMapLocation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ heroNpcId: heroId, order: 3 }),
      });
    });
  });

  describe("updateLocation", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";
    const locationId = "loc-1";

    it("should throw NotFoundException when location not found", async () => {
      mockPrismaService.eventMapLocation.findFirst.mockResolvedValue(null);

      await expect(
        service.updateLocation(guildId, eventId, heroId, locationId, {
          name: "Updated",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update a scalar location row", async () => {
      mockPrismaService.eventMapLocation.findFirst
        .mockResolvedValueOnce({
          id: locationId,
          name: "Location",
        })
        .mockResolvedValueOnce(null);
      mockPrismaService.eventMapLocation.update.mockResolvedValue({});

      await service.updateLocation(guildId, eventId, heroId, locationId, {
        name: "Updated",
      });

      expect(mockPrismaService.eventMapLocation.update).toHaveBeenCalledWith({
        where: { id: locationId },
        data: { name: "Updated", updatedAt: expect.any(Date) },
      });
    });
  });

  describe("getLocations", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should throw NotFoundException when hero not found", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.getLocations(guildId, eventId, heroId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should request locations with maps sorted by mapId", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockPrismaService.eventMapLocation.findMany.mockResolvedValue([]);

      await service.getLocations(guildId, eventId, heroId);

      expect(mockPrismaService.eventMapLocation.findMany).toHaveBeenCalledWith({
        where: { heroNpcId: heroId },
        orderBy: { order: "asc" },
        include: { maps: true },
      });
    });
  });

  describe("reorderLocations", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should throw NotFoundException when hero not found", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.reorderLocations(guildId, eventId, heroId, {
          locationIds: ["loc-1", "loc-2"],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when some locations not found", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockPrismaService.eventMapLocation.findMany.mockResolvedValue([
        { id: "loc-1" },
      ]); // Only 1 found

      await expect(
        service.reorderLocations(guildId, eventId, heroId, {
          locationIds: ["loc-1", "loc-2"],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reorder locations in transaction", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue({
        id: heroId,
      });
      mockPrismaService.eventMapLocation.findMany.mockResolvedValue([
        { id: "loc-1" },
        { id: "loc-2" },
      ]);
      mockPrismaService.$transaction.mockResolvedValue([]);

      const result = await service.reorderLocations(guildId, eventId, heroId, {
        locationIds: ["loc-2", "loc-1"],
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
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
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(
        service.getAutoCloseJobsStatus(guildId, eventId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return job status for event heroes", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({ id: eventId });
      mockPrismaService.eventHeroNpc.findMany.mockResolvedValue([
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
      mockPrismaService.event.findFirst.mockResolvedValue({ id: eventId });
      mockPrismaService.eventHeroNpc.findMany.mockResolvedValue([
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
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(service.getQueueHealth(guildId, eventId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return queue health status", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({ id: eventId });

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
      mockPrismaService.event.findFirst.mockResolvedValue({ id: eventId });
      mockQueue.getJobCounts.mockResolvedValue({});
      mockQueue.isPaused.mockResolvedValue(false);
      mockQueue.getWorkers.mockResolvedValue([]);

      const result = await service.getQueueHealth(guildId, eventId);

      expect(result.isReady).toBe(false);
      expect(result.workers).toBe(0);
    });
  });
});
