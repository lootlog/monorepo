import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EventTrackingService } from "./event-tracking.service.js";
import { EventReadCacheService } from "./event-read-cache.service.js";
import { EventEmitterService } from "./event-emitter.service.js";
import { PrismaService } from "#src/db/prisma.service";
import { attachPrismaOrmMock } from "#src/test/prisma-orm.mock";
import { RedisService } from "@lootlog/nest-shared/redis";
import { RedlockService } from "#src/lib/redlock/redlock.service";
import { CoverageGapType } from "#src/db/domain";
import { TimersService } from "#src/timers/timers.service";

describe("EventTrackingService", () => {
  let service: EventTrackingService;

  const mockPrismaService = {
    eventMap: {
      findFirst: mockFn(),
      findMany: mockFn(),
      findUnique: mockFn(),
      update: mockFn(),
    },
    eventMapToMember: {
      createMany: mockFn(),
      deleteMany: mockFn(),
      findMany: mockFn(),
    },
    eventMapAssignmentHistory: {
      create: mockFn(),
      findFirst: mockFn(),
      updateMany: mockFn(),
    },
    eventMapCoverageGap: {
      findFirst: mockFn(),
      findMany: mockFn(),
      create: mockFn(),
      update: mockFn(),
    },
    eventPresenceLog: {
      findMany: mockFn(),
      create: mockFn(),
      updateMany: mockFn(),
    },
    eventHeroNpc: {
      findFirst: mockFn(),
    },
    member: {
      findFirst: mockFn(),
    },
    timer: {
      findUnique: mockFn(),
      findMany: mockFn(),
    },
    $transaction: mockFn(),
  };

  const mockEventEmitter = {
    emitMapStatusUpdate: mockFn(),
  };

  const mockAmqpConnection = {
    publish: mockFn(),
  };

  const mockRedisClient = {
    set: mockFn(),
    get: mockFn(),
    del: mockFn(),
  };

  const mockRedisService = {
    getClient: mockFn().mockReturnValue(mockRedisClient),
    get: mockFn(),
    set: mockFn(),
  };

  const mockEventReadCache = {
    getEventKey: mockFn(
      (guildId: string, eventId: string, scope: string) =>
        `event-read:${guildId}:${eventId}:${scope}`,
    ),
    getOrSet: mockFn((_key: string, factory: () => Promise<unknown>) =>
      factory(),
    ),
    invalidateEvent: mockFn(),
  };

  const mockRedlock = {
    using: mockFn(),
    acquire: mockFn(),
  };

  const mockTimersService = {
    getActiveTimerKeys: mockFn(),
    getEventRespawnTimer: mockFn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventTrackingService,
        {
          provide: PrismaService,
          useValue: attachPrismaOrmMock(mockPrismaService),
        },
        { provide: EventEmitterService, useValue: mockEventEmitter },
        { provide: EventReadCacheService, useValue: mockEventReadCache },
        { provide: AmqpConnection, useValue: mockAmqpConnection },
        { provide: RedisService, useValue: mockRedisService },
        {
          provide: RedlockService,
          useValue: { createInstance: mockFn().mockReturnValue(mockRedlock) },
        },
        { provide: TimersService, useValue: mockTimersService },
      ],
    }).compile();

    service = module.get<EventTrackingService>(EventTrackingService);

    // Inject mock redlock (bypassing onModuleInit)
    (service as unknown as { redlock: typeof mockRedlock }).redlock =
      mockRedlock;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // assignMemberToMap
  // ==========================================================================
  describe("assignMemberToMap", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const mapId = "map-1";
    const memberId = 1;

    const mockMap = {
      id: mapId,
      mapName: "Test Map",
      heroNpcId: "hero-1",
      heroNpc: {
        npcId: 123,
        npcName: "Test Hero",
        event: {
          assignmentTimeoutMinutes: 5,
          mapAssignmentCap: null,
          world: "tempest",
        },
      },
      assignedMembers: [],
    };

    beforeEach(() => {
      mockPrismaService.member.findFirst.mockResolvedValue({ id: memberId });
    });

    it("should assign member to map successfully", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockTimersService.getEventRespawnTimer.mockResolvedValue({
        minSpawnTime: new Date(Date.now() - 60_000),
        maxSpawnTime: new Date(Date.now() + 60_000),
      });
      mockPrismaService.eventMapAssignmentHistory.findFirst.mockResolvedValue(
        null,
      );
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...mockMap,
        assignedMembers: [{ id: memberId }],
      });
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);
      mockEventEmitter.emitMapStatusUpdate.mockResolvedValue(undefined);

      const result = await service.assignMemberToMap(
        guildId,
        eventId,
        mapId,
        memberId,
      );

      expect(result.assignedMembers).toHaveLength(1);
      expect(
        mockPrismaService.eventMapAssignmentHistory.create,
      ).toHaveBeenCalled();
    });

    it("should skip assignment if member is already assigned (idempotency)", async () => {
      const mapWithMember = {
        ...mockMap,
        assignedMembers: [{ id: memberId }],
      };
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mapWithMember);
      mockPrismaService.eventMap.findUnique.mockResolvedValue(mapWithMember);

      await service.assignMemberToMap(guildId, eventId, mapId, memberId);

      expect(mockPrismaService.eventMap.update).not.toHaveBeenCalled();
      expect(
        mockPrismaService.eventMapAssignmentHistory.create,
      ).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when map not found", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(null);

      await expect(
        service.assignMemberToMap(guildId, eventId, mapId, memberId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when member not found", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockPrismaService.member.findFirst.mockResolvedValue(null);

      await expect(
        service.assignMemberToMap(guildId, eventId, mapId, memberId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when map assignment cap is reached", async () => {
      const mapAtCap = {
        ...mockMap,
        assignedMembers: [{ id: 2 }, { id: 3 }],
        heroNpc: {
          ...mockMap.heroNpc,
          event: { mapAssignmentCap: 2, world: "tempest" },
        },
      };
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mapAtCap);
      mockTimersService.getEventRespawnTimer.mockResolvedValue({
        minSpawnTime: new Date(Date.now() - 60_000),
        maxSpawnTime: new Date(Date.now() + 60_000),
      });

      await expect(
        service.assignMemberToMap(guildId, eventId, mapId, memberId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should not create duplicate assignment history", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockTimersService.getEventRespawnTimer.mockResolvedValue({
        minSpawnTime: new Date(Date.now() - 60_000),
        maxSpawnTime: new Date(Date.now() + 60_000),
      });
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...mockMap,
        assignedMembers: [{ id: memberId }],
      });
      // Simulate existing open assignment
      mockPrismaService.eventMapAssignmentHistory.findFirst.mockResolvedValue({
        id: "existing-1",
        mapId,
        memberId,
        unassignedAt: null,
      });
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.assignMemberToMap(guildId, eventId, mapId, memberId);

      expect(
        mockPrismaService.eventMapAssignmentHistory.create,
      ).not.toHaveBeenCalled();
    });

    it("should close UNASSIGNED gap when first member is assigned", async () => {
      const emptyMap = { ...mockMap, assignedMembers: [] };
      mockPrismaService.eventMap.findFirst.mockResolvedValue(emptyMap);
      mockTimersService.getEventRespawnTimer.mockResolvedValue({
        minSpawnTime: new Date(Date.now() - 60_000),
        maxSpawnTime: new Date(Date.now() + 60_000),
      });
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...emptyMap,
        assignedMembers: [{ id: memberId }],
      });
      mockPrismaService.eventMapAssignmentHistory.findFirst.mockResolvedValue(
        null,
      );

      // Mock the open gap
      const openGap = {
        id: "gap-1",
        mapId,
        gapType: CoverageGapType.UNASSIGNED,
        startedAt: new Date(),
        endedAt: null,
      };
      mockPrismaService.eventMapCoverageGap.findFirst
        .mockResolvedValueOnce(openGap) // For closeUnassignedGap
        .mockResolvedValueOnce(null); // For openUncoveredGap check

      await service.assignMemberToMap(guildId, eventId, mapId, memberId);

      expect(mockPrismaService.eventMapCoverageGap.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: openGap.id },
          data: expect.objectContaining({
            endedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("should throw BadRequestException when assigning after max spawn time", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockTimersService.getEventRespawnTimer.mockResolvedValue({
        minSpawnTime: new Date(Date.now() - 120_000),
        maxSpawnTime: new Date(Date.now() - 60_000),
      });

      await expect(
        service.assignMemberToMap(guildId, eventId, mapId, memberId),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.eventMap.update).not.toHaveBeenCalled();
    });

    it("should reject assignment before the configured assignment window", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockTimersService.getEventRespawnTimer.mockResolvedValue({
        minSpawnTime: new Date(Date.now() + 60 * 60_000),
        maxSpawnTime: new Date(Date.now() + 90 * 60_000),
      });

      await expect(
        service.assignMemberToMap(guildId, eventId, mapId, memberId),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.eventMap.update).not.toHaveBeenCalled();
      expect(
        mockPrismaService.eventMapAssignmentHistory.create,
      ).not.toHaveBeenCalled();
    });

    it("should reject assignment without an active respawn timer", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockTimersService.getEventRespawnTimer.mockResolvedValue(null);

      await expect(
        service.assignMemberToMap(guildId, eventId, mapId, memberId),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.eventMap.update).not.toHaveBeenCalled();
    });

    it("should allow assignment exactly when the configured window opens", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-07-28T12:00:00.000Z"));

      try {
        mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
        mockTimersService.getEventRespawnTimer.mockResolvedValue({
          minSpawnTime: new Date("2026-07-28T12:05:00.000Z"),
          maxSpawnTime: new Date("2026-07-28T12:30:00.000Z"),
        });
        mockPrismaService.eventMapAssignmentHistory.findFirst.mockResolvedValue(
          null,
        );
        mockPrismaService.eventMap.update.mockResolvedValue({
          ...mockMap,
          assignedMembers: [{ id: memberId }],
        });
        mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);
        mockEventEmitter.emitMapStatusUpdate.mockResolvedValue(undefined);

        await expect(
          service.assignMemberToMap(guildId, eventId, mapId, memberId),
        ).resolves.toMatchObject({
          assignedMembers: [{ id: memberId }],
        });
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // ==========================================================================
  // unassignMemberFromMap
  // ==========================================================================
  describe("unassignMemberFromMap", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const mapId = "map-1";
    const memberId = 1;

    const mockMap = {
      id: mapId,
      mapName: "Test Map",
      heroNpcId: "hero-1",
      assignedMembers: [{ id: memberId }],
      heroNpc: { id: "hero-1" },
    };

    it("should unassign specific member from map", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...mockMap,
        assignedMembers: [],
      });
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.unassignMemberFromMap(guildId, eventId, mapId, memberId);

      expect(
        mockPrismaService.eventMapAssignmentHistory.updateMany,
      ).toHaveBeenCalledWith({
        where: { mapId, memberId, unassignedAt: null },
        data: { unassignedAt: expect.any(Date) },
      });
    });

    it("should unassign all members when no memberId provided", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...mockMap,
        assignedMembers: [],
      });
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.unassignMemberFromMap(guildId, eventId, mapId);

      expect(
        mockPrismaService.eventMapToMember.deleteMany,
      ).toHaveBeenCalledWith({ where: { a: mapId } });
    });

    it("should throw NotFoundException when map not found", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(null);

      await expect(
        service.unassignMemberFromMap(guildId, eventId, mapId, memberId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should open UNASSIGNED gap when last member is unassigned", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...mockMap,
        assignedMembers: [],
      });
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.unassignMemberFromMap(guildId, eventId, mapId, memberId);

      expect(mockPrismaService.eventMapCoverageGap.create).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            mapId,
            heroNpcId: mockMap.heroNpcId,
            gapType: CoverageGapType.UNASSIGNED,
          }),
        },
      );
    });
  });

  // ==========================================================================
  // handlePlayerPresenceChange
  // ==========================================================================
  describe("handlePlayerPresenceChange", () => {
    const guildId = "guild-1";
    const mapName = "Test Map";
    const discordId = "discord-123";

    beforeEach(() => {
      // Setup redlock.using to execute the callback
      mockRedlock.using.mockImplementation((_keys, _ttl, callback) => {
        return callback();
      });
    });

    it("should acquire lock before processing presence change", async () => {
      mockPrismaService.member.findFirst.mockResolvedValue(null);
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      mockTimersService.getActiveTimerKeys.mockResolvedValue(new Set());

      await service.handlePlayerPresenceChange(
        guildId,
        mapName,
        discordId,
        true,
        false,
      );

      expect(mockRedlock.using).toHaveBeenCalledWith(
        [`presence:lock:${guildId}:${mapName}:${discordId}`],
        5000,
        expect.any(Function),
      );
    });

    it("should skip processing if lock cannot be acquired", async () => {
      const { ExecutionError } = await import("redlock");
      // Create a mock error that looks like a redlock execution error
      const executionError = new ExecutionError("Lock failed", [] as never);
      mockRedlock.using.mockRejectedValue(executionError);

      // Should not throw, just skip
      await expect(
        service.handlePlayerPresenceChange(
          guildId,
          mapName,
          discordId,
          true,
          false,
        ),
      ).resolves.not.toThrow();

      expect(mockPrismaService.eventMap.findMany).not.toHaveBeenCalled();
    });

    it("should create presence log when player enters map", async () => {
      const mockMember = { id: 1, name: "Test User" };
      const mockEventMap = {
        id: "map-1",
        mapName,
        heroNpcId: "hero-1",
        assignedMembers: [{ id: 1 }],
        heroNpc: {
          id: "hero-1",
          npcId: 123,
          npcName: "Test Hero",
          event: { world: "tempest" },
        },
      };

      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.eventMap.findMany.mockResolvedValue([mockEventMap]);
      mockTimersService.getActiveTimerKeys.mockResolvedValue(
        new Set([`${guildId}:tempest:123:test hero`]),
      );
      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue([]);
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue({
        id: "gap-1",
        gapType: CoverageGapType.UNCOVERED,
        startedAt: new Date(),
      });

      await service.handlePlayerPresenceChange(
        guildId,
        mapName,
        discordId,
        true,
        false,
      );

      expect(mockPrismaService.eventPresenceLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: expect.any(String),
          mapId: mockEventMap.id,
          memberId: mockMember.id,
          isAfk: false,
        }),
      });
    });

    it("should close UNCOVERED gap when active player arrives", async () => {
      const mockMember = { id: 1 };
      const mockEventMap = {
        id: "map-1",
        mapName,
        heroNpcId: "hero-1",
        assignedMembers: [{ id: 1 }],
        heroNpc: {
          id: "hero-1",
          npcId: 123,
          npcName: "Test Hero",
          event: { world: "tempest" },
        },
      };
      const openGap = {
        id: "gap-1",
        mapId: "map-1",
        gapType: CoverageGapType.UNCOVERED,
        startedAt: new Date(Date.now() - 60000),
        endedAt: null,
      };

      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.eventMap.findMany.mockResolvedValue([mockEventMap]);
      mockTimersService.getActiveTimerKeys.mockResolvedValue(
        new Set([`${guildId}:tempest:123:test hero`]),
      );
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(
        openGap,
      );

      await service.handlePlayerPresenceChange(
        guildId,
        mapName,
        discordId,
        true,
        false,
      );

      expect(mockPrismaService.eventMapCoverageGap.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: openGap.id },
          data: expect.objectContaining({
            endedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("should skip tracking if no active respawn window", async () => {
      const mockEventMap = {
        id: "map-1",
        mapName,
        heroNpcId: "hero-1",
        assignedMembers: [],
        heroNpc: {
          id: "hero-1",
          npcId: 123,
          npcName: "Test Hero",
          event: { world: "tempest" },
        },
      };

      mockPrismaService.member.findFirst.mockResolvedValue(null);
      mockPrismaService.eventMap.findMany.mockResolvedValue([mockEventMap]);
      // No active timers
      mockTimersService.getActiveTimerKeys.mockResolvedValue(new Set());

      await service.handlePlayerPresenceChange(
        guildId,
        mapName,
        discordId,
        true,
        false,
      );

      // Should not create any presence logs
      expect(mockPrismaService.eventPresenceLog.create).not.toHaveBeenCalled();
    });

    it("should use batch query for timer checks (N+1 optimization)", async () => {
      const mockEventMaps = [
        {
          id: "map-1",
          mapName,
          heroNpcId: "hero-1",
          assignedMembers: [],
          heroNpc: {
            id: "hero-1",
            npcId: 123,
            npcName: "Hero 1",
            event: { world: "tempest" },
          },
        },
        {
          id: "map-2",
          mapName,
          heroNpcId: "hero-2",
          assignedMembers: [],
          heroNpc: {
            id: "hero-2",
            npcId: 456,
            npcName: "Hero 2",
            event: { world: "tempest" },
          },
        },
      ];

      mockPrismaService.member.findFirst.mockResolvedValue(null);
      mockPrismaService.eventMap.findMany.mockResolvedValue(mockEventMaps);
      mockTimersService.getActiveTimerKeys.mockResolvedValue(new Set());

      await service.handlePlayerPresenceChange(
        guildId,
        mapName,
        discordId,
        true,
        false,
      );

      expect(mockTimersService.getActiveTimerKeys).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.timer.findUnique).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Coverage Gap Management
  // ==========================================================================
  describe("openUnassignedGap", () => {
    const mapId = "map-1";
    const heroNpcId = "hero-1";

    it("should create UNASSIGNED gap", async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.openUnassignedGap(mapId, heroNpcId);

      expect(mockPrismaService.eventMapCoverageGap.create).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            mapId,
            heroNpcId,
            gapType: CoverageGapType.UNASSIGNED,
          }),
        },
      );
    });

    it("should not create duplicate gap if one already exists", async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue({
        id: "existing-gap",
        gapType: CoverageGapType.UNASSIGNED,
        endedAt: null,
      });

      await service.openUnassignedGap(mapId, heroNpcId);

      expect(
        mockPrismaService.eventMapCoverageGap.create,
      ).not.toHaveBeenCalled();
    });

    it("should use provided startedAt timestamp when creating gap", async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);
      const customStartedAt = new Date("2026-01-08T12:00:00.000Z");

      await service.openUnassignedGap(mapId, heroNpcId, customStartedAt);

      expect(mockPrismaService.eventMapCoverageGap.create).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            mapId,
            heroNpcId,
            gapType: CoverageGapType.UNASSIGNED,
            startedAt: customStartedAt,
          }),
        },
      );
    });

    it("should use current time when startedAt is not provided", async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);
      const beforeCall = new Date();

      await service.openUnassignedGap(mapId, heroNpcId);

      const afterCall = new Date();
      const callArgs =
        mockPrismaService.eventMapCoverageGap.create.mock.calls[0][0];
      const usedStartedAt = callArgs.data.startedAt;

      expect(usedStartedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime(),
      );
      expect(usedStartedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe("openUncoveredGap", () => {
    const mapId = "map-1";
    const heroNpcId = "hero-1";

    it("should create UNCOVERED gap", async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.openUncoveredGap(mapId, heroNpcId);

      expect(mockPrismaService.eventMapCoverageGap.create).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            mapId,
            heroNpcId,
            gapType: CoverageGapType.UNCOVERED,
          }),
        },
      );
    });

    it("should not create duplicate gap if one already exists", async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue({
        id: "existing-gap",
        gapType: CoverageGapType.UNCOVERED,
        endedAt: null,
      });

      await service.openUncoveredGap(mapId, heroNpcId);

      expect(
        mockPrismaService.eventMapCoverageGap.create,
      ).not.toHaveBeenCalled();
    });

    it("should use provided startedAt timestamp when creating gap", async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);
      const customStartedAt = new Date("2026-01-08T12:00:00.000Z");

      await service.openUncoveredGap(mapId, heroNpcId, customStartedAt);

      expect(mockPrismaService.eventMapCoverageGap.create).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            startedAt: customStartedAt,
          }),
        },
      );
    });

    it("should use current time when startedAt is not provided", async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);
      const beforeCall = new Date();

      await service.openUncoveredGap(mapId, heroNpcId);

      const callArgs =
        mockPrismaService.eventMapCoverageGap.create.mock.calls[0][0];
      const usedStartedAt = callArgs.data.startedAt;

      expect(usedStartedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime(),
      );
    });
  });

  describe("closeUnassignedGap", () => {
    const mapId = "map-1";

    it("should close existing UNASSIGNED gap", async () => {
      const openGap = {
        id: "gap-1",
        mapId,
        gapType: CoverageGapType.UNASSIGNED,
        startedAt: new Date(Date.now() - 60000),
        endedAt: null,
      };
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(
        openGap,
      );

      await service.closeUnassignedGap(mapId);

      expect(mockPrismaService.eventMapCoverageGap.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: openGap.id },
          data: expect.objectContaining({
            endedAt: expect.any(Date),
            durationSeconds: expect.any(Number),
          }),
        }),
      );
    });

    it("should do nothing if no open gap exists", async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.closeUnassignedGap(mapId);

      expect(
        mockPrismaService.eventMapCoverageGap.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe("closeAllGapsForHero", () => {
    const heroNpcId = "hero-1";

    it("should close all open gaps atomically in a transaction", async () => {
      const openGaps = [
        { id: "gap-1", startedAt: new Date(Date.now() - 60000), endedAt: null },
        { id: "gap-2", startedAt: new Date(Date.now() - 30000), endedAt: null },
      ];
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue(
        openGaps,
      );
      mockPrismaService.$transaction.mockResolvedValue([]);

      await service.closeAllGapsForHero(heroNpcId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it("should do nothing if no open gaps", async () => {
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue([]);

      await service.closeAllGapsForHero(heroNpcId);

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Query Methods
  // ==========================================================================
  describe("getMapCoverageGaps", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const mapId = "map-1";

    it("should return coverage gaps for a map", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue({ id: mapId });
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue([
        { id: "gap-1", gapType: CoverageGapType.UNASSIGNED },
      ]);

      const result = await service.getMapCoverageGaps(guildId, eventId, mapId);

      expect(result).toHaveLength(1);
      expect(
        mockPrismaService.eventMapCoverageGap.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { mapId },
          orderBy: { startedAt: "desc" },
        }),
      );
    });

    it("should throw NotFoundException when map not found", async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(null);

      await expect(
        service.getMapCoverageGaps(guildId, eventId, mapId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getMemberByDiscordId", () => {
    const discordId = "discord-123";
    const guildId = "guild-1";

    it("should return active member by discord ID", async () => {
      const mockMember = { id: 1, userId: discordId, guildId, active: true };
      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);

      const result = await service.getMemberByDiscordId(discordId, guildId);

      expect(result).toEqual(mockMember);
      expect(mockPrismaService.member.findFirst).toHaveBeenCalledWith({
        where: {
          userId: discordId,
          guildId,
          active: true,
        },
      });
    });

    it("should return null for non-existing member", async () => {
      mockPrismaService.member.findFirst.mockResolvedValue(null);

      const result = await service.getMemberByDiscordId(discordId, guildId);

      expect(result).toBeNull();
    });
  });
});
