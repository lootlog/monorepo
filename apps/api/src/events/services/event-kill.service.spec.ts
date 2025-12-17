import { Test, type TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { EventKillService } from './event-kill.service';
import { EventEmitterService } from './event-emitter.service';
import { EventPointsService } from './event-points.service';
import { EventTrackingService } from './event-tracking.service';
import { EventSummaryService } from './event-summary.service';
import { PrismaService } from 'src/db/prisma.service';
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
    updateRankingAfterKill: jest.fn(),
  };

  const mockTrackingService = {
    closeAllGapsForHero: jest.fn(),
  };

  const mockSummaryService = {
    createWindowSummary: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventKillService,
        { provide: PrismaService, useValue: mockPrismaService },
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
        heroNpcs: [
          { id: 'hero-1', npcId: null, npcName: 'Named Hero' },
        ],
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

      await expect(
        service.getEventHeroStats(guildId, eventId),
      ).rejects.toThrow(NotFoundException);
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
      mockPrismaService.eventHeroNpc.update.mockResolvedValue(updatedHero);
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockPrismaService),
      );
      mockPrismaService.eventHeroKill.create.mockResolvedValue({ id: 'kill-1' });

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
        event: { id: 'event-1', autoCalculatePoints: true },
      };

      mockPrismaService.eventHeroNpc.findFirst.mockResolvedValue(mockHero);
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockPrismaService),
      );
      mockPrismaService.eventHeroKill.create.mockResolvedValue({ id: 'kill-1' });

      await service.checkAndRecordEventHeroKill(
        guildId,
        world,
        npcId,
        npcName,
        npcIcon,
        timerData,
        true, // isManualClose
      );

      expect(mockPrismaService.eventHeroKill.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isManualClose: true,
          }),
        }),
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
      autoCalculatePoints: true,
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

    it('should create kill record with points for assigned members', async () => {
      const mockMaps = [
        {
          id: 'map-1',
          mapName: 'Map 1',
          assignedMembers: [{ id: 1 }, { id: 2 }],
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
      mockPointsService.calculateMemberPoints.mockReturnValue({
        points: 100,
        appliedMultiplier: 1.0,
      });

      await service.recordHeroKill(
        guildId,
        mockEventHero,
        mockEvent,
        timerData,
      );

      expect(txMock.eventHeroKill.create).toHaveBeenCalled();
      expect(mockPointsService.updateRankingAfterKill).toHaveBeenCalled();
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

    it('should skip point calculation when autoCalculatePoints is false', async () => {
      const eventNoAutoCalc = {
        ...mockEvent,
        autoCalculatePoints: false,
      } as unknown as Event;
      const mockMaps = [
        {
          id: 'map-1',
          mapName: 'Map 1',
          assignedMembers: [{ id: 1 }],
        },
      ];

      mockPrismaService.eventMap.findMany.mockResolvedValue(mockMaps);
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
        eventNoAutoCalc,
        timerData,
      );

      expect(mockPointsService.calculateMemberPoints).not.toHaveBeenCalled();
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
        points: [
          { id: 'point-1', memberId: 1, points: 100, member: { name: 'User 1' } },
        ],
        heroNpc: {
          id: heroId,
          npcName: 'Test Hero',
          event: {
            autoCalculatePoints: true,
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

      const result = await service.getKillDetail(
        guildId,
        eventId,
        heroId,
        killId,
      );

      expect(result.kill.id).toBe(killId);
      expect(result.kill.points).toHaveLength(1);
      expect(result.kill.windowDurationSeconds).toBe(3600);
      expect(result.eventConfig.autoCalculatePoints).toBe(true);
    });

    it('should throw NotFoundException when kill not found', async () => {
      mockPrismaService.eventHeroKill.findFirst.mockResolvedValue(null);

      await expect(
        service.getKillDetail(guildId, eventId, heroId, killId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
