import { Test, type TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { EventKillService } from './event-kill.service';
import { EventEmitterService } from './event-emitter.service';
import { EventPointsService } from './event-points.service';
import { EventTrackingService } from './event-tracking.service';
import { EventSummaryService } from './event-summary.service';
import { PrismaService } from 'src/db/prisma.service';
import { RedisService } from 'src/lib/redis/redis.service';
import { RESPAWN_WINDOW_QUEUE } from '../constants/respawn-queue.constant';
import type { Event, EventHeroNpc } from 'generated/client';

describe('EventKillService', () => {
  let service: EventKillService;

  const mockPrismaService = {
    event: {
      findFirst: jest.fn(),
    },
    eventHeroNpc: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    eventMap: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    eventHeroKill: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    eventKillPoint: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    eventMapAssignmentHistory: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    eventMapCoverageGap: {
      findMany: jest.fn(),
    },
    eventRespawnWindowSummary: {
      findUnique: jest.fn(),
    },
    timer: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
    getJobs: jest.fn(),
  };

  const mockEventEmitter = {
    emitHeroKilled: jest.fn(),
    emitMapStatusUpdate: jest.fn(),
    emitRespawnWindowClosed: jest.fn(),
    emitRespawnWindowOpened: jest.fn(),
  };

  const mockPointsService = {
    calculateMemberPoints: jest.fn(),
    getMemberPresenceStats: jest.fn(),
    getMemberPresenceStatsPerMap: jest.fn(),
    updateRankingAfterKill: jest.fn(),
  };

  const mockTrackingService = {
    closeAllGapsForHero: jest.fn(),
    openUnassignedGap: jest.fn(),
  };

  const mockSummaryService = {
    createWindowSummary: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    setNX: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
      ],
    }).compile();

    service = module.get<EventKillService>(EventKillService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // getEventHeroTimers
  // ==========================================================================
  describe('getEventHeroTimers', () => {
    const guildId = 'guild-1';
    const eventId = 'event-1';
    const world = 'tempest';

    it('should return timers for event heroes', async () => {
      const mockEvent = {
        id: eventId,
        guildId,
        heroNpcs: [
          { id: 'hero-1', npcId: 123, npcName: 'Hero 1' },
          { id: 'hero-2', npcId: 456, npcName: 'Hero 2' },
        ],
      };
      const mockTimers = [
        { guildId, world, npcId: 123, member: { id: 1 } },
        { guildId, world, npcId: 456, member: { id: 2 } },
      ];

      mockPrismaService.event.findFirst.mockResolvedValue(mockEvent);
      mockPrismaService.timer.findMany.mockResolvedValue(mockTimers);

      const result = await service.getEventHeroTimers(guildId, eventId, world);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when event has no heroes', async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({
        id: eventId,
        heroNpcs: [],
      });

      const result = await service.getEventHeroTimers(guildId, eventId, world);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when event not found', async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(
        service.getEventHeroTimers(guildId, eventId, world),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle heroes without npcId (name matching)', async () => {
      const mockEvent = {
        id: eventId,
        guildId,
        heroNpcs: [{ id: 'hero-1', npcId: null, npcName: 'Named Hero' }],
      };

      mockPrismaService.event.findFirst.mockResolvedValue(mockEvent);
      mockPrismaService.$queryRaw.mockResolvedValue([
        { npcId: -12345, createdById: 1, guildId, world },
      ]);
      mockPrismaService.member.findMany.mockResolvedValue([{ id: 1 }]);

      const result = await service.getEventHeroTimers(guildId, eventId, world);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getEventHeroStats
  // ==========================================================================
  describe('getEventHeroStats', () => {
    const guildId = 'guild-1';
    const eventId = 'event-1';

    it('should return hero stats with kill counts', async () => {
      const mockEvent = {
        id: eventId,
        heroNpcs: [
          { id: 'hero-1', npcId: 123, npcName: 'Hero 1', kills: [{}, {}, {}] },
          { id: 'hero-2', npcId: 456, npcName: 'Hero 2', kills: [{}] },
        ],
      };

      mockPrismaService.event.findFirst.mockResolvedValue(mockEvent);

      const result = await service.getEventHeroStats(guildId, eventId);

      expect(result).toHaveLength(2);
      expect(result[0].killCount).toBe(3);
      expect(result[1].killCount).toBe(1);
    });

    it('should throw NotFoundException when event not found', async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(service.getEventHeroStats(guildId, eventId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // findActiveEventHeroByNpc
  // ==========================================================================
  describe('findActiveEventHeroByNpc', () => {
    const guildId = 'guild-1';
    const world = 'tempest';
    const npcId = 123;
    const npcName = 'Test Hero';

    it('should find hero by npcId first', async () => {
      const mockHeroNpc = {
        id: 'hero-1',
        npcId,
        npcName,
        event: { id: 'event-1', guildId, world, active: true },
      };

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHeroNpc);

      const result = await service.findActiveEventHeroByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );

      expect(result).not.toBeNull();
      expect(result?.eventHero.id).toBe('hero-1');
    });

    it('should find hero by name if npcId not found', async () => {
      const mockHeroNpc = {
        id: 'hero-1',
        npcId: null,
        npcName,
        event: { id: 'event-1', guildId, world, active: true },
      };

      mockPrismaService.eventHeroNpc.findFirst
        .mockResolvedValueOnce(null) // First call by npcId
        .mockResolvedValueOnce(mockHeroNpc); // Second call by name

      const result = await service.findActiveEventHeroByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );

      expect(result).not.toBeNull();
      expect(mockPrismaService.eventHeroNpc.findFirst).toHaveBeenCalledTimes(2);
    });

    it('should return null if hero not found', async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

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
  describe('checkAndRecordEventHeroKill', () => {
    const guildId = 'guild-1';
    const world = 'tempest';
    const npcId = 123;
    const npcName = 'Test Hero';
    const npcIcon = 'icon.png';
    const timerData = {
      minSpawnTime: new Date(),
      maxSpawnTime: new Date(),
      memberId: 1,
      previousMinSpawnTime: new Date(),
      previousMaxSpawnTime: new Date(),
      windowOpenedAt: new Date(),
    };

    it('should skip duplicate kill when dedup window is active', async () => {
      mockRedisService.get.mockResolvedValueOnce('1');

      await service.checkAndRecordEventHeroKill(
        guildId,
        world,
        npcId,
        npcName,
        npcIcon,
        timerData,
      );

      expect(mockRedisService.setNX).not.toHaveBeenCalled();
      expect(mockPrismaService.eventHeroNpc.findFirst).not.toHaveBeenCalled();
    });

    it('should skip duplicate kill when lock is already held', async () => {
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

      expect(mockPrismaService.eventHeroNpc.findFirst).not.toHaveBeenCalled();
      expect(mockRedisService.del).not.toHaveBeenCalled();
    });

    it('should skip if NPC is not an event hero', async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

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

    it('should update hero npcId if missing', async () => {
      const mockHero = {
        id: 'hero-1',
        npcId: null,
        npcIcon: null,
        npcName,
        event: { id: 'event-1' },
      };
      const updatedHero = { ...mockHero, npcId, npcIcon };

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockRedisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.eventHeroNpc.update.mockResolvedValue(updatedHero);
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
        where: { id: 'hero-1' },
        data: { npcId, npcIcon },
      });
    });

    it('should record kill for manual close', async () => {
      const mockHero = {
        id: 'hero-1',
        npcId,
        npcIcon,
        npcName,
        event: { id: 'event-1' },
      };

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
        `event:hero:kill:dedup:${guildId}:${world}:${npcId}`,
        expect.any(String),
        15,
      );
    });

    it('should not set dedup marker when record fails', async () => {
      const mockHero = {
        id: 'hero-1',
        npcId,
        npcIcon,
        npcName,
        event: { id: 'event-1' },
      };

      mockRedisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockRejectedValue(new Error('boom'));

      await service.checkAndRecordEventHeroKill(
        guildId,
        world,
        npcId,
        npcName,
        npcIcon,
        timerData,
      );

      expect(mockRedisService.set).not.toHaveBeenCalled();
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `event:hero:kill:lock:${guildId}:${world}:${npcId}`,
      );
    });
  });

  // ==========================================================================
  // recordHeroKill
  // ==========================================================================
  describe('recordHeroKill', () => {
    const guildId = 'guild-1';
    const mockEvent = {
      id: 'event-1',
      guildId,
      basePointsPerKill: 100,
    } as unknown as Event;

    const mockEventHero = {
      id: 'hero-1',
      npcId: 123,
      npcName: 'Test Hero',
    } as EventHeroNpc;

    const timerData = {
      minSpawnTime: new Date(),
      maxSpawnTime: new Date(),
      memberId: 1,
      previousMinSpawnTime: new Date(),
      previousMaxSpawnTime: new Date(),
      windowOpenedAt: new Date(),
    };

    it('should create kill record with points for members assigned in current window', async () => {
      const now = Date.now();
      const windowOpenedAt = new Date(now - 15 * 60 * 1000);
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };
      const mockMaps = [
        {
          id: 'map-1',
          mapName: 'Map 1',
          assignedMembers: [],
        },
      ];

      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);

      // Mock transaction to use the tx proxy properly
      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue([
            { id: 'point-1', killId: 'kill-1', memberId: 1, points: 100 },
            { id: 'point-2', killId: 'kill-1', memberId: 2, points: 100 },
          ]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([
            {
              mapId: 'map-1',
              memberId: 1,
              assignedAt: new Date(now - 10 * 60 * 1000),
            },
            {
              mapId: 'map-1',
              memberId: 2,
              assignedAt: new Date(now - 5 * 60 * 1000),
            },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
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
        { mapId: 'map-1', presenceTimeSeconds: 300, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        points: 100,
        appliedMultiplier: 1.0,
        timeMultiplier: 1.0,
        trackersMultiplier: 1.0,
        mapsMultiplier: 1.0,
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
      expect(mockPointsService.getMemberPresenceStats).toHaveBeenCalledWith(
        mockEventHero.id,
        1,
        windowOpenedAt,
      );
      expect(mockPointsService.updateRankingAfterKill).toHaveBeenCalled();
    });

    it('should award points to member previously assigned but currently unassigned', async () => {
      const now = Date.now();
      const windowOpenedAt = new Date(now - 5 * 60 * 1000);
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };
      const mockMaps = [
        {
          id: 'map-1',
          mapName: 'Map 1',
          assignedMembers: [],
        },
      ];

      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'point-1', killId: 'kill-1', memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([
            {
              mapId: 'map-1',
              memberId: 1,
              assignedAt: new Date(now - 2 * 60 * 1000),
            },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
        { mapId: 'map-1', presenceTimeSeconds: 300, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        points: 100,
        appliedMultiplier: 1.0,
        timeMultiplier: 1.0,
        trackersMultiplier: 1.0,
        mapsMultiplier: 1.0,
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
              mapName: 'Map 1',
            }),
          ]),
        }),
      );
      expect(mockPointsService.calculateMemberPoints).toHaveBeenCalled();
      const calculateCall =
        mockPointsService.calculateMemberPoints.mock.calls[0];
      expect(calculateCall[0]).toBe(mockEvent);
      expect(calculateCall[2]).toBe(1);
      expect(calculateCall[3]).toBe(1);
    });

    it('should award points to member assigned before window start when assignment overlaps kill window', async () => {
      const now = Date.now();
      const windowOpenedAt = new Date(now - 5 * 60 * 1000);
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Map 1' },
      ]);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'point-1', killId: 'kill-1', memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([
            {
              mapId: 'map-1',
              memberId: 1,
              assignedAt: new Date(now - 30 * 60 * 1000),
              unassignedAt: null,
            },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
        { mapId: 'map-1', presenceTimeSeconds: 300, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        points: 100,
        appliedMultiplier: 1,
        timeMultiplier: 1,
        trackersMultiplier: 1,
        mapsMultiplier: 1,
        trackingDurationMultiplier: 1,
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

    it('should ignore assignments from previous windows', async () => {
      const now = Date.now();
      const windowOpenedAt = new Date(now - 60 * 1000);
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Map 1' },
      ]);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'point-1', killId: 'kill-1', memberId: 2, points: 100 },
            ]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          // Includes one stale assignment that must be ignored.
          findMany: jest.fn().mockResolvedValue([
            {
              mapId: 'map-1',
              memberId: 1,
              assignedAt: new Date(now - 20 * 60 * 1000),
              unassignedAt: new Date(now - 10 * 60 * 1000),
            },
            {
              mapId: 'map-1',
              memberId: 2,
              assignedAt: new Date(now - 20 * 1000),
            },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
        { mapId: 'map-1', presenceTimeSeconds: 20, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        points: 100,
        appliedMultiplier: 1,
        timeMultiplier: 1,
        trackersMultiplier: 1,
        mapsMultiplier: 1,
        trackingDurationMultiplier: 1,
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

    it('should calculate tracking duration only within current window', async () => {
      jest.useFakeTimers();
      const killedAt = new Date('2026-02-18T06:08:31.185Z');
      jest.setSystemTime(killedAt);

      const windowOpenedAt = new Date('2026-02-18T06:08:25.185Z');
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Map 1' },
      ]);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'point-1', killId: 'kill-1', memberId: 2, points: 100 },
            ]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          // Includes one stale assignment that should be ignored.
          findMany: jest.fn().mockResolvedValue([
            {
              mapId: 'map-1',
              memberId: 1,
              assignedAt: new Date('2026-02-18T05:29:05.185Z'),
              unassignedAt: new Date('2026-02-18T06:00:00.000Z'),
            },
            {
              mapId: 'map-1',
              memberId: 2,
              assignedAt: new Date('2026-02-18T06:08:26.061Z'),
            },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
        { mapId: 'map-1', presenceTimeSeconds: 5, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        points: 100,
        appliedMultiplier: 1,
        timeMultiplier: 1,
        trackersMultiplier: 1,
        mapsMultiplier: 1,
        trackingDurationMultiplier: 1,
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
        expect(calculateCall[4]).toBe(83);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should not double count tracking duration for overlapping assignments on multiple maps', async () => {
      jest.useFakeTimers();
      const killedAt = new Date('2026-02-18T06:10:00.000Z');
      jest.setSystemTime(killedAt);

      const windowOpenedAt = new Date('2026-02-18T06:00:00.000Z');
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Map 1' },
        { id: 'map-2', mapName: 'Map 2' },
      ]);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'point-1', killId: 'kill-1', memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([
            {
              mapId: 'map-1',
              memberId: 1,
              assignedAt: new Date('2026-02-18T06:05:00.000Z'),
              unassignedAt: new Date('2026-02-18T06:10:00.000Z'),
            },
            {
              mapId: 'map-2',
              memberId: 1,
              assignedAt: new Date('2026-02-18T06:06:00.000Z'),
              unassignedAt: new Date('2026-02-18T06:09:00.000Z'),
            },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
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
        { mapId: 'map-1', presenceTimeSeconds: 300, afkTimeSeconds: 0 },
        { mapId: 'map-2', presenceTimeSeconds: 180, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        points: 100,
        appliedMultiplier: 1,
        timeMultiplier: 1,
        trackersMultiplier: 1,
        mapsMultiplier: 1,
        trackingDurationMultiplier: 1,
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
        expect(calculateCall[2]).toBe(2);
        expect(calculateCall[4]).toBe(50);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should exclude real gaps between map switches from tracking duration', async () => {
      jest.useFakeTimers();
      const killedAt = new Date('2026-02-18T06:10:00.000Z');
      jest.setSystemTime(killedAt);

      const windowOpenedAt = new Date('2026-02-18T06:00:00.000Z');
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Map 1' },
        { id: 'map-2', mapName: 'Map 2' },
      ]);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'point-1', killId: 'kill-1', memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([
            {
              mapId: 'map-1',
              memberId: 1,
              assignedAt: new Date('2026-02-18T06:00:00.000Z'),
              unassignedAt: new Date('2026-02-18T06:05:00.000Z'),
            },
            {
              mapId: 'map-2',
              memberId: 1,
              assignedAt: new Date('2026-02-18T06:05:10.000Z'),
              unassignedAt: null,
            },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
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
        { mapId: 'map-1', presenceTimeSeconds: 300, afkTimeSeconds: 0 },
        { mapId: 'map-2', presenceTimeSeconds: 290, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        points: 100,
        appliedMultiplier: 1,
        timeMultiplier: 1,
        trackersMultiplier: 1,
        mapsMultiplier: 1,
        trackingDurationMultiplier: 1,
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
        jest.useRealTimers();
      }
    });

    it('should keep tracking duration continuous when map switch has no gap', async () => {
      jest.useFakeTimers();
      const killedAt = new Date('2026-02-18T06:10:00.000Z');
      jest.setSystemTime(killedAt);

      const windowOpenedAt = new Date('2026-02-18T06:00:00.000Z');
      const timerDataInWindow = {
        ...timerData,
        previousMinSpawnTime: windowOpenedAt,
        windowOpenedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Map 1' },
        { id: 'map-2', mapName: 'Map 2' },
      ]);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'point-1', killId: 'kill-1', memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([
            {
              mapId: 'map-1',
              memberId: 1,
              assignedAt: new Date('2026-02-18T06:00:00.000Z'),
              unassignedAt: new Date('2026-02-18T06:05:00.000Z'),
            },
            {
              mapId: 'map-2',
              memberId: 1,
              assignedAt: new Date('2026-02-18T06:05:00.000Z'),
              unassignedAt: null,
            },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
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
        { mapId: 'map-1', presenceTimeSeconds: 300, afkTimeSeconds: 0 },
        { mapId: 'map-2', presenceTimeSeconds: 300, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        points: 100,
        appliedMultiplier: 1,
        timeMultiplier: 1,
        trackersMultiplier: 1,
        mapsMultiplier: 1,
        trackingDurationMultiplier: 1,
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
        jest.useRealTimers();
      }
    });

    it('should keep tracking duration percentage null when window duration is zero', async () => {
      jest.useFakeTimers();
      const killedAt = new Date('2026-02-18T06:08:31.185Z');
      jest.setSystemTime(killedAt);

      const timerDataZeroWindow = {
        ...timerData,
        previousMinSpawnTime: killedAt,
        windowOpenedAt: killedAt,
      };

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Map 1' },
      ]);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'point-1', killId: 'kill-1', memberId: 1, points: 100 },
            ]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([
            {
              mapId: 'map-1',
              memberId: 1,
              assignedAt: killedAt,
            },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
        { mapId: 'map-1', presenceTimeSeconds: 0, afkTimeSeconds: 0 },
      ]);
      mockPointsService.calculateMemberPoints.mockReturnValue({
        points: 100,
        appliedMultiplier: 1,
        timeMultiplier: 1,
        trackersMultiplier: 1,
        mapsMultiplier: 1,
        trackingDurationMultiplier: 1,
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
        expect(calculateCall[4]).toBeUndefined();
      } finally {
        jest.useRealTimers();
      }
    });

    it('should handle kill with no assigned members', async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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

    it('should close coverage gaps after kill', async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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

    it('should emit hero killed event', async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
        'kill-1',
      );
    });

    it('should create window summary after kill', async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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

    it('should open UNASSIGNED gaps for new window when kill creates new respawn', async () => {
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
        { id: 'map-1', assignedMembers: [] },
        { id: 'map-2', assignedMembers: [] },
      ];

      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
        'map-1',
        mockEventHero.id,
        expect.any(Date),
      );
      expect(mockTrackingService.openUnassignedGap).toHaveBeenCalledWith(
        'map-2',
        mockEventHero.id,
        expect.any(Date),
      );
    });

    it('should NOT open gaps when isManualClose is true', async () => {
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

      const heroMaps = [{ id: 'map-1', assignedMembers: [] }];
      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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

    it('should NOT open gaps when minSpawnTime is not in the future (auto-close scenario)', async () => {
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

      const heroMaps = [{ id: 'map-1', assignedMembers: [] }];
      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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

    it('should NOT open gaps when spawn times are null', async () => {
      const timerDataNoSpawnTimes = {
        minSpawnTime: null,
        maxSpawnTime: null,
        previousMinSpawnTime: new Date(),
        previousMaxSpawnTime: new Date(),
        memberId: 1,
        windowOpenedAt: new Date(),
      };

      const heroMaps = [{ id: 'map-1', assignedMembers: [] }];
      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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

    it('should pass killedAt timestamp to gap creation', async () => {
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

      const heroMaps = [{ id: 'map-1', assignedMembers: [] }];
      mockPrismaService.eventMap.findMany.mockResolvedValue(heroMaps);

      const txMock = {
        eventHeroKill: {
          create: jest.fn().mockResolvedValue({ id: 'kill-1' }),
        },
        eventKillPoint: {
          createMany: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        eventMap: {
          update: jest.fn().mockResolvedValue({}),
        },
        eventMapAssignmentHistory: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
  describe('getKillTimelineData', () => {
    const guildId = 'guild-1';
    const eventId = 'event-1';
    const heroId = 'hero-1';
    const killId = 'kill-1';

    it('should use summary windowOpenedAt for assignment overlap filtering', async () => {
      const killedAt = new Date('2026-02-18T11:25:18.230Z');
      const minSpawnTimeAtKill = new Date('2026-02-18T11:25:18.230Z');
      const windowOpenedAt = new Date('2026-02-18T09:27:52.727Z');

      mockPrismaService.eventHeroKill.findFirst.mockResolvedValue({
        minSpawnTimeAtKill,
        killedAt,
      });
      mockPrismaService.eventRespawnWindowSummary.findUnique.mockResolvedValue({
        gapsTimeline: [],
        windowOpenedAt,
      });
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Map 1', mapId: 1 },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([]);

      await service.getKillTimelineData(guildId, eventId, heroId, killId);

      expect(mockPrismaService.eventMapAssignmentHistory.findMany).toHaveBeenCalledWith(
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

    it('should fall back to minSpawnTimeAtKill when summary is missing', async () => {
      const killedAt = new Date('2026-02-18T11:25:18.230Z');
      const minSpawnTimeAtKill = new Date('2026-02-18T10:00:00.000Z');

      mockPrismaService.eventHeroKill.findFirst.mockResolvedValue({
        minSpawnTimeAtKill,
        killedAt,
      });
      mockPrismaService.eventRespawnWindowSummary.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Map 1', mapId: 1 },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([]);

      await service.getKillTimelineData(guildId, eventId, heroId, killId);

      expect(mockPrismaService.eventMapAssignmentHistory.findMany).toHaveBeenCalledWith(
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
  describe('getHeroKillHistory', () => {
    const guildId = 'guild-1';
    const eventId = 'event-1';
    const heroId = 'hero-1';

    it('should return paginated kill history', async () => {
      const mockHero = { id: heroId };
      const mockKills = [
        { id: 'kill-1', killedAt: new Date(), points: [] },
        { id: 'kill-2', killedAt: new Date(), points: [] },
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

    it('should throw NotFoundException when hero not found', async () => {
      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(null);

      await expect(
        service.getHeroKillHistory(guildId, eventId, heroId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getKillDetail
  // ==========================================================================
  describe('getKillDetail', () => {
    const guildId = 'guild-1';
    const eventId = 'event-1';
    const heroId = 'hero-1';
    const killId = 'kill-1';

    it('should return kill details with participants and event config', async () => {
      const mockKill = {
        id: killId,
        killedAt: new Date(),
        minSpawnTimeAtKill: new Date(),
        points: [
          {
            id: 'point-1',
            memberId: 1,
            points: 100,
            member: { name: 'User 1' },
          },
        ],
        heroNpc: {
          id: heroId,
          npcName: 'Test Hero',
          event: {
            basePointsPerKill: 100,
            timeOfDayMultipliers: null,
            trackersMultipliers: null,
            mapsCountMultipliers: null,
          },
        },
      };

      mockPrismaService.eventHeroKill.findFirst.mockResolvedValue(mockKill);
      mockPrismaService.eventRespawnWindowSummary.findUnique.mockResolvedValue({
        totalWindowSeconds: 3600,
      });
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Test Map' },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue(
        [],
      );
      mockPointsService.getMemberPresenceStatsPerMap.mockResolvedValue([]);

      const result = await service.getKillDetail(
        guildId,
        eventId,
        heroId,
        killId,
      );

      expect(result.kill.id).toBe(killId);
      expect(result.kill.points).toHaveLength(1);
      expect(result.kill.windowDurationSeconds).toBe(3600);
      expect(result.eventConfig.basePointsPerKill).toBe(100);
    });

    it('should throw NotFoundException when kill not found', async () => {
      mockPrismaService.eventHeroKill.findFirst.mockResolvedValue(null);

      await expect(
        service.getKillDetail(guildId, eventId, heroId, killId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
