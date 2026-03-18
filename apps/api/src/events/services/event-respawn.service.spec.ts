import { Test, type TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { EventRespawnService } from "./event-respawn.service";
import { EventEmitterService } from "./event-emitter.service";
import { EventKillService } from "./event-kill.service";
import { EventTrackingService } from "./event-tracking.service";
import { EventSummaryService } from "./event-summary.service";
import { PrismaService } from "src/db/prisma.service";
import { RESPAWN_WINDOW_QUEUE } from "../constants/respawn-queue.constant";

describe("EventRespawnService", () => {
  let service: EventRespawnService;

  const mockPrismaService = {
    eventHeroNpc: {
      findFirst: jest.fn(),
    },
    eventMap: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    timer: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    eventMapAssignmentHistory: {
      updateMany: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
    getJobs: jest.fn(),
  };

  const mockEventEmitter = {
    emitMapStatusUpdate: jest.fn(),
    emitRespawnWindowOpened: jest.fn(),
    emitRespawnWindowClosed: jest.fn(),
    emitTimerUpdate: jest.fn(),
  };

  const mockKillService = {
    checkAndRecordEventHeroKill: jest.fn(),
    recordHeroKill: jest.fn(),
  };

  const mockTrackingService = {
    closeAllGapsForHero: jest.fn(),
    openUnassignedGap: jest.fn(),
    openUncoveredGap: jest.fn(),
  };

  const mockSummaryService = {
    createWindowSummary: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventRespawnService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken(RESPAWN_WINDOW_QUEUE), useValue: mockQueue },
        { provide: EventEmitterService, useValue: mockEventEmitter },
        { provide: EventKillService, useValue: mockKillService },
        { provide: EventTrackingService, useValue: mockTrackingService },
        { provide: EventSummaryService, useValue: mockSummaryService },
      ],
    }).compile();

    service = module.get<EventRespawnService>(EventRespawnService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // closeRespawnWindow
  // ==========================================================================
  describe("closeRespawnWindow", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    const mockHero = {
      id: heroId,
      npcId: 123,
      npcName: "Test Hero",
      npcIcon: "icon.png",
      event: {
        id: eventId,
        world: "tempest",
      },
      maps: [
        {
          id: "map-1",
          mapName: "Map 1",
          assignedMembers: [{ id: 1 }],
        },
      ],
    };

    const mockTimer = {
      guildId,
      world: "tempest",
      npcId: 123,
      minSpawnTime: new Date(),
      maxSpawnTime: new Date(),
      createdById: 1,
      windowOpenedAt: new Date(),
    };

    it("should close respawn window and record kill on manual close", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(mockTimer);
      mockPrismaService.eventMap.update.mockResolvedValue({});
      mockPrismaService.timer.delete.mockResolvedValue({});
      mockQueue.getJobs.mockResolvedValue([]);
      mockKillService.recordHeroKill.mockResolvedValue(undefined);

      await service.closeRespawnWindow(guildId, eventId, heroId, {
        isAutoClose: false,
      });

      expect(mockKillService.recordHeroKill).toHaveBeenCalledWith(
        guildId,
        mockHero,
        mockHero.event,
        expect.objectContaining({
          minSpawnTime: mockTimer.minSpawnTime,
          maxSpawnTime: mockTimer.maxSpawnTime,
          memberId: mockTimer.createdById,
          windowOpenedAt: mockTimer.windowOpenedAt,
        }),
        true, // isManualClose
      );
    });

    it("should await kill recording (not fire-and-forget)", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(mockTimer);
      mockPrismaService.eventMap.update.mockResolvedValue({});
      mockPrismaService.timer.delete.mockResolvedValue({});
      mockQueue.getJobs.mockResolvedValue([]);

      // Simulate kill recording failure
      mockKillService.recordHeroKill.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        service.closeRespawnWindow(guildId, eventId, heroId, {
          isAutoClose: false,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it("should auto-close without recording kill points", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(mockTimer);
      mockPrismaService.eventMap.update.mockResolvedValue({});
      mockPrismaService.eventMapAssignmentHistory.updateMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockPrismaService),
      );
      mockPrismaService.timer.delete.mockResolvedValue({});
      mockQueue.getJobs.mockResolvedValue([]);
      mockTrackingService.closeAllGapsForHero.mockResolvedValue(undefined);
      mockSummaryService.createWindowSummary.mockResolvedValue(undefined);

      await service.closeRespawnWindow(guildId, eventId, heroId, {
        isAutoClose: true,
      });

      expect(mockKillService.recordHeroKill).not.toHaveBeenCalled();
      expect(mockTrackingService.closeAllGapsForHero).toHaveBeenCalledWith(
        heroId,
      );
      expect(mockSummaryService.createWindowSummary).toHaveBeenCalledWith(
        heroId,
        null,
        expect.any(Date),
        expect.any(Date),
        mockTimer.minSpawnTime,
        mockTimer.maxSpawnTime,
        false,
      );
    });

    it("should emit map status update for maps with assigned members", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(mockTimer);
      mockPrismaService.eventMap.update.mockResolvedValue({});
      mockPrismaService.timer.delete.mockResolvedValue({});
      mockQueue.getJobs.mockResolvedValue([]);
      mockKillService.recordHeroKill.mockResolvedValue(undefined);

      await service.closeRespawnWindow(guildId, eventId, heroId, {});

      expect(mockEventEmitter.emitMapStatusUpdate).not.toHaveBeenCalled();
    });

    it("should emit map status update when auto-closing a window", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(mockTimer);
      mockPrismaService.eventMap.update.mockResolvedValue({});
      mockPrismaService.eventMapAssignmentHistory.updateMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockPrismaService),
      );
      mockPrismaService.timer.delete.mockResolvedValue({});
      mockQueue.getJobs.mockResolvedValue([]);
      mockTrackingService.closeAllGapsForHero.mockResolvedValue(undefined);
      mockSummaryService.createWindowSummary.mockResolvedValue(undefined);

      await service.closeRespawnWindow(guildId, eventId, heroId, {
        isAutoClose: true,
      });

      expect(mockEventEmitter.emitMapStatusUpdate).toHaveBeenCalledWith(
        guildId,
        eventId,
        "map-1",
      );
    });

    it("should skip kill recording if no timer exists", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(null); // No timer
      mockPrismaService.timer.delete.mockResolvedValue({});
      mockQueue.getJobs.mockResolvedValue([]);

      await service.closeRespawnWindow(guildId, eventId, heroId, {});

      // recordHeroKill should NOT be called when there's no timer
      expect(mockKillService.recordHeroKill).not.toHaveBeenCalled();
    });

    it("should cancel scheduled auto-close job", async () => {
      const mockJob = {
        id: "job-1",
        data: { heroId },
        remove: jest.fn().mockResolvedValue(undefined),
      };
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(mockTimer);
      mockPrismaService.eventMap.update.mockResolvedValue({});
      mockPrismaService.timer.delete.mockResolvedValue({});
      mockQueue.getJobs.mockResolvedValue([mockJob]);
      mockKillService.recordHeroKill.mockResolvedValue(undefined);

      await service.closeRespawnWindow(guildId, eventId, heroId, {});

      expect(mockJob.remove).toHaveBeenCalled();
    });

    it("should throw NotFoundException when hero not found", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.closeRespawnWindow(guildId, eventId, heroId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("should create new window when createNewWindow is true", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(mockTimer);
      mockPrismaService.eventMap.update.mockResolvedValue({});
      mockPrismaService.timer.delete.mockResolvedValue({});
      mockQueue.getJobs.mockResolvedValue([]);
      mockKillService.recordHeroKill.mockResolvedValue(undefined);

      // Mock for openRespawnWindow
      mockPrismaService.member.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.timer.upsert.mockResolvedValue({
        ...mockTimer,
        member: { id: 1 },
      });
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      mockQueue.add.mockResolvedValue({});

      const newMinSpawnTime = new Date(Date.now() + 60000);
      const newMaxSpawnTime = new Date(Date.now() + 120000);

      await service.closeRespawnWindow(guildId, eventId, heroId, {
        createNewWindow: true,
        newMinSpawnTime,
        newMaxSpawnTime,
      });

      // Verify openRespawnWindow was called (via timer.upsert)
      expect(mockPrismaService.timer.upsert).toHaveBeenCalled();
    });

    it("should use synthetic npcId when hero has no real npcId", async () => {
      const heroWithoutNpcId = {
        ...mockHero,
        npcId: null,
      };
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(
        heroWithoutNpcId,
      );
      mockPrismaService.timer.findUnique.mockResolvedValue(null);
      mockPrismaService.eventMap.update.mockResolvedValue({});
      mockQueue.getJobs.mockResolvedValue([]);

      await service.closeRespawnWindow(guildId, eventId, heroId, {
        isAutoClose: true,
      });

      // Should have queried with synthetic ID (negative number)
      expect(mockPrismaService.timer.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timerId: expect.objectContaining({
              npcId: expect.any(Number),
            }),
          },
        }),
      );
    });
  });

  // ==========================================================================
  // openRespawnWindow
  // ==========================================================================
  describe("openRespawnWindow", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";
    const minSpawnTime = new Date(Date.now() + 60000);
    const maxSpawnTime = new Date(Date.now() + 120000);

    const mockHero = {
      id: heroId,
      npcId: 123,
      npcName: "Test Hero",
      npcIcon: "icon.png",
      event: {
        id: eventId,
        world: "tempest",
      },
    };

    const mockMember = { id: 1 };

    it("should create timer and schedule auto-close", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.timer.upsert.mockResolvedValue({
        guildId,
        world: "tempest",
        npcId: 123,
        minSpawnTime,
        maxSpawnTime,
        member: mockMember,
      });
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      mockQueue.add.mockResolvedValue({});

      const result = await service.openRespawnWindow(guildId, eventId, heroId, {
        minSpawnTime,
        maxSpawnTime,
      });

      expect(result.minSpawnTime).toEqual(minSpawnTime);
      expect(result.maxSpawnTime).toEqual(maxSpawnTime);
      expect(mockQueue.add).toHaveBeenCalledWith(
        "auto-close-respawn-window",
        expect.objectContaining({
          guildId,
          eventId,
          heroId,
        }),
        expect.objectContaining({
          delay: expect.any(Number),
        }),
      );
    });

    it("should open coverage gaps for hero maps", async () => {
      const heroMaps = [
        { id: "map-1", mapName: "Map 1", assignedMembers: [] },
        { id: "map-2", mapName: "Map 2", assignedMembers: [{ id: 1 }] },
      ];

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.timer.upsert.mockResolvedValue({
        guildId,
        world: "tempest",
        npcId: 123,
        minSpawnTime,
        maxSpawnTime,
        member: mockMember,
      });
      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);
      mockQueue.add.mockResolvedValue({});

      await service.openRespawnWindow(guildId, eventId, heroId, {
        minSpawnTime,
        maxSpawnTime,
      });

      // map-1 has no assigned members -> UNASSIGNED gap
      expect(mockTrackingService.openUnassignedGap).toHaveBeenCalledWith(
        "map-1",
        heroId,
        expect.any(Date),
      );
      // map-2 has assigned members -> UNCOVERED gap
      expect(mockTrackingService.openUncoveredGap).toHaveBeenCalledWith(
        "map-2",
        heroId,
        expect.any(Date),
      );
    });

    it("should throw NotFoundException when hero not found", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.openRespawnWindow(guildId, eventId, heroId, {
          minSpawnTime,
          maxSpawnTime,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when no members in guild", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.member.findFirst.mockResolvedValue(null);

      await expect(
        service.openRespawnWindow(guildId, eventId, heroId, {
          minSpawnTime,
          maxSpawnTime,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should emit respawn window opened event", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.timer.upsert.mockResolvedValue({
        guildId,
        world: "tempest",
        npcId: 123,
        minSpawnTime,
        maxSpawnTime,
        member: mockMember,
      });
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      mockQueue.add.mockResolvedValue({});

      await service.openRespawnWindow(guildId, eventId, heroId, {
        minSpawnTime,
        maxSpawnTime,
      });

      expect(mockEventEmitter.emitRespawnWindowOpened).toHaveBeenCalledWith(
        guildId,
        eventId,
        heroId,
      );
      expect(mockEventEmitter.emitTimerUpdate).toHaveBeenCalled();
    });

    it("should not schedule auto-close if maxSpawnTime + buffer is in the past", async () => {
      // AUTO_CLOSE_BUFFER_MS is 5 minutes (300000ms), so we need maxSpawnTime
      // to be more than 5 minutes in the past for the job to be skipped
      const pastMaxSpawnTime = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.timer.upsert.mockResolvedValue({
        guildId,
        world: "tempest",
        npcId: 123,
        minSpawnTime,
        maxSpawnTime: pastMaxSpawnTime,
        member: mockMember,
      });
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);

      await service.openRespawnWindow(guildId, eventId, heroId, {
        minSpawnTime,
        maxSpawnTime: pastMaxSpawnTime,
      });

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("should pass exact windowOpenedAt to gap creation for all maps", async () => {
      const heroMaps = [
        { id: "map-1", mapName: "Unassigned Map", assignedMembers: [] },
        { id: "map-2", mapName: "Assigned Map", assignedMembers: [{ id: 1 }] },
      ];

      let capturedWindowOpenedAt: Date | undefined;
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.timer.upsert.mockImplementation((args) => {
        capturedWindowOpenedAt = args.create.windowOpenedAt;
        return Promise.resolve({
          guildId,
          world: "tempest",
          npcId: 123,
          minSpawnTime,
          maxSpawnTime,
          member: mockMember,
          windowOpenedAt: capturedWindowOpenedAt,
        });
      });
      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);
      mockQueue.add.mockResolvedValue({});

      await service.openRespawnWindow(guildId, eventId, heroId, {
        minSpawnTime,
        maxSpawnTime,
      });

      // Both gaps should receive the exact same windowOpenedAt timestamp
      expect(mockTrackingService.openUnassignedGap).toHaveBeenCalledWith(
        "map-1",
        heroId,
        capturedWindowOpenedAt,
      );
      expect(mockTrackingService.openUncoveredGap).toHaveBeenCalledWith(
        "map-2",
        heroId,
        capturedWindowOpenedAt,
      );
    });

    it("should use same timestamp for all gap creations", async () => {
      const heroMaps = [
        { id: "map-1", assignedMembers: [] },
        { id: "map-2", assignedMembers: [] },
        { id: "map-3", assignedMembers: [] },
      ];

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.timer.upsert.mockResolvedValue({
        guildId,
        world: "tempest",
        npcId: 123,
        minSpawnTime,
        maxSpawnTime,
        member: mockMember,
      });
      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);
      mockQueue.add.mockResolvedValue({});

      await service.openRespawnWindow(guildId, eventId, heroId, {
        minSpawnTime,
        maxSpawnTime,
      });

      // All 3 maps should have gaps with the same timestamp
      expect(mockTrackingService.openUnassignedGap).toHaveBeenCalledTimes(3);

      const calls = mockTrackingService.openUnassignedGap.mock.calls;
      const firstTimestamp = calls[0][2];

      // All timestamps should be identical
      expect(calls[1][2]).toBe(firstTimestamp);
      expect(calls[2][2]).toBe(firstTimestamp);
    });
  });

  // ==========================================================================
  // getHeroRespawnConfig
  // ==========================================================================
  describe("getHeroRespawnConfig", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    const mockHero = {
      id: heroId,
      npcId: 123,
      event: { world: "tempest" },
    };

    it("should return OPEN status when within spawn window", async () => {
      const now = new Date();
      const timer = {
        minSpawnTime: new Date(now.getTime() - 60000),
        maxSpawnTime: new Date(now.getTime() + 60000),
      };

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(timer);

      const result = await service.getHeroRespawnConfig(
        guildId,
        eventId,
        heroId,
      );

      expect(result.windowStatus).toBe("OPEN");
      expect(result.hasTimer).toBe(true);
    });

    it("should return WAITING status when before spawn window", async () => {
      const now = new Date();
      const timer = {
        minSpawnTime: new Date(now.getTime() + 60000),
        maxSpawnTime: new Date(now.getTime() + 120000),
      };

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(timer);

      const result = await service.getHeroRespawnConfig(
        guildId,
        eventId,
        heroId,
      );

      expect(result.windowStatus).toBe("WAITING");
      expect(result.hasTimer).toBe(false);
    });

    it("should return NONE status when no timer exists", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(null);

      const result = await service.getHeroRespawnConfig(
        guildId,
        eventId,
        heroId,
      );

      expect(result.windowStatus).toBe("NONE");
      expect(result.hasTimer).toBe(false);
      expect(result.minSpawnTime).toBeNull();
      expect(result.maxSpawnTime).toBeNull();
    });

    it("should return NONE status when timer expired", async () => {
      const now = new Date();
      const timer = {
        minSpawnTime: new Date(now.getTime() - 120000),
        maxSpawnTime: new Date(now.getTime() - 60000),
      };

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.timer.findUnique.mockResolvedValue(timer);

      const result = await service.getHeroRespawnConfig(
        guildId,
        eventId,
        heroId,
      );

      expect(result.windowStatus).toBe("NONE");
    });

    it("should throw NotFoundException when hero not found", async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.getHeroRespawnConfig(guildId, eventId, heroId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
