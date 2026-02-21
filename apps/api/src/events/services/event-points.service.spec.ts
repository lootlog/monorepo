import { Test, type TestingModule } from '@nestjs/testing';
import { EventPointsService } from './event-points.service';
import { PrismaService } from 'src/db/prisma.service';
import { EventEmitterService } from './event-emitter.service';

describe('EventPointsService', () => {
  let service: EventPointsService;

  const mockPrismaService = {
    event: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    eventRanking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    eventKillPoint: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    eventMap: {
      findMany: jest.fn(),
    },
    eventMapAssignmentHistory: {
      findMany: jest.fn(),
    },
    eventPresenceLog: {
      findMany: jest.fn(),
    },
    eventPointsEditHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEventEmitter = {
    emitRankingUpdate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventPointsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitterService, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<EventPointsService>(EventPointsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateMemberPoints', () => {
    it('applies the highest matching base threshold', () => {
      const killTime = new Date('2026-01-15T05:00:00.000Z');
      const respawnStartTime = new Date('2026-01-15T03:00:00.000Z');

      const full = service.calculateMemberPoints({
        trackingDurationPercentage: 80,
        assignedMembersCount: 8,
        killTime,
        respawnStartTime,
      });
      expect(full.basePoints).toBe(1);

      const medium = service.calculateMemberPoints({
        trackingDurationPercentage: 60,
        assignedMembersCount: 8,
        killTime,
        respawnStartTime,
      });
      expect(medium.basePoints).toBe(0.5);

      const low = service.calculateMemberPoints({
        trackingDurationPercentage: 30,
        assignedMembersCount: 8,
        killTime,
        respawnStartTime,
      });
      expect(low.basePoints).toBe(0.25);

      const none = service.calculateMemberPoints({
        trackingDurationPercentage: 20,
        assignedMembersCount: 8,
        killTime,
        respawnStartTime,
      });
      expect(none.basePoints).toBe(0);
    });

    it('applies leave grace rule only for >=75% base tier', () => {
      const killTime = new Date('2026-01-15T05:00:00.000Z');
      const respawnStartTime = new Date('2026-01-15T03:00:00.000Z');

      const withinGrace = service.calculateMemberPoints({
        trackingDurationPercentage: 80,
        assignedMembersCount: 10,
        killTime,
        respawnStartTime,
        memberLeaveTime: new Date('2026-01-15T04:51:00.000Z'),
      });
      expect(withinGrace.basePoints).toBe(1);

      const afterGrace = service.calculateMemberPoints({
        trackingDurationPercentage: 80,
        assignedMembersCount: 10,
        killTime,
        respawnStartTime,
        memberLeaveTime: new Date('2026-01-15T04:49:00.000Z'),
      });
      expect(afterGrace.basePoints).toBe(0);

      const below75Tier = service.calculateMemberPoints({
        trackingDurationPercentage: 60,
        assignedMembersCount: 10,
        killTime,
        respawnStartTime,
        memberLeaveTime: new Date('2026-01-15T04:00:00.000Z'),
      });
      expect(below75Tier.basePoints).toBe(0.5);
    });

    it('adds group bonus for 1-4 assigned members', () => {
      const killTime = new Date('2026-01-15T05:00:00.000Z');
      const respawnStartTime = new Date('2026-01-15T03:00:00.000Z');

      const smallGroup = service.calculateMemberPoints({
        trackingDurationPercentage: 50,
        assignedMembersCount: 4,
        killTime,
        respawnStartTime,
      });
      expect(smallGroup.groupBonus).toBe(0.5);

      const largeGroup = service.calculateMemberPoints({
        trackingDurationPercentage: 50,
        assignedMembersCount: 5,
        killTime,
        respawnStartTime,
      });
      expect(largeGroup.groupBonus).toBe(0);
    });

    it('adds night bonus when at least 75% of respawn duration is in 03:00-08:00 Warsaw', () => {
      const inNight = service.calculateMemberPoints({
        trackingDurationPercentage: 50,
        assignedMembersCount: 8,
        killTime: new Date('2026-01-15T06:00:00.000Z'),
        respawnStartTime: new Date('2026-01-15T02:00:00.000Z'),
      });
      expect(inNight.nightBonus).toBe(0.5);

      const belowCoverage = service.calculateMemberPoints({
        trackingDurationPercentage: 50,
        assignedMembersCount: 8,
        killTime: new Date('2026-01-15T06:00:00.000Z'),
        respawnStartTime: new Date('2026-01-15T00:00:00.000Z'),
      });
      expect(belowCoverage.nightBonus).toBe(0);
    });

    it('adds pvp bonus when kill time is in 08:00-11:00 Warsaw', () => {
      const inPvp = service.calculateMemberPoints({
        trackingDurationPercentage: 50,
        assignedMembersCount: 8,
        killTime: new Date('2026-01-15T07:30:00.000Z'),
        respawnStartTime: new Date('2026-01-15T05:00:00.000Z'),
      });
      expect(inPvp.pvpBonus).toBe(0.5);

      const outsidePvp = service.calculateMemberPoints({
        trackingDurationPercentage: 50,
        assignedMembersCount: 8,
        killTime: new Date('2026-01-15T10:00:00.000Z'),
        respawnStartTime: new Date('2026-01-15T08:00:00.000Z'),
      });
      expect(outsidePvp.pvpBonus).toBe(0);
    });

    it('caps total points at 2.0', () => {
      const capped = service.calculateMemberPoints({
        trackingDurationPercentage: 90,
        assignedMembersCount: 2,
        killTime: new Date('2026-01-15T07:30:00.000Z'),
        respawnStartTime: new Date('2026-01-15T02:00:00.000Z'),
      });

      expect(capped.basePoints).toBe(1);
      expect(capped.groupBonus).toBe(0.5);
      expect(capped.nightBonus).toBe(0.5);
      expect(capped.pvpBonus).toBe(0.5);
      expect(capped.totalPoints).toBe(2);
    });
  });

  describe('recalculateEventPoints', () => {
    it('recalculates kill points with bonus breakdown and updates ranking', async () => {
      const eventId = 'event-1';
      const killId = 'kill-1';
      const killTime = new Date('2026-01-15T05:00:00.000Z');
      const minSpawn = new Date('2026-01-15T03:00:00.000Z');

      mockPrismaService.eventKillPoint.findMany.mockResolvedValueOnce([
        {
          id: 'kp-1',
          killId,
          memberId: 123,
          trackingDurationSeconds: 4032,
          timeOnMapSeconds: 900,
          afkPercentage: 0,
          kill: {
            id: killId,
            killedAt: killTime,
            minSpawnTimeAtKill: minSpawn,
            heroNpc: {
              id: 'hero-1',
              maps: [{ id: 'map-1' }],
            },
          },
        },
      ]);

      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([
        {
          mapId: 'map-1',
          memberId: 123,
          assignedAt: new Date('2026-01-15T03:52:48.000Z'),
          unassignedAt: null,
        },
      ]);

      const txMock = {
        eventKillPoint: {
          update: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([
            {
              memberId: 123,
              points: 1.5,
              trackingDurationSeconds: 4032,
              timeOnMapSeconds: 900,
              afkPercentage: 0,
              kill: {
                heroNpc: {
                  npcName: 'Test Hero',
                },
              },
            },
          ]),
        },
        eventRanking: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(txMock),
      );

      mockPrismaService.event.findUnique.mockResolvedValue({
        id: eventId,
        guildId: 'guild-1',
      });

      await service.recalculateEventPoints(eventId, 1);

      expect(txMock.eventKillPoint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'kp-1' },
          data: expect.objectContaining({
            basePoints: 0.5,
            groupBonusPoints: 0.5,
            nightBonusPoints: 0.5,
            pvpBonusPoints: 0,
            points: 1.5,
            trackingDurationSeconds: 4032,
            trackingDurationPercentage: 56,
            timeMultiplier: null,
            trackersMultiplier: null,
            mapsMultiplier: null,
            trackingDurationMultiplier: null,
          }),
        }),
      );

      expect(txMock.eventRanking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId,
            memberId: 123,
            heroNpcName: 'Test Hero',
            totalPoints: 1.5,
            totalKills: 1,
            totalTimeSeconds: 4032,
          }),
        }),
      );

      expect(mockEventEmitter.emitRankingUpdate).toHaveBeenCalledWith(
        'guild-1',
        eventId,
      );
    });

    it('clamps tracking duration to minSpawn->kill window during recalculation', async () => {
      const eventId = 'event-1';
      const killId = 'kill-2';
      const killTime = new Date('2026-01-15T05:00:00.000Z');
      const minSpawn = new Date('2026-01-15T03:00:00.000Z');

      mockPrismaService.eventKillPoint.findMany.mockResolvedValueOnce([
        {
          id: 'kp-2',
          killId,
          memberId: 123,
          trackingDurationSeconds: 9000,
          timeOnMapSeconds: 900,
          afkPercentage: 0,
          kill: {
            id: killId,
            killedAt: killTime,
            minSpawnTimeAtKill: minSpawn,
            heroNpc: {
              id: 'hero-1',
              maps: [{ id: 'map-1' }],
            },
          },
        },
      ]);

      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([
        {
          mapId: 'map-1',
          memberId: 123,
          assignedAt: new Date('2026-01-15T02:00:00.000Z'),
          unassignedAt: null,
        },
      ]);

      const txMock = {
        eventKillPoint: {
          update: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([
            {
              memberId: 123,
              points: 2,
              trackingDurationSeconds: 7200,
              timeOnMapSeconds: 900,
              afkPercentage: 0,
              kill: {
                heroNpc: {
                  npcName: 'Test Hero',
                },
              },
            },
          ]),
        },
        eventRanking: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(txMock),
      );

      mockPrismaService.event.findUnique.mockResolvedValue({
        id: eventId,
        guildId: 'guild-1',
      });

      await service.recalculateEventPoints(eventId, 1);

      expect(txMock.eventKillPoint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'kp-2' },
          data: expect.objectContaining({
            trackingDurationSeconds: 7200,
            trackingDurationPercentage: 100,
          }),
        }),
      );

      expect(txMock.eventRanking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalTimeSeconds: 7200,
          }),
        }),
      );
    });
  });
});
