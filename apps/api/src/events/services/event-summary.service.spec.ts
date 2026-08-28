import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { CoverageGapType } from "src/db/domain";
import { PrismaService } from "src/db/prisma.service";
import { EventSummaryService } from "./event-summary.service";
import { createPrismaServiceTestDouble } from "src/test/prisma-service-test-double";

describe("EventSummaryService", () => {
  let service: EventSummaryService;

  const mockTransaction = mockFn();

  const mockPrismaService = createPrismaServiceTestDouble({
    eventMap: {
      findMany: mockFn(),
    },
    eventPresenceLog: {
      findMany: mockFn(),
      deleteMany: mockFn(),
    },
    eventMapCoverageGap: {
      findMany: mockFn(),
      deleteMany: mockFn(),
    },
    eventRespawnWindowSummary: {
      create: mockFn(),
      findMany: mockFn(),
    },
    eventHeroNpc: {
      findFirst: mockFn(),
    },
    transaction: mockTransaction,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventSummaryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EventSummaryService>(EventSummaryService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createWindowSummary", () => {
    const heroNpcId = "hero-npc-1";
    const killId = "kill-1";
    const windowOpenedAt = new Date("2024-01-01T10:00:00Z");
    const windowClosedAt = new Date("2024-01-01T11:00:00Z"); // 1 hour window
    const minSpawnTime = new Date("2024-01-01T10:30:00Z");
    const maxSpawnTime = new Date("2024-01-01T10:45:00Z");
    const wasManualClose = false;

    const mockMaps = [
      { id: "map-1", mapName: "Map One", mapId: "123" },
      { id: "map-2", mapName: "Map Two", mapId: "456" },
    ];

    const mockMember = {
      id: 1,
      name: "TestPlayer",
      avatar: "avatar.png",
    };

    beforeEach(() => {
      mockTransaction.mockImplementation((callback) => {
        const txClient = {
          eventRespawnWindowSummary: {
            create: mockFn().mockResolvedValue({}),
          },
          eventPresenceLog: {
            deleteMany: mockFn().mockResolvedValue({ count: 5 }),
          },
          eventMapCoverageGap: {
            deleteMany: mockFn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(txClient);
      });
    });

    it("should skip summary creation when no maps exist for hero", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);

      await service.createWindowSummary(
        heroNpcId,
        killId,
        windowOpenedAt,
        windowClosedAt,
        minSpawnTime,
        maxSpawnTime,
        wasManualClose,
      );

      expect(mockPrismaService.eventMap.findMany).toHaveBeenCalledWith({
        where: { heroNpcId },
        select: { id: true, mapName: true, mapId: true },
      });
      expect(
        mockPrismaService.eventPresenceLog.findMany,
      ).not.toHaveBeenCalled();
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("should fetch presence logs and coverage gaps for the window period", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);
      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue([]);
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue([]);

      await service.createWindowSummary(
        heroNpcId,
        killId,
        windowOpenedAt,
        windowClosedAt,
        minSpawnTime,
        maxSpawnTime,
        wasManualClose,
      );

      expect(mockPrismaService.eventPresenceLog.findMany).toHaveBeenCalledWith({
        where: {
          mapId: { in: ["map-1", "map-2"] },
          OR: [
            {
              startedAt: { gte: windowOpenedAt, lte: windowClosedAt },
            },
            {
              startedAt: { lt: windowOpenedAt },
              OR: [{ endedAt: null }, { endedAt: { gt: windowOpenedAt } }],
            },
          ],
        },
        include: {
          member: { select: { id: true, name: true, avatar: true } },
        },
      });

      expect(
        mockPrismaService.eventMapCoverageGap.findMany,
      ).toHaveBeenCalledWith({
        where: {
          heroNpcId,
          OR: [
            {
              startedAt: { gte: windowOpenedAt, lte: windowClosedAt },
            },
            {
              startedAt: { lt: windowOpenedAt },
              OR: [{ endedAt: null }, { endedAt: { gt: windowOpenedAt } }],
            },
          ],
        },
      });
    });

    it("should calculate member statistics from presence logs", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);

      const presenceLogs = [
        {
          id: "log-1",
          memberId: 1,
          mapId: "map-1",
          startedAt: new Date("2024-01-01T10:00:00Z"),
          endedAt: new Date("2024-01-01T10:30:00Z"), // 30 minutes active
          isAfk: false,
          member: mockMember,
        },
        {
          id: "log-2",
          memberId: 1,
          mapId: "map-1",
          startedAt: new Date("2024-01-01T10:30:00Z"),
          endedAt: new Date("2024-01-01T11:00:00Z"), // 30 minutes AFK
          isAfk: true,
          member: mockMember,
        },
      ];

      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue(
        presenceLogs,
      );
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue([]);

      let capturedData: unknown;
      mockTransaction.mockImplementation((callback) => {
        const txClient = {
          eventRespawnWindowSummary: {
            create: mockFn().mockImplementation(({ data }) => {
              capturedData = data;
              return {};
            }),
          },
          eventPresenceLog: {
            deleteMany: mockFn().mockResolvedValue({ count: 2 }),
          },
          eventMapCoverageGap: {
            deleteMany: mockFn().mockResolvedValue({ count: 0 }),
          },
        };
        return callback(txClient);
      });

      await service.createWindowSummary(
        heroNpcId,
        killId,
        windowOpenedAt,
        windowClosedAt,
        minSpawnTime,
        maxSpawnTime,
        wasManualClose,
      );

      expect(capturedData).toBeDefined();
      const data = capturedData as {
        memberStats: Array<{
          memberId: number;
          name: string;
          timeSeconds: number;
          afkSeconds: number;
          afkPercentage: number;
          maps: string[];
        }>;
        totalWindowSeconds: number;
      };

      expect(data.memberStats).toHaveLength(1);
      expect(data.memberStats[0].memberId).toBe(1);
      expect(data.memberStats[0].timeSeconds).toBe(3600); // 60 minutes total
      expect(data.memberStats[0].afkSeconds).toBe(1800); // 30 minutes AFK
      expect(data.memberStats[0].afkPercentage).toBe(50); // 50% AFK
      expect(data.memberStats[0].maps).toContain("Map One");
    });

    it("should calculate coverage gap statistics", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);
      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue([]);

      const gaps = [
        {
          id: "gap-1",
          heroNpcId,
          mapId: "map-1",
          gapType: CoverageGapType.UNCOVERED,
          startedAt: new Date("2024-01-01T10:00:00Z"),
          endedAt: new Date("2024-01-01T10:15:00Z"), // 15 minutes uncovered
        },
        {
          id: "gap-2",
          heroNpcId,
          mapId: "map-2",
          gapType: CoverageGapType.UNASSIGNED,
          startedAt: new Date("2024-01-01T10:30:00Z"),
          endedAt: new Date("2024-01-01T10:45:00Z"), // 15 minutes unassigned
        },
      ];

      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue(gaps);

      let capturedData: unknown;
      mockTransaction.mockImplementation((callback) => {
        const txClient = {
          eventRespawnWindowSummary: {
            create: mockFn().mockImplementation(({ data }) => {
              capturedData = data;
              return {};
            }),
          },
          eventPresenceLog: {
            deleteMany: mockFn().mockResolvedValue({ count: 0 }),
          },
          eventMapCoverageGap: {
            deleteMany: mockFn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(txClient);
      });

      await service.createWindowSummary(
        heroNpcId,
        killId,
        windowOpenedAt,
        windowClosedAt,
        minSpawnTime,
        maxSpawnTime,
        wasManualClose,
      );

      expect(capturedData).toBeDefined();
      const data = capturedData as {
        totalUncoveredSeconds: number;
        totalUnassignedSeconds: number;
        gapsTimeline: Array<{
          mapId: string;
          gapType: string;
          durationSeconds: number;
        }>;
      };

      expect(data.totalUncoveredSeconds).toBe(900); // 15 minutes
      expect(data.totalUnassignedSeconds).toBe(900); // 15 minutes
      expect(data.gapsTimeline).toHaveLength(2);
    });

    it("should clamp presence logs to window boundaries", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);

      // Presence log that extends beyond window boundaries
      const presenceLogs = [
        {
          id: "log-1",
          memberId: 1,
          mapId: "map-1",
          startedAt: new Date("2024-01-01T09:30:00Z"), // Started 30 min before window
          endedAt: new Date("2024-01-01T11:30:00Z"), // Ended 30 min after window
          isAfk: false,
          member: mockMember,
        },
      ];

      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue(
        presenceLogs,
      );
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue([]);

      let capturedData: unknown;
      mockTransaction.mockImplementation((callback) => {
        const txClient = {
          eventRespawnWindowSummary: {
            create: mockFn().mockImplementation(({ data }) => {
              capturedData = data;
              return {};
            }),
          },
          eventPresenceLog: {
            deleteMany: mockFn().mockResolvedValue({ count: 1 }),
          },
          eventMapCoverageGap: {
            deleteMany: mockFn().mockResolvedValue({ count: 0 }),
          },
        };
        return callback(txClient);
      });

      await service.createWindowSummary(
        heroNpcId,
        killId,
        windowOpenedAt,
        windowClosedAt,
        minSpawnTime,
        maxSpawnTime,
        wasManualClose,
      );

      const data = capturedData as {
        memberStats: Array<{ timeSeconds: number }>;
      };

      // Should only count 1 hour (window duration), not 2 hours (full log duration)
      expect(data.memberStats[0].timeSeconds).toBe(3600); // 1 hour
    });

    it("should handle null killId for auto-close without kill", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);
      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue([]);
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue([]);

      let capturedData: unknown;
      mockTransaction.mockImplementation((callback) => {
        const txClient = {
          eventRespawnWindowSummary: {
            create: mockFn().mockImplementation(({ data }) => {
              capturedData = data;
              return {};
            }),
          },
          eventPresenceLog: {
            deleteMany: mockFn().mockResolvedValue({ count: 0 }),
          },
          eventMapCoverageGap: {
            deleteMany: mockFn().mockResolvedValue({ count: 0 }),
          },
        };
        return callback(txClient);
      });

      await service.createWindowSummary(
        heroNpcId,
        null, // No kill
        windowOpenedAt,
        windowClosedAt,
        minSpawnTime,
        maxSpawnTime,
        true, // Manual close
      );

      const data = capturedData as {
        killId: string | null;
        wasManualClose: boolean;
      };

      expect(data.killId).toBeNull();
      expect(data.wasManualClose).toBe(true);
    });

    it("should delete raw data after creating summary", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);
      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue([]);
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue([]);

      const deleteLogsMock = mockFn().mockResolvedValue({ count: 5 });
      const deleteGapsMock = mockFn().mockResolvedValue({ count: 3 });

      mockTransaction.mockImplementation((callback) => {
        const txClient = {
          eventRespawnWindowSummary: {
            create: mockFn().mockResolvedValue({}),
          },
          eventPresenceLog: {
            deleteMany: deleteLogsMock,
          },
          eventMapCoverageGap: {
            deleteMany: deleteGapsMock,
          },
        };
        return callback(txClient);
      });

      await service.createWindowSummary(
        heroNpcId,
        killId,
        windowOpenedAt,
        windowClosedAt,
        minSpawnTime,
        maxSpawnTime,
        wasManualClose,
      );

      expect(deleteLogsMock).toHaveBeenCalledWith({
        where: {
          mapId: { in: ["map-1", "map-2"] },
          OR: expect.any(Array),
        },
      });

      expect(deleteGapsMock).toHaveBeenCalledWith({
        where: {
          heroNpcId,
          endedAt: { not: null, lte: windowClosedAt },
        },
      });
    });

    it("should calculate map statistics with coverage and gaps per map", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);

      const presenceLogs = [
        {
          id: "log-1",
          memberId: 1,
          mapId: "map-1",
          startedAt: windowOpenedAt,
          endedAt: windowClosedAt,
          isAfk: false,
          member: mockMember,
        },
      ];

      const gaps = [
        {
          id: "gap-1",
          heroNpcId,
          mapId: "map-2",
          gapType: CoverageGapType.UNCOVERED,
          startedAt: windowOpenedAt,
          endedAt: windowClosedAt,
        },
      ];

      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue(
        presenceLogs,
      );
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue(gaps);

      let capturedData: unknown;
      mockTransaction.mockImplementation((callback) => {
        const txClient = {
          eventRespawnWindowSummary: {
            create: mockFn().mockImplementation(({ data }) => {
              capturedData = data;
              return {};
            }),
          },
          eventPresenceLog: {
            deleteMany: mockFn().mockResolvedValue({ count: 1 }),
          },
          eventMapCoverageGap: {
            deleteMany: mockFn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(txClient);
      });

      await service.createWindowSummary(
        heroNpcId,
        killId,
        windowOpenedAt,
        windowClosedAt,
        minSpawnTime,
        maxSpawnTime,
        wasManualClose,
      );

      const data = capturedData as {
        mapStats: Array<{
          mapId: string;
          mapName: string;
          coverageSeconds: number;
          gapSeconds: number;
        }>;
      };

      // Map 1 should have coverage, Map 2 should have gap
      const map1Stats = data.mapStats.find((m) => m.mapId === "map-1");
      const map2Stats = data.mapStats.find((m) => m.mapId === "map-2");

      expect(map1Stats?.coverageSeconds).toBe(3600);
      expect(map1Stats?.gapSeconds).toBe(0);
      expect(map2Stats?.coverageSeconds).toBe(0);
      expect(map2Stats?.gapSeconds).toBe(3600);
    });

    it("should not count AFK time as coverage", async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);

      const presenceLogs = [
        {
          id: "log-1",
          memberId: 1,
          mapId: "map-1",
          startedAt: windowOpenedAt,
          endedAt: windowClosedAt,
          isAfk: true, // All AFK
          member: mockMember,
        },
      ];

      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue(
        presenceLogs,
      );
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue([]);

      let capturedData: unknown;
      mockTransaction.mockImplementation((callback) => {
        const txClient = {
          eventRespawnWindowSummary: {
            create: mockFn().mockImplementation(({ data }) => {
              capturedData = data;
              return {};
            }),
          },
          eventPresenceLog: {
            deleteMany: mockFn().mockResolvedValue({ count: 1 }),
          },
          eventMapCoverageGap: {
            deleteMany: mockFn().mockResolvedValue({ count: 0 }),
          },
        };
        return callback(txClient);
      });

      await service.createWindowSummary(
        heroNpcId,
        killId,
        windowOpenedAt,
        windowClosedAt,
        minSpawnTime,
        maxSpawnTime,
        wasManualClose,
      );

      const data = capturedData as {
        mapStats: Array<{ mapId: string; coverageSeconds: number }>;
        totalCoverageSeconds: number;
      };

      // AFK time should not count as coverage
      const map1Stats = data.mapStats.find((m) => m.mapId === "map-1");
      expect(map1Stats?.coverageSeconds).toBe(0);
      expect(data.totalCoverageSeconds).toBe(0);
    });
  });

  describe("getHeroWindowSummaries", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroNpcId = "hero-npc-1";

    it("should return empty result when hero does not exist", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      const result = await service.getHeroWindowSummaries(
        guildId,
        eventId,
        heroNpcId,
      );

      expect(result).toEqual({ data: [], nextCursor: null });
      expect(
        mockPrismaService.eventRespawnWindowSummary.findMany,
      ).not.toHaveBeenCalled();
    });

    it("should return summaries when hero exists", async () => {
      const mockHero = { id: heroNpcId, eventId };
      const mockSummaries = [
        { id: "summary-1", heroNpcId, windowClosedAt: new Date() },
        { id: "summary-2", heroNpcId, windowClosedAt: new Date() },
      ];

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.eventRespawnWindowSummary.findMany.mockResolvedValue(
        mockSummaries,
      );

      const result = await service.getHeroWindowSummaries(
        guildId,
        eventId,
        heroNpcId,
      );

      expect(mockPrismaService.eventHeroNpc.findFirst).toHaveBeenCalledWith({
        where: {
          id: heroNpcId,
          eventId,
          event: { guildId },
        },
      });

      expect(
        mockPrismaService.eventRespawnWindowSummary.findMany,
      ).toHaveBeenCalledWith({
        where: { heroNpcId },
        orderBy: { windowClosedAt: "desc" },
        take: 21, // limit + 1 for pagination
      });

      expect(result.data).toEqual(mockSummaries);
      expect(result.nextCursor).toBeNull();
    });

    it("should use cursor for pagination", async () => {
      const mockHero = { id: heroNpcId, eventId };
      const cursor = "previous-summary-id";

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.eventRespawnWindowSummary.findMany.mockResolvedValue(
        [],
      );

      await service.getHeroWindowSummaries(
        guildId,
        eventId,
        heroNpcId,
        20,
        cursor,
      );

      expect(
        mockPrismaService.eventRespawnWindowSummary.findMany,
      ).toHaveBeenCalledWith({
        where: {
          heroNpcId,
          id: { lt: cursor },
        },
        orderBy: { windowClosedAt: "desc" },
        take: 21,
      });
    });

    it("should return nextCursor when more results exist", async () => {
      const mockHero = { id: heroNpcId, eventId };
      const mockSummaries = Array.from({ length: 21 }, (_, i) => ({
        id: `summary-${i}`,
        heroNpcId,
        windowClosedAt: new Date(),
      }));

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.eventRespawnWindowSummary.findMany.mockResolvedValue(
        mockSummaries,
      );

      const result = await service.getHeroWindowSummaries(
        guildId,
        eventId,
        heroNpcId,
        20, // limit
      );

      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).toBe("summary-19"); // Last item of truncated results
    });

    it("should respect custom limit parameter", async () => {
      const mockHero = { id: heroNpcId, eventId };
      const customLimit = 5;

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.eventRespawnWindowSummary.findMany.mockResolvedValue(
        [],
      );

      await service.getHeroWindowSummaries(
        guildId,
        eventId,
        heroNpcId,
        customLimit,
      );

      expect(
        mockPrismaService.eventRespawnWindowSummary.findMany,
      ).toHaveBeenCalledWith({
        where: { heroNpcId },
        orderBy: { windowClosedAt: "desc" },
        take: customLimit + 1,
      });
    });
  });
});
