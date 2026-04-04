import { Test, type TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { NotFoundException } from "@nestjs/common";
import { EventKillService } from "./event-kill.service";
import { EventEmitterService } from "./event-emitter.service";
import { EventPointsService } from "./event-points.service";
import { EventTrackingService } from "./event-tracking.service";
import { EventSummaryService } from "./event-summary.service";
import { PrismaService } from "src/db/prisma.service";
import { RedisService } from "@lootlog/nest-shared";
import { RESPAWN_WINDOW_QUEUE } from "../constants/respawn-queue.constant";
import type { Event, EventHeroNpc } from "src/generated/prisma/client";
import { TimersService } from "src/timers/timers.service";

describe("EventKillService", () => {
  let service: EventKillService;

  const mockPrismaService = {
    event: {
      findFirst: vi.fn(),
    },
    eventHeroNpc: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    eventMap: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    eventHeroKill: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    eventKillPoint: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    eventMapAssignmentHistory: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    eventMapCoverageGap: {
      findMany: vi.fn(),
    },
    eventRespawnWindowSummary: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    timer: {
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };

  const mockQueue = {
    add: vi.fn(),
    getJobs: vi.fn(),
  };

  const mockEventEmitter = {
    emitHeroKilled: vi.fn(),
    emitMapStatusUpdate: vi.fn(),
    emitRespawnWindowClosed: vi.fn(),
    emitRespawnWindowOpened: vi.fn(),
  };

  const mockPointsService = {
    calculateMemberPoints: vi.fn(),
    getMemberPresenceStats: vi.fn(),
    getMemberPresenceStatsPerMap: vi.fn(),
    getMembersPresenceStats: vi.fn(
      async (
        heroNpcId: string,
        memberIds: number[],
        since?: Date,
      ): Promise<
        Array<{
          memberId: number;
          timeOnMapSeconds: number;
          afkPercentage: number;
          wasPresent: boolean;
          mapName?: string;
        }>
      > =>
        Promise.all(
          memberIds.map(async (memberId) => ({
            memberId,
            ...(await mockPointsService.getMemberPresenceStats(
              heroNpcId,
              memberId,
              since,
            )),
          })),
        ),
    ),
    getMembersPresenceStatsPerMap: vi.fn(
      async (
        mapIds: string[],
        memberIds: number[],
        since?: Date,
      ): Promise<
        Array<{
          memberId: number;
          mapId: string;
          presenceTimeSeconds: number;
          afkTimeSeconds: number;
        }>
      > => {
        const statsByMember = await Promise.all(
          memberIds.map(async (memberId) => {
            const memberStats =
              await mockPointsService.getMemberPresenceStatsPerMap(
                mapIds,
                memberId,
                since,
              );

            return memberStats.map((entry) => ({
              memberId,
              ...entry,
            }));
          }),
        );

        return statsByMember.flat();
      },
    ),
    updateRankingAfterKill: vi.fn(),
  };

  const mockTrackingService = {
    closeAllGapsForHero: vi.fn(),
    openUnassignedGap: vi.fn(),
  };

  const mockSummaryService = {
    createWindowSummary: vi.fn(),
  };

  const mockRedisService = {
    getClient: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    setNX: vi.fn().mockResolvedValue(true),
  };

  const mockTimersService = {
    getTimersForEventHeroFilters: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrismaService.eventRespawnWindowSummary.findMany.mockResolvedValue([]);
    mockPrismaService.eventRespawnWindowSummary.findUnique.mockResolvedValue(
      null,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventKillService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: getQueueToken(RESPAWN_WINDOW_QUEUE), useValue: mockQueue },
        { provide: EventEmitterService, useValue: mockEventEmitter },
        { provide: EventPointsService, useValue: mockPointsService },
        { provide: EventTrackingService, useValue: mockTrackingService },
        { provide: EventSummaryService, useValue: mockSummaryService },
        { provide: TimersService, useValue: mockTimersService },
      ],
    }).compile();

    service = module.get<EventKillService>(EventKillService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // getEventHeroTimers
  // ==========================================================================
  describe("getEventHeroTimers", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const world = "tempest";

    it("should return timers for event heroes", async () => {
      const mockEvent = {
        id: eventId,
        guildId,
        heroNpcs: [
          { id: "hero-1", npcId: 123, npcName: "Hero 1" },
          { id: "hero-2", npcId: 456, npcName: "Hero 2" },
        ],
      };
      const mockTimers = [
        {
          guildId,
          world,
          npcId: 123,
          npc: { name: "Hero 1", icon: null },
          member: { id: 1 },
        },
        {
          guildId,
          world,
          npcId: 456,
          npc: { name: "Hero 2", icon: null },
          member: { id: 2 },
        },
      ];

      mockPrismaService.event.findFirst.mockResolvedValue(mockEvent);
      mockTimersService.getTimersForEventHeroFilters.mockResolvedValue(
        mockTimers,
      );

      const result = await service.getEventHeroTimers(guildId, eventId, world);

      expect(result).toHaveLength(2);
    });

    it("should return empty array when event has no heroes", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({
        id: eventId,
        heroNpcs: [],
      });

      const result = await service.getEventHeroTimers(guildId, eventId, world);

      expect(result).toEqual([]);
    });

    it("should throw NotFoundException when event not found", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(
        service.getEventHeroTimers(guildId, eventId, world),
      ).rejects.toThrow(NotFoundException);
    });

    it("should handle heroes without npcId (name matching)", async () => {
      const mockEvent = {
        id: eventId,
        guildId,
        heroNpcs: [{ id: "hero-1", npcId: null, npcName: "Named Hero" }],
      };

      mockPrismaService.event.findFirst.mockResolvedValue(mockEvent);
      mockTimersService.getTimersForEventHeroFilters.mockResolvedValue([
        {
          npcId: -12345,
          createdById: 1,
          guildId,
          world,
          npc: { name: "Named Hero", icon: null },
        },
      ]);

      await service.getEventHeroTimers(guildId, eventId, world);

      expect(mockTimersService.getTimersForEventHeroFilters).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getEventHeroStats
  // ==========================================================================
  describe("getEventHeroStats", () => {
    const guildId = "guild-1";
    const eventId = "event-1";

    it("should return hero stats with kill counts", async () => {
      const mockEvent = {
        id: eventId,
        heroNpcs: [
          {
            id: "hero-1",
            npcId: 123,
            npcName: "Hero 1",
            npcLvl: 100,
            _count: { kills: 3 },
          },
          {
            id: "hero-2",
            npcId: 456,
            npcName: "Hero 2",
            npcLvl: 120,
            _count: { kills: 1 },
          },
        ],
      };

      mockPrismaService.event.findFirst.mockResolvedValue(mockEvent);

      const result = await service.getEventHeroStats(guildId, eventId);

      expect(result).toHaveLength(2);
      expect(result[0].killCount).toBe(3);
      expect(result[1].killCount).toBe(1);
    });

    it("should throw NotFoundException when event not found", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(service.getEventHeroStats(guildId, eventId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // findActiveEventHeroByNpc
  // ==========================================================================
  describe("findActiveEventHeroByNpc", () => {
    const guildId = "guild-1";
    const world = "tempest";
    const npcId = 123;
    const npcName = "Test Hero";

    it("should find hero by npcId first", async () => {
      const mockHeroNpc = {
        id: "hero-1",
        npcId,
        npcName,
        event: { id: "event-1", guildId, world, active: true },
      };

      mockPrismaService.eventHeroNpc.findMany
        .mockResolvedValueOnce([mockHeroNpc])
        .mockResolvedValueOnce([]);

      const result = await service.findActiveEventHeroByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );

      expect(result).not.toBeNull();
      expect(result?.eventHero.id).toBe("hero-1");
    });

    it("should find hero by name if npcId not found", async () => {
      const mockHeroNpc = {
        id: "hero-1",
        npcId: null,
        npcName,
        event: { id: "event-1", guildId, world, active: true },
      };

      mockPrismaService.eventHeroNpc.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockHeroNpc]);

      const result = await service.findActiveEventHeroByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );

      expect(result).not.toBeNull();
      expect(mockPrismaService.eventHeroNpc.findMany).toHaveBeenCalledTimes(2);
    });

    it("should return null if hero not found", async () => {
      mockPrismaService.eventHeroNpc.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.findActiveEventHeroByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // checkAndRecordEventHeroKill
  // ==========================================================================
  describe("checkAndRecordEventHeroKill", () => {
    const guildId = "guild-1";
    const world = "tempest";
    const npcId = 123;
    const npcName = "Test Hero";
    const npcIcon = "icon.png";
    const windowOpenedAt = new Date("2026-02-18T08:00:00.000Z");
    const timerData = {
      minSpawnTime: new Date("2026-02-18T10:00:00.000Z"),
      maxSpawnTime: new Date("2026-02-18T12:00:00.000Z"),
      memberId: 1,
      previousMinSpawnTime: new Date("2026-02-18T08:00:00.000Z"),
      previousMaxSpawnTime: new Date("2026-02-18T09:00:00.000Z"),
      windowOpenedAt,
    };

    it("should skip duplicate kill when dedup window is active", async () => {
      mockRedisService.get.mockResolvedValueOnce("1");

      await service.checkAndRecordEventHeroKill(
        guildId,
        world,
        npcId,
        npcName,
        npcIcon,
        timerData,
      );

      expect(mockRedisService.setNX).not.toHaveBeenCalled();
      expect(mockPrismaService.eventHeroNpc.findMany).not.toHaveBeenCalled();
    });

    it("should skip duplicate kill when lock is already held", async () => {
      mockRedisService.get.mockResolvedValueOnce(null);
      mockRedisService.setNX.mockResolvedValueOnce(false);

      await service.checkAndRecordEventHeroKill(
        guildId,
        world,
        npcId,
        npcName,
        npcIcon,
        timerData,
      );

      expect(mockPrismaService.eventHeroNpc.findMany).not.toHaveBeenCalled();
      expect(mockRedisService.del).not.toHaveBeenCalled();
    });

    it("should skip if NPC is not an event hero", async () => {
      mockPrismaService.eventHeroNpc.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.checkAndRecordEventHeroKill(
        guildId,
        world,
        npcId,
        npcName,
        npcIcon,
        timerData,
      );

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `event:hero:kill:lock:${guildId}:${world}:${npcId}`,
      );
    });

    it("should update hero npcId if missing", async () => {
      const mockHero = {
        id: "hero-1",
        npcId: null,
        npcIcon: null,
        npcName,
        event: { id: "event-1" },
      };
      const updatedHero = { ...mockHero, npcId, npcIcon };

      mockPrismaService.eventHeroNpc.findMany
        .mockResolvedValueOnce([mockHero])
        .mockResolvedValueOnce([]);
      mockRedisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.eventHeroNpc.update.mockResolvedValue(updatedHero);
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);

      await service.checkAndRecordEventHeroKill(
        guildId,
        world,
        npcId,
        npcName,
        npcIcon,
        timerData,
      );

      expect(mockPrismaService.eventHeroNpc.update).toHaveBeenCalledWith({
        where: { id: "hero-1" },
        data: { npcId, npcIcon },
      });
    });

    it("should record kill for manual close", async () => {
      const mockHero = {
        id: "hero-1",
        npcId,
        npcIcon,
        npcName,
        event: { id: "event-1" },
      };

      mockPrismaService.eventHeroNpc.findMany
        .mockResolvedValueOnce([mockHero])
        .mockResolvedValueOnce([]);
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);

      await service.checkAndRecordEventHeroKill(
        guildId,
        world,
        npcId,
        npcName,
        npcIcon,
        timerData,
        true, // isManualClose
      );

      expect(txMock.eventHeroKill.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isManualClose: true,
          }),
        }),
      );
      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining(
          `event:hero:kill:dedup:${guildId}:${world}:${npcId}:hero-1:`,
        ),
        expect.any(String),
        120,
      );
      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining(
          `event:hero:kill:dedup:${guildId}:${world}:${npcId}:`,
        ),
        expect.any(String),
        120,
      );
    });

    it("should process all matching heroes", async () => {
      const heroA = {
        id: "hero-1",
        npcId,
        npcIcon,
        npcName,
        event: { id: "event-1" },
      };
      const heroB = {
        id: "hero-2",
        npcId,
        npcIcon,
        npcName,
        event: { id: "event-2" },
      };

      mockPrismaService.eventHeroNpc.findMany
        .mockResolvedValueOnce([heroA, heroB])
        .mockResolvedValueOnce([]);
      mockRedisService.get.mockResolvedValue(null);

      const recordSpy = vi
        .spyOn(service, "recordHeroKill")
        .mockResolvedValue({ id: "kill-1" } as any);

      await service.checkAndRecordEventHeroKill(
        guildId,
        world,
        npcId,
        npcName,
        npcIcon,
        timerData,
      );

      expect(recordSpy).toHaveBeenCalledTimes(2);
      recordSpy.mockRestore();
    });

    it("should throw and not set global dedup when record fails", async () => {
      const mockHero = {
        id: "hero-1",
        npcId,
        npcIcon,
        npcName,
        event: { id: "event-1" },
      };

      mockRedisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.eventHeroNpc.findMany
        .mockResolvedValueOnce([mockHero])
        .mockResolvedValueOnce([]);
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockRejectedValue(new Error("boom"));

      await expect(
        service.checkAndRecordEventHeroKill(
          guildId,
          world,
          npcId,
          npcName,
          npcIcon,
          timerData,
        ),
      ).rejects.toThrow("boom");

      const globalDedupFragment = `event:hero:kill:dedup:${guildId}:${world}:${npcId}:${windowOpenedAt.getTime()}:timer`;
      const setCalls = mockRedisService.set.mock.calls.map((call) => call[0]);
      expect(setCalls).not.toContain(globalDedupFragment);
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `event:hero:kill:lock:${guildId}:${world}:${npcId}`,
      );
    });
  });

  // ==========================================================================
  // recordHeroKill
  // ==========================================================================
  describe("recordHeroKill", () => {
    const guildId = "guild-1";
    const mockEvent = {
      id: "event-1",
      guildId,
      basePointsPerKill: 100,
    } as unknown as Event;

    const mockEventHero = {
      id: "hero-1",
      npcId: 123,
      npcName: "Test Hero",
    } as EventHeroNpc;

    const timerData = {
      minSpawnTime: new Date(),
      maxSpawnTime: new Date(),
      memberId: 1,
      previousMinSpawnTime: new Date(),
      previousMaxSpawnTime: new Date(),
      windowOpenedAt: new Date(),
    };

    it("should create kill record with points for members assigned in current window", async () => {
      const now = Date.now();
      const windowOpenedAt = new Date(now - 15 * 60 * 1000);
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };
      const mockMaps = [
        {
          id: "map-1",
          mapName: "Map 1",
          assignedMembers: [],
        },
      ];

      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);

      // Mock transaction to use the tx proxy properly
      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
          findMany: vi.fn().mockResolvedValue([
            { id: "point-1", killId: "kill-1", memberId: 1, points: 100 },
            { id: "point-2", killId: "kill-1", memberId: 2, points: 100 },
          ]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([
            {
              mapId: "map-1",
              memberId: 1,
              assignedAt: new Date(now - 10 * 60 * 1000),
            },
            {
              mapId: "map-1",
              memberId: 2,
              assignedAt: new Date(now - 5 * 60 * 1000),
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);
      mockPointsService.getMemberPresenceStats.mockResolvedValue({
        timeOnMapSeconds: 300,
        afkPercentage: 0,
        wasPresent: true,
      });
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([
        { mapId: "map-1", presenceTimeSeconds: 300, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        totalPoints: 1,
        basePoints: 1,
        bonusPoints: 0,
        appliedBonuses: [],
      });

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerDataInWindow,
      );

      expect(txMock.eventHeroKill.create).toHaveBeenCalled();
      expect(txMock.eventMapAssignmentHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedAt: expect.objectContaining({
              lte: expect.any(Date),
            }),
            OR: expect.arrayContaining([
              { unassignedAt: null },
              {
                unassignedAt: expect.objectContaining({
                  gte: windowOpenedAt,
                }),
              },
            ]),
          }),
        }),
      );
      expect(mockPointsService.getMembersPresenceStats).toHaveBeenCalledWith(
        mockEventHero.id,
        [1, 2],
        windowOpenedAt,
        timerDataInWindow.previousMaxSpawnTime,
      );
      expect(mockPointsService.updateRankingAfterKill).toHaveBeenCalled();
    });

    it("should award points to member previously assigned but currently unassigned", async () => {
      const now = Date.now();
      const windowOpenedAt = new Date(now - 5 * 60 * 1000);
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };
      const mockMaps = [
        {
          id: "map-1",
          mapName: "Map 1",
          assignedMembers: [],
        },
      ];

      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "point-1", killId: "kill-1", memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([
            {
              mapId: "map-1",
              memberId: 1,
              assignedAt: new Date(now - 2 * 60 * 1000),
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);
      mockPointsService.getMemberPresenceStats.mockResolvedValue({
        timeOnMapSeconds: 300,
        afkPercentage: 0,
        wasPresent: true,
      });
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([
        { mapId: "map-1", presenceTimeSeconds: 300, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        totalPoints: 1,
        basePoints: 1,
        bonusPoints: 0,
        appliedBonuses: [],
      });

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerDataInWindow,
      );

      expect(txMock.eventKillPoint.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              memberId: 1,
            }),
          ]),
        }),
      );
      expect(mockPointsService.calculateMemberPoints).toHaveBeenCalled();
      const calculateCall =
        mockPointsService.calculateMemberPoints.mock.calls[0];
      expect(calculateCall[0]).toEqual(
        expect.objectContaining({
          assignedMembersCount: 1,
          killTime: expect.any(Date),
          respawnStartTime: expect.any(Date),
        }),
      );
    });

    it("should award points to member assigned before window start when assignment overlaps kill window", async () => {
      const now = Date.now();
      const windowOpenedAt = new Date(now - 5 * 60 * 1000);
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1" },
      ]);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "point-1", killId: "kill-1", memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([
            {
              mapId: "map-1",
              memberId: 1,
              assignedAt: new Date(now - 30 * 60 * 1000),
              unassignedAt: null,
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);
      mockPointsService.getMemberPresenceStats.mockResolvedValue({
        timeOnMapSeconds: 300,
        afkPercentage: 0,
        wasPresent: true,
      });
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([
        { mapId: "map-1", presenceTimeSeconds: 300, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        totalPoints: 1,
        basePoints: 1,
        bonusPoints: 0,
        appliedBonuses: [],
      });

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerDataInWindow,
      );

      const createManyArgs = txMock.eventKillPoint.createMany.mock.calls[0][0];
      expect(createManyArgs.data[0].memberId).toBe(1);
      expect(txMock.eventMapAssignmentHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedAt: expect.objectContaining({
              lte: expect.any(Date),
            }),
            OR: expect.arrayContaining([
              { unassignedAt: null },
              {
                unassignedAt: expect.objectContaining({
                  gte: windowOpenedAt,
                }),
              },
            ]),
          }),
        }),
      );
    });

    it("should ignore assignments from previous windows", async () => {
      const now = Date.now();
      const windowOpenedAt = new Date(now - 60 * 1000);
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1" },
      ]);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "point-1", killId: "kill-1", memberId: 2, points: 100 },
            ]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          // Includes one stale assignment that must be ignored.
          findMany: vi.fn().mockResolvedValue([
            {
              mapId: "map-1",
              memberId: 1,
              assignedAt: new Date(now - 20 * 60 * 1000),
              unassignedAt: new Date(now - 10 * 60 * 1000),
            },
            {
              mapId: "map-1",
              memberId: 2,
              assignedAt: new Date(now - 20 * 1000),
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);
      mockPointsService.getMemberPresenceStats.mockResolvedValue({
        timeOnMapSeconds: 20,
        afkPercentage: 0,
        wasPresent: true,
      });
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([
        { mapId: "map-1", presenceTimeSeconds: 20, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        totalPoints: 1,
        basePoints: 1,
        bonusPoints: 0,
        appliedBonuses: [],
      });

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerDataInWindow,
      );

      const createManyArgs = txMock.eventKillPoint.createMany.mock.calls[0][0];
      const memberIds = createManyArgs.data.map(
        (entry: { memberId: number }) => entry.memberId,
      );
      expect(memberIds).toEqual([2]);
      expect(mockPointsService.calculateMemberPoints).toHaveBeenCalledTimes(1);
    });

    it("should calculate tracking duration only within current window", async () => {
      vi.useFakeTimers();
      const killedAt = new Date("2026-02-18T06:08:31.185Z");
      vi.setSystemTime(killedAt.getTime());

      const windowOpenedAt = new Date("2026-02-18T06:08:25.185Z");
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1" },
      ]);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "point-1", killId: "kill-1", memberId: 2, points: 100 },
            ]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          // Includes one stale assignment that should be ignored.
          findMany: vi.fn().mockResolvedValue([
            {
              mapId: "map-1",
              memberId: 1,
              assignedAt: new Date("2026-02-18T05:29:05.185Z"),
              unassignedAt: new Date("2026-02-18T06:00:00.000Z"),
            },
            {
              mapId: "map-1",
              memberId: 2,
              assignedAt: new Date("2026-02-18T06:08:26.061Z"),
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);
      mockPointsService.getMemberPresenceStats.mockResolvedValue({
        timeOnMapSeconds: 5,
        afkPercentage: 0,
        wasPresent: true,
      });
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([
        { mapId: "map-1", presenceTimeSeconds: 5, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        totalPoints: 1,
        basePoints: 1,
        bonusPoints: 0,
        appliedBonuses: [],
      });

      try {
        await service.recordHeroKill(
          guildId,
          mockEventHero,
          mockEvent,
          timerDataInWindow,
        );

        const createManyArgs =
          txMock.eventKillPoint.createMany.mock.calls[0][0];
        const createdPoint = createManyArgs.data[0];

        expect(createdPoint.trackingDurationSeconds).toBe(5);
        expect(createdPoint.trackingDurationPercentage).toBe(83);
        expect(createdPoint.trackingDurationSeconds).toBeLessThanOrEqual(6);
        expect(createdPoint.memberId).toBe(2);

        const calculateCall =
          mockPointsService.calculateMemberPoints.mock.calls[0];
        expect(calculateCall[0]).toEqual(
          expect.objectContaining({
            trackingDurationPercentage: 83,
          }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("should calculate tracking duration percentage from min spawn to kill", async () => {
      vi.useFakeTimers();
      const killedAt = new Date("2026-02-20T05:27:46.133Z");
      vi.setSystemTime(killedAt.getTime());

      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: new Date("2026-02-20T03:27:46.133Z"),
        windowOpenedAt: new Date("2026-02-20T02:07:46.133Z"),
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1" },
      ]);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "point-1", killId: "kill-1", memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([
            {
              mapId: "map-1",
              memberId: 1,
              assignedAt: new Date("2026-02-20T03:35:54.133Z"),
              unassignedAt: null,
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);
      mockPointsService.getMemberPresenceStats.mockResolvedValue({
        timeOnMapSeconds: 0,
        afkPercentage: 0,
        wasPresent: false,
      });
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([
        { mapId: "map-1", presenceTimeSeconds: 0, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        totalPoints: 1,
        basePoints: 1,
        bonusPoints: 0,
        appliedBonuses: [],
      });

      try {
        await service.recordHeroKill(
          guildId,
          mockEventHero,
          mockEvent,
          timerDataInWindow,
        );

        const createManyArgs =
          txMock.eventKillPoint.createMany.mock.calls[0][0];
        const createdPoint = createManyArgs.data[0];

        expect(createdPoint.trackingDurationSeconds).toBe(6712);
        expect(createdPoint.trackingDurationPercentage).toBe(93);

        const calculateCall =
          mockPointsService.calculateMemberPoints.mock.calls[0];
        expect(calculateCall[0]).toEqual(
          expect.objectContaining({
            trackingDurationPercentage: 93,
          }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("should clamp tracking duration to min spawn when member assigned before min spawn", async () => {
      vi.useFakeTimers();
      const killedAt = new Date("2026-02-20T05:27:46.133Z");
      vi.setSystemTime(killedAt.getTime());

      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: new Date("2026-02-20T03:27:46.133Z"),
        windowOpenedAt: new Date("2026-02-20T02:07:46.133Z"),
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1" },
      ]);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "point-1", killId: "kill-1", memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([
            {
              mapId: "map-1",
              memberId: 1,
              assignedAt: new Date("2026-02-20T02:30:00.000Z"),
              unassignedAt: null,
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);
      mockPointsService.getMemberPresenceStats.mockResolvedValue({
        timeOnMapSeconds: 0,
        afkPercentage: 0,
        wasPresent: false,
      });
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([
        { mapId: "map-1", presenceTimeSeconds: 0, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        totalPoints: 1,
        basePoints: 1,
        bonusPoints: 0,
        appliedBonuses: [],
      });

      try {
        await service.recordHeroKill(
          guildId,
          mockEventHero,
          mockEvent,
          timerDataInWindow,
        );

        const createManyArgs =
          txMock.eventKillPoint.createMany.mock.calls[0][0];
        const createdPoint = createManyArgs.data[0];

        expect(createdPoint.trackingDurationSeconds).toBe(7200);
        expect(createdPoint.trackingDurationPercentage).toBe(100);

        const calculateCall =
          mockPointsService.calculateMemberPoints.mock.calls[0];
        expect(calculateCall[0]).toEqual(
          expect.objectContaining({
            trackingDurationPercentage: 100,
          }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("should not double count tracking duration for overlapping assignments on multiple maps", async () => {
      vi.useFakeTimers();
      const killedAt = new Date("2026-02-18T06:10:00.000Z");
      vi.setSystemTime(killedAt.getTime());

      const windowOpenedAt = new Date("2026-02-18T06:00:00.000Z");
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1" },
        { id: "map-2", mapName: "Map 2" },
      ]);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "point-1", killId: "kill-1", memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([
            {
              mapId: "map-1",
              memberId: 1,
              assignedAt: new Date("2026-02-18T06:05:00.000Z"),
              unassignedAt: new Date("2026-02-18T06:10:00.000Z"),
            },
            {
              mapId: "map-2",
              memberId: 1,
              assignedAt: new Date("2026-02-18T06:06:00.000Z"),
              unassignedAt: new Date("2026-02-18T06:09:00.000Z"),
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);
      mockPointsService.getMemberPresenceStats.mockResolvedValue({
        timeOnMapSeconds: 300,
        afkPercentage: 0,
        wasPresent: true,
      });
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([
        { mapId: "map-1", presenceTimeSeconds: 300, afkTimeSeconds: 0 },
        { mapId: "map-2", presenceTimeSeconds: 180, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        totalPoints: 1,
        basePoints: 1,
        bonusPoints: 0,
        appliedBonuses: [],
      });

      try {
        await service.recordHeroKill(
          guildId,
          mockEventHero,
          mockEvent,
          timerDataInWindow,
        );

        const createManyArgs =
          txMock.eventKillPoint.createMany.mock.calls[0][0];
        const createdPoint = createManyArgs.data[0];

        expect(createdPoint.trackingDurationSeconds).toBe(300);
        expect(createdPoint.trackingDurationPercentage).toBe(50);

        const calculateCall =
          mockPointsService.calculateMemberPoints.mock.calls[0];
        expect(calculateCall[0]).toEqual(
          expect.objectContaining({
            assignedMembersCount: 1,
            trackingDurationPercentage: 50,
          }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("should exclude real gaps between map switches from tracking duration", async () => {
      vi.useFakeTimers();
      const killedAt = new Date("2026-02-18T06:10:00.000Z");
      vi.setSystemTime(killedAt.getTime());

      const windowOpenedAt = new Date("2026-02-18T06:00:00.000Z");
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1" },
        { id: "map-2", mapName: "Map 2" },
      ]);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "point-1", killId: "kill-1", memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([
            {
              mapId: "map-1",
              memberId: 1,
              assignedAt: new Date("2026-02-18T06:00:00.000Z"),
              unassignedAt: new Date("2026-02-18T06:05:00.000Z"),
            },
            {
              mapId: "map-2",
              memberId: 1,
              assignedAt: new Date("2026-02-18T06:05:10.000Z"),
              unassignedAt: null,
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);
      mockPointsService.getMemberPresenceStats.mockResolvedValue({
        timeOnMapSeconds: 590,
        afkPercentage: 0,
        wasPresent: true,
      });
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([
        { mapId: "map-1", presenceTimeSeconds: 300, afkTimeSeconds: 0 },
        { mapId: "map-2", presenceTimeSeconds: 290, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        totalPoints: 1,
        basePoints: 1,
        bonusPoints: 0,
        appliedBonuses: [],
      });

      try {
        await service.recordHeroKill(
          guildId,
          mockEventHero,
          mockEvent,
          timerDataInWindow,
        );

        const createManyArgs =
          txMock.eventKillPoint.createMany.mock.calls[0][0];
        const createdPoint = createManyArgs.data[0];

        expect(createdPoint.trackingDurationSeconds).toBe(590);
        expect(createdPoint.trackingDurationPercentage).toBe(98);
      } finally {
        vi.useRealTimers();
      }
    });

    it("should keep tracking duration continuous when map switch has no gap", async () => {
      vi.useFakeTimers();
      const killedAt = new Date("2026-02-18T06:10:00.000Z");
      vi.setSystemTime(killedAt.getTime());

      const windowOpenedAt = new Date("2026-02-18T06:00:00.000Z");
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1" },
        { id: "map-2", mapName: "Map 2" },
      ]);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "point-1", killId: "kill-1", memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([
            {
              mapId: "map-1",
              memberId: 1,
              assignedAt: new Date("2026-02-18T06:00:00.000Z"),
              unassignedAt: new Date("2026-02-18T06:05:00.000Z"),
            },
            {
              mapId: "map-2",
              memberId: 1,
              assignedAt: new Date("2026-02-18T06:05:00.000Z"),
              unassignedAt: null,
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);
      mockPointsService.getMemberPresenceStats.mockResolvedValue({
        timeOnMapSeconds: 600,
        afkPercentage: 0,
        wasPresent: true,
      });
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([
        { mapId: "map-1", presenceTimeSeconds: 300, afkTimeSeconds: 0 },
        { mapId: "map-2", presenceTimeSeconds: 300, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        totalPoints: 1,
        basePoints: 1,
        bonusPoints: 0,
        appliedBonuses: [],
      });

      try {
        await service.recordHeroKill(
          guildId,
          mockEventHero,
          mockEvent,
          timerDataInWindow,
        );

        const createManyArgs =
          txMock.eventKillPoint.createMany.mock.calls[0][0];
        const createdPoint = createManyArgs.data[0];

        expect(createdPoint.trackingDurationSeconds).toBe(600);
        expect(createdPoint.trackingDurationPercentage).toBe(100);
      } finally {
        vi.useRealTimers();
      }
    });

    it("should keep tracking duration percentage null when window duration is zero", async () => {
      vi.useFakeTimers();
      const killedAt = new Date("2026-02-18T06:08:31.185Z");
      vi.setSystemTime(killedAt.getTime());

      const timerDataZeroWindow = {
        ...timerData,
        previousMinSpawnTime: killedAt,
        windowOpenedAt: killedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1" },
      ]);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "point-1", killId: "kill-1", memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([
            {
              mapId: "map-1",
              memberId: 1,
              assignedAt: killedAt,
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);
      mockPointsService.getMemberPresenceStats.mockResolvedValue({
        timeOnMapSeconds: 0,
        afkPercentage: 0,
        wasPresent: false,
      });
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([
        { mapId: "map-1", presenceTimeSeconds: 0, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        totalPoints: 1,
        basePoints: 1,
        bonusPoints: 0,
        appliedBonuses: [],
      });

      try {
        await service.recordHeroKill(
          guildId,
          mockEventHero,
          mockEvent,
          timerDataZeroWindow,
        );

        const createManyArgs =
          txMock.eventKillPoint.createMany.mock.calls[0][0];
        const createdPoint = createManyArgs.data[0];
        expect(createdPoint.trackingDurationSeconds).toBe(0);
        expect(createdPoint.trackingDurationPercentage).toBeNull();
        const calculateCall =
          mockPointsService.calculateMemberPoints.mock.calls[0];
        expect(calculateCall[0]).toEqual(
          expect.objectContaining({
            trackingDurationPercentage: undefined,
          }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("should handle kill with no assigned members", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerData,
      );

      expect(txMock.eventHeroKill.create).toHaveBeenCalled();
      expect(mockPointsService.calculateMemberPoints).not.toHaveBeenCalled();
    });

    it("should close coverage gaps after kill", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerData,
      );

      expect(mockTrackingService.closeAllGapsForHero).toHaveBeenCalledWith(
        mockEventHero.id,
      );
    });

    it("should emit hero killed event", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerData,
      );

      expect(mockEventEmitter.emitHeroKilled).toHaveBeenCalledWith(
        guildId,
        mockEvent.id,
        "kill-1",
      );
    });

    it("should create window summary after kill", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerData,
      );

      expect(mockSummaryService.createWindowSummary).toHaveBeenCalled();
    });

    it("should open UNASSIGNED gaps for new window when kill creates new respawn", async () => {
      const futureMinSpawn = new Date(Date.now() + 3600000);
      const futureMaxSpawn = new Date(Date.now() + 7200000);

      const timerDataWithNewWindow = {
        minSpawnTime: futureMinSpawn,
        maxSpawnTime: futureMaxSpawn,
        previousMinSpawnTime: new Date(),
        previousMaxSpawnTime: new Date(),
        memberId: 1,
        windowOpenedAt: new Date(),
      };

      const heroMaps = [
        { id: "map-1", assignedMembers: [] },
        { id: "map-2", assignedMembers: [] },
      ];

      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerDataWithNewWindow,
        false,
      );

      expect(mockTrackingService.openUnassignedGap).toHaveBeenCalledTimes(2);
      expect(mockTrackingService.openUnassignedGap).toHaveBeenCalledWith(
        "map-1",
        mockEventHero.id,
        expect.any(Date),
      );
      expect(mockTrackingService.openUnassignedGap).toHaveBeenCalledWith(
        "map-2",
        mockEventHero.id,
        expect.any(Date),
      );
    });

    it("should NOT open gaps when isManualClose is true", async () => {
      const futureMinSpawn = new Date(Date.now() + 3600000);
      const futureMaxSpawn = new Date(Date.now() + 7200000);

      const timerDataWithNewWindow = {
        minSpawnTime: futureMinSpawn,
        maxSpawnTime: futureMaxSpawn,
        previousMinSpawnTime: new Date(),
        previousMaxSpawnTime: new Date(),
        memberId: 1,
        windowOpenedAt: new Date(),
      };

      const heroMaps = [{ id: "map-1", assignedMembers: [] }];
      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerDataWithNewWindow,
        true,
      );

      expect(mockTrackingService.openUnassignedGap).not.toHaveBeenCalled();
    });

    it("should NOT open gaps when minSpawnTime is not in the future (auto-close scenario)", async () => {
      const pastMinSpawn = new Date(Date.now() - 3600000);
      const pastMaxSpawn = new Date(Date.now() - 1800000);

      const timerDataAutoClose = {
        minSpawnTime: pastMinSpawn,
        maxSpawnTime: pastMaxSpawn,
        previousMinSpawnTime: pastMinSpawn,
        previousMaxSpawnTime: pastMaxSpawn,
        memberId: 1,
        windowOpenedAt: new Date(Date.now() - 7200000),
      };

      const heroMaps = [{ id: "map-1", assignedMembers: [] }];
      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerDataAutoClose,
        false,
      );

      expect(mockTrackingService.openUnassignedGap).not.toHaveBeenCalled();
    });

    it("should NOT open gaps when spawn times are null", async () => {
      const timerDataNoSpawnTimes = {
        minSpawnTime: null,
        maxSpawnTime: null,
        previousMinSpawnTime: new Date(),
        previousMaxSpawnTime: new Date(),
        memberId: 1,
        windowOpenedAt: new Date(),
      };

      const heroMaps = [{ id: "map-1", assignedMembers: [] }];
      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerDataNoSpawnTimes as any,
        false,
      );

      expect(mockTrackingService.openUnassignedGap).not.toHaveBeenCalled();
    });

    it("should pass killedAt timestamp to gap creation", async () => {
      const futureMinSpawn = new Date(Date.now() + 3600000);
      const futureMaxSpawn = new Date(Date.now() + 7200000);

      const timerDataWithNewWindow = {
        minSpawnTime: futureMinSpawn,
        maxSpawnTime: futureMaxSpawn,
        previousMinSpawnTime: new Date(),
        previousMaxSpawnTime: new Date(),
        memberId: 1,
        windowOpenedAt: new Date(),
      };

      const heroMaps = [{ id: "map-1", assignedMembers: [] }];
      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);

      const txMock = {
        eventHeroKill: {
          create: vi.fn().mockResolvedValue({ id: "kill-1" }),
        },
        eventKillPoint: {
          createMany: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: vi.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(txMock),
      );
      mockQueue.getJobs.mockResolvedValue([]);

      const beforeKill = new Date();

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerDataWithNewWindow,
        false,
      );

      const afterKill = new Date();

      const gapCall = mockTrackingService.openUnassignedGap.mock.calls[0];
      const passedKilledAt = gapCall[2];

      expect(passedKilledAt.getTime()).toBeGreaterThanOrEqual(
        beforeKill.getTime(),
      );
      expect(passedKilledAt.getTime()).toBeLessThanOrEqual(afterKill.getTime());
    });
  });

  // ==========================================================================
  // getKillTimelineData
  // ==========================================================================
  describe("getKillTimelineData", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";
    const killId = "kill-1";

    it("should use summary windowOpenedAt for assignment overlap filtering", async () => {
      const killedAt = new Date("2026-02-18T11:25:18.230Z");
      const minSpawnTimeAtKill = new Date("2026-02-18T11:25:18.230Z");
      const windowOpenedAt = new Date("2026-02-18T09:27:52.727Z");

      mockPrismaService.eventHeroKill.findFirst.mockResolvedValue({
        minSpawnTimeAtKill,
        killedAt,
      });
      mockPrismaService.eventRespawnWindowSummary.findUnique.mockResolvedValue({
        gapsTimeline: [],
        windowOpenedAt,
      });
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1", mapId: 1 },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue(
        [],
      );

      await service.getKillTimelineData(guildId, eventId, heroId, killId);

      expect(
        mockPrismaService.eventMapAssignmentHistory.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedAt: { lte: killedAt },
            OR: [
              { unassignedAt: null },
              { unassignedAt: { gte: windowOpenedAt } },
            ],
          }),
        }),
      );
    });

    it("should fall back to minSpawnTimeAtKill when summary is missing", async () => {
      const killedAt = new Date("2026-02-18T11:25:18.230Z");
      const minSpawnTimeAtKill = new Date("2026-02-18T10:00:00.000Z");

      mockPrismaService.eventHeroKill.findFirst.mockResolvedValue({
        minSpawnTimeAtKill,
        killedAt,
      });
      mockPrismaService.eventRespawnWindowSummary.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1", mapId: 1 },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue(
        [],
      );

      await service.getKillTimelineData(guildId, eventId, heroId, killId);

      expect(
        mockPrismaService.eventMapAssignmentHistory.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedAt: { lte: killedAt },
            OR: [
              { unassignedAt: null },
              { unassignedAt: { gte: minSpawnTimeAtKill } },
            ],
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // getHeroKillHistory
  // ==========================================================================
  describe("getHeroKillHistory", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should return paginated kill history", async () => {
      const mockHero = { id: heroId };
      const mockKills = [
        {
          id: "kill-1",
          heroNpcId: heroId,
          killedAt: new Date(),
          minSpawnTimeAtKill: new Date(),
          points: [],
        },
        {
          id: "kill-2",
          heroNpcId: heroId,
          killedAt: new Date(),
          minSpawnTimeAtKill: new Date(),
          points: [],
        },
      ];

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.eventHeroKill.findMany.mockResolvedValue(mockKills);

      const result = await service.getHeroKillHistory(
        guildId,
        eventId,
        heroId,
        20,
      );

      expect(result.data).toHaveLength(2);
    });

    it("should include mapData for participants", async () => {
      const mockHero = { id: heroId };
      const killedAt = new Date("2026-03-02T11:45:19.661Z");
      const minSpawnTimeAtKill = new Date("2026-03-02T10:39:27.459Z");
      const mockKills = [
        {
          id: "kill-1",
          heroNpcId: heroId,
          killedAt,
          minSpawnTimeAtKill,
          maxSpawnTimeAtKill: new Date("2026-03-02T13:19:27.459Z"),
          isManualClose: false,
          heroNpc: {
            id: heroId,
            npcId: 1,
            npcName: "Hero",
            npcIcon: null,
            npcLvl: 300,
          },
          points: [
            {
              id: "point-1",
              memberId: 1,
              points: 1,
              mapPresenceData: [
                {
                  mapId: "map-1",
                  mapName: "Map 1",
                  presenceTimeSeconds: 120,
                  afkTimeSeconds: 0,
                },
              ],
              member: {
                id: 1,
                name: "User 1",
                avatar: null,
                userId: "user-1",
              },
            },
          ],
        },
      ];

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.eventHeroKill.findMany.mockResolvedValue(mockKills);
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1", heroNpcId: heroId },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([
        {
          heroNpcId: heroId,
          mapId: "map-1",
          memberId: 1,
          assignedAt: new Date("2026-03-02T10:45:19.661Z"),
          unassignedAt: null,
        },
      ]);

      const result = await service.getHeroKillHistory(
        guildId,
        eventId,
        heroId,
        20,
      );

      expect(result.data[0]?.points[0]?.mapData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            mapId: "map-1",
            mapName: "Map 1",
          }),
        ]),
      );
    });

    it("should use summary windowOpenedAt when building mapData", async () => {
      const mockHero = { id: heroId };
      const killedAt = new Date("2026-03-02T11:45:19.661Z");
      const minSpawnTimeAtKill = new Date("2026-03-02T10:39:27.459Z");
      const windowOpenedAt = new Date("2026-03-02T09:30:00.000Z");
      const mockKills = [
        {
          id: "kill-1",
          heroNpcId: heroId,
          killedAt,
          minSpawnTimeAtKill,
          maxSpawnTimeAtKill: new Date("2026-03-02T13:19:27.459Z"),
          isManualClose: false,
          heroNpc: {
            id: heroId,
            npcId: 1,
            npcName: "Hero",
            npcIcon: null,
            npcLvl: 300,
          },
          points: [
            {
              id: "point-1",
              memberId: 1,
              points: 1,
              mapPresenceData: null,
              member: {
                id: 1,
                name: "User 1",
                avatar: null,
                userId: "user-1",
              },
            },
          ],
        },
      ];

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.eventHeroKill.findMany.mockResolvedValue(mockKills);
      mockPrismaService.eventRespawnWindowSummary.findMany.mockResolvedValue([
        {
          killId: "kill-1",
          windowOpenedAt,
        },
      ]);
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1", heroNpcId: heroId },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([
        {
          heroNpcId: heroId,
          mapId: "map-1",
          memberId: 1,
          assignedAt: new Date("2026-03-02T09:45:19.661Z"),
          unassignedAt: null,
        },
      ]);

      await service.getHeroKillHistory(guildId, eventId, heroId, 20);

      expect(
        mockPrismaService.eventMapAssignmentHistory.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { unassignedAt: null },
              { unassignedAt: { gte: windowOpenedAt } },
            ],
          }),
        }),
      );
    });

    it("should throw NotFoundException when hero not found", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.getHeroKillHistory(guildId, eventId, heroId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getMemberKillHistory
  // ==========================================================================
  describe("getMemberKillHistory", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const memberId = 123;
    const heroId = "hero-1";

    it("should return paginated member kill history", async () => {
      const mockEvent = { id: eventId };
      const mockMember = {
        id: memberId,
        name: "User",
        avatar: null,
        userId: "user-1",
      };
      const killedAt = new Date("2026-03-02T11:45:19.661Z");
      const minSpawnTimeAtKill = new Date("2026-03-02T10:39:27.459Z");
      const mockKills = [
        {
          id: "kill-1",
          heroNpcId: heroId,
          killedAt,
          minSpawnTimeAtKill,
          maxSpawnTimeAtKill: new Date("2026-03-02T13:19:27.459Z"),
          isManualClose: false,
          heroNpc: {
            id: heroId,
            npcId: 1,
            npcName: "Hero",
            npcIcon: null,
            npcLvl: 300,
          },
          points: [
            {
              id: "kp-1",
              memberId,
              points: 1,
              mapPresenceData: [
                {
                  mapId: "map-1",
                  mapName: "Map 1",
                  presenceTimeSeconds: 120,
                  afkTimeSeconds: 0,
                },
              ],
            },
          ],
        },
        {
          id: "kill-2",
          heroNpcId: heroId,
          killedAt: new Date("2026-03-02T11:15:19.661Z"),
          minSpawnTimeAtKill: new Date("2026-03-02T10:39:27.459Z"),
          maxSpawnTimeAtKill: new Date("2026-03-02T13:19:27.459Z"),
          isManualClose: false,
          heroNpc: {
            id: heroId,
            npcId: 1,
            npcName: "Hero",
            npcIcon: null,
            npcLvl: 300,
          },
          points: [
            {
              id: "kp-2",
              memberId,
              points: 0.5,
            },
          ],
        },
      ];

      mockPrismaService.event.findFirst.mockResolvedValue(mockEvent);
      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.eventHeroKill.findMany.mockResolvedValue(mockKills);
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Map 1", heroNpcId: heroId },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([
        {
          heroNpcId: heroId,
          mapId: "map-1",
          memberId,
          assignedAt: new Date("2026-03-02T10:45:19.661Z"),
          unassignedAt: null,
        },
      ]);

      const result = await service.getMemberKillHistory(
        guildId,
        eventId,
        memberId,
        20,
      );

      expect(result.member).toEqual(mockMember);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: "kill-1",
          memberPoint: expect.objectContaining({
            id: "kp-1",
            mapData: expect.arrayContaining([
              expect.objectContaining({
                mapId: "map-1",
                mapName: "Map 1",
              }),
            ]),
          }),
        }),
      );
    });

    it("should clamp member tracking duration to kill window in response", async () => {
      const killedAt = new Date("2026-02-20T05:27:46.133Z");
      const minSpawnTimeAtKill = new Date("2026-02-20T03:27:46.133Z");
      const mockEvent = { id: eventId };
      const mockMember = {
        id: memberId,
        name: "User",
        avatar: null,
        userId: "user-1",
      };
      const mockKills = [
        {
          id: "kill-1",
          heroNpcId: heroId,
          killedAt,
          minSpawnTimeAtKill,
          maxSpawnTimeAtKill: new Date("2026-02-20T06:07:46.133Z"),
          isManualClose: false,
          heroNpc: {
            id: heroId,
            npcId: 1,
            npcName: "Hero",
            npcIcon: null,
            npcLvl: 300,
          },
          points: [
            {
              id: "kp-1",
              memberId,
              points: 1,
              trackingDurationSeconds: 9000,
              trackingDurationPercentage: 125,
            },
          ],
        },
      ];

      mockPrismaService.event.findFirst.mockResolvedValue(mockEvent);
      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.eventHeroKill.findMany.mockResolvedValue(mockKills);

      const result = await service.getMemberKillHistory(
        guildId,
        eventId,
        memberId,
        20,
      );

      expect(result.data[0]?.memberPoint).toEqual(
        expect.objectContaining({
          trackingDurationSeconds: 7200,
          trackingDurationPercentage: 100,
        }),
      );
    });

    it("should throw NotFoundException when event not found", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(
        service.getMemberKillHistory(guildId, eventId, memberId, 20),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when member not found", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({ id: eventId });
      mockPrismaService.member.findFirst.mockResolvedValue(null);

      await expect(
        service.getMemberKillHistory(guildId, eventId, memberId, 20),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getKillDetail
  // ==========================================================================
  describe("getKillDetail", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";
    const killId = "kill-1";

    it("should return kill details with participants and event config", async () => {
      const killedAt = new Date("2026-02-20T05:27:46.133Z");
      const minSpawnTimeAtKill = new Date("2026-02-20T03:27:46.133Z");
      const maxSpawnTimeAtKill = new Date("2026-02-20T06:07:46.133Z");
      const mockKill = {
        id: killId,
        killedAt,
        minSpawnTimeAtKill,
        maxSpawnTimeAtKill,
        points: [
          {
            id: "point-1",
            memberId: 1,
            points: 100,
            member: { name: "User 1" },
          },
        ],
        heroNpc: {
          id: heroId,
          npcName: "Test Hero",
          event: {
            basePointsPerKill: 100,
            scoringMode: "ADVANCED",
            scoringRules: null,
          },
        },
      };

      mockPrismaService.eventHeroKill.findFirst.mockResolvedValue(mockKill);
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Test Map" },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue(
        [],
      );
      mockPointsService.getMembersPresenceStatsPerMap.mockResolvedValue([]);

      const result = await service.getKillDetail(
        guildId,
        eventId,
        heroId,
        killId,
      );

      expect(result.kill.id).toBe(killId);
      expect(result.kill.points).toHaveLength(1);
      expect(result.kill.respawnDurationSeconds).toBe(7200);
      expect(result.kill.windowDurationSeconds).toBe(9600);
      expect(result.eventConfig.scoringMode).toBe("ADVANCED");
      expect(result.eventConfig.scoringRules?.timezone).toBe("Europe/Warsaw");
      expect(result.eventConfig.scoringRules?.rules.length).toBeGreaterThan(0);
    });

    it("should clamp tracking and assignment durations to minSpawn->kill window", async () => {
      const killedAt = new Date("2026-02-20T05:27:46.133Z");
      const minSpawnTimeAtKill = new Date("2026-02-20T03:27:46.133Z");
      const maxSpawnTimeAtKill = new Date("2026-02-20T06:07:46.133Z");
      const mockKill = {
        id: killId,
        killedAt,
        minSpawnTimeAtKill,
        maxSpawnTimeAtKill,
        points: [
          {
            id: "point-1",
            memberId: 1,
            points: 1,
            trackingDurationSeconds: 9000,
            trackingDurationPercentage: 125,
            mapPresenceData: null,
            member: { name: "User 1" },
          },
        ],
        heroNpc: {
          id: heroId,
          npcName: "Test Hero",
          event: {
            basePointsPerKill: 100,
            scoringMode: "ADVANCED",
            scoringRules: null,
          },
        },
      };

      mockPrismaService.eventHeroKill.findFirst.mockResolvedValue(mockKill);
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Test Map" },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([
        {
          mapId: "map-1",
          memberId: 1,
          assignedAt: new Date("2026-02-20T02:00:00.000Z"),
          unassignedAt: null,
        },
      ]);
      mockPointsService.getMembersPresenceStatsPerMap.mockResolvedValue([
        {
          memberId: 1,
          mapId: "map-1",
          presenceTimeSeconds: 0,
          afkTimeSeconds: 0,
        },
      ]);

      const result = await service.getKillDetail(
        guildId,
        eventId,
        heroId,
        killId,
      );

      expect(result.kill.points[0]).toEqual(
        expect.objectContaining({
          trackingDurationSeconds: 7200,
          trackingDurationPercentage: 100,
        }),
      );
      expect(result.kill.points[0]?.mapData[0]?.assignmentDurationSeconds).toBe(
        7200,
      );
    });

    it("should use summary windowOpenedAt for detail overlap and fallback presence", async () => {
      const killedAt = new Date("2026-02-20T05:27:46.133Z");
      const minSpawnTimeAtKill = new Date("2026-02-20T03:27:46.133Z");
      const windowOpenedAt = new Date("2026-02-20T02:30:00.000Z");
      const maxSpawnTimeAtKill = new Date("2026-02-20T06:07:46.133Z");
      const mockKill = {
        id: killId,
        killedAt,
        minSpawnTimeAtKill,
        maxSpawnTimeAtKill,
        points: [
          {
            id: "point-1",
            memberId: 1,
            points: 1,
            trackingDurationSeconds: 9000,
            trackingDurationPercentage: 125,
            mapPresenceData: null,
            member: { name: "User 1" },
          },
        ],
        heroNpc: {
          id: heroId,
          npcName: "Test Hero",
          event: {
            basePointsPerKill: 100,
            scoringMode: "ADVANCED",
            scoringRules: null,
          },
        },
      };

      mockPrismaService.eventHeroKill.findFirst.mockResolvedValue(mockKill);
      mockPrismaService.eventRespawnWindowSummary.findMany.mockResolvedValue([
        {
          killId,
          windowOpenedAt,
        },
      ]);
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: "map-1", mapName: "Test Map" },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([
        {
          mapId: "map-1",
          memberId: 1,
          assignedAt: new Date("2026-02-20T02:45:00.000Z"),
          unassignedAt: null,
        },
      ]);
      mockPointsService.getMembersPresenceStatsPerMap.mockResolvedValue([
        {
          memberId: 1,
          mapId: "map-1",
          presenceTimeSeconds: 0,
          afkTimeSeconds: 0,
        },
      ]);

      await service.getKillDetail(guildId, eventId, heroId, killId);

      expect(
        mockPrismaService.eventMapAssignmentHistory.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { unassignedAt: null },
              { unassignedAt: { gte: windowOpenedAt } },
            ],
          }),
        }),
      );
      expect(
        mockPointsService.getMembersPresenceStatsPerMap,
      ).toHaveBeenCalledWith(
        ["map-1"],
        [1],
        windowOpenedAt,
        new Date("2026-02-20T05:27:46.133Z"),
      );
    });

    it("should throw NotFoundException when kill not found", async () => {
      mockPrismaService.eventHeroKill.findFirst.mockResolvedValue(null);

      await expect(
        service.getKillDetail(guildId, eventId, heroId, killId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
