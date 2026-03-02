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
    const getDefaultParams = () => ({
      scoringMode: 'ADVANCED' as const,
      eligible: true,
      trackingDurationPercentage: 50,
      trackingDurationSeconds: 3600,
      assignedMembersCount: 8,
      killTime: new Date('2026-01-15T05:00:00.000Z'),
      respawnStartTime: new Date('2026-01-15T03:00:00.000Z'),
      memberLeaveTime: null,
      memberPresentAtKill: true,
      timeOnMapSeconds: 900,
      afkPercentage: 0,
      wasPresent: true,
    });

    it('supports SIMPLE mode with 1 point for eligible member', () => {
      const eligible = service.calculateMemberPoints({
        ...getDefaultParams(),
        scoringMode: 'SIMPLE',
      });
      expect(eligible.totalPoints).toBe(1);
      expect(eligible.basePoints).toBe(1);

      const notEligible = service.calculateMemberPoints({
        ...getDefaultParams(),
        scoringMode: 'SIMPLE',
        eligible: false,
      });
      expect(notEligible.totalPoints).toBe(0);
    });

    it('applies advanced thresholds and leave-grace rule', () => {
      const full = service.calculateMemberPoints({
        ...getDefaultParams(),
        trackingDurationPercentage: 80,
        assignedMembersCount: 10,
        memberPresentAtKill: true,
      });
      expect(full.basePoints).toBe(1);

      const afterGrace = service.calculateMemberPoints({
        ...getDefaultParams(),
        trackingDurationPercentage: 80,
        assignedMembersCount: 10,
        memberPresentAtKill: false,
        memberLeaveTime: new Date('2026-01-15T04:49:00.000Z'),
      });
      expect(afterGrace.basePoints).toBe(0);
    });

    it('adds bonuses and applies hard cap', () => {
      const result = service.calculateMemberPoints({
        ...getDefaultParams(),
        trackingDurationPercentage: 90,
        assignedMembersCount: 2,
        killTime: new Date('2026-01-15T07:30:00.000Z'),
        respawnStartTime: new Date('2026-01-15T02:00:00.000Z'),
      });

      expect(result.basePoints).toBe(1);
      expect(result.bonusPoints).toBe(1.5);
      expect(result.totalPoints).toBe(2);
      expect(result.appliedBonuses).toHaveLength(3);
      expect(result.appliedBonuses.map((bonus) => bonus.ruleId)).toEqual(
        expect.arrayContaining(['bonus-small-group', 'bonus-night', 'bonus-pvp']),
      );
    });

    it('blocks all bonus actions when tracking is below configured threshold', () => {
      const result = service.calculateMemberPoints({
        ...getDefaultParams(),
        trackingDurationPercentage: 49,
        assignedMembersCount: 2,
        killTime: new Date('2026-01-15T07:30:00.000Z'),
        respawnStartTime: new Date('2026-01-15T02:00:00.000Z'),
      });

      expect(result.basePoints).toBe(0.25);
      expect(result.bonusPoints).toBe(0);
      expect(result.totalPoints).toBe(0.25);
      expect(result.appliedBonuses).toHaveLength(0);
    });

    it('allows bonuses below 50% when minTrackingPercentForBonuses is lowered', () => {
      const result = service.calculateMemberPoints({
        ...getDefaultParams(),
        scoringRules: {
          version: 1,
          timezone: 'Europe/Warsaw',
          hardCapPoints: 2,
          minTrackingPercentForBonuses: 30,
          rules: [
            {
              id: 'base-25',
              enabled: true,
              conditions: [
                {
                  type: 'NUMERIC',
                  factor: 'trackingDurationPercentage',
                  operator: '>=',
                  value: 25,
                },
              ],
              action: { type: 'SET_BASE', points: 0.25 },
            },
            {
              id: 'bonus-group',
              enabled: true,
              conditions: [
                {
                  type: 'NUMERIC',
                  factor: 'assignedMembersCount',
                  operator: '<=',
                  value: 4,
                },
              ],
              action: { type: 'ADD_BONUS', points: 0.5 },
            },
            {
              id: 'bonus-night',
              enabled: true,
              conditions: [
                {
                  type: 'RESPAWN_WINDOW_COVERAGE',
                  from: '03:00',
                  to: '08:00',
                  operator: '>=',
                  value: 75,
                },
              ],
              action: { type: 'ADD_BONUS', points: 0.5 },
            },
            {
              id: 'bonus-pvp',
              enabled: true,
              conditions: [
                {
                  type: 'KILL_TIME_IN_WINDOW',
                  from: '08:00',
                  to: '11:00',
                },
              ],
              action: { type: 'ADD_BONUS', points: 0.5 },
            },
          ],
        },
        trackingDurationPercentage: 40,
        assignedMembersCount: 2,
        killTime: new Date('2026-01-15T07:30:00.000Z'),
        respawnStartTime: new Date('2026-01-15T02:00:00.000Z'),
      });

      expect(result.basePoints).toBe(0.25);
      expect(result.bonusPoints).toBe(1.5);
      expect(result.totalPoints).toBe(1.75);
      expect(result.appliedBonuses).toHaveLength(3);
    });

    it('supports respawnProgressPercentage numeric conditions', () => {
      const scoringRules = {
        version: 1 as const,
        timezone: 'Europe/Warsaw',
        hardCapPoints: 10,
        minTrackingPercentForBonuses: 0,
        rules: [
          {
            id: 'base',
            enabled: true,
            conditions: [
              {
                type: 'NUMERIC' as const,
                factor: 'trackingDurationPercentage' as const,
                operator: '>=' as const,
                value: 0,
              },
            ],
            action: { type: 'SET_BASE' as const, points: 1 },
          },
          {
            id: 'bonus-progress',
            enabled: true,
            conditions: [
              {
                type: 'NUMERIC' as const,
                factor: 'respawnProgressPercentage' as const,
                operator: '>=' as const,
                value: 75,
              },
            ],
            action: {
              type: 'ADD_BONUS' as const,
              points: 1,
            },
          },
        ],
      };

      const withMaxRespawn = service.calculateMemberPoints({
        ...getDefaultParams(),
        scoringRules,
        trackingDurationPercentage: 100,
        killTime: new Date('2026-01-15T03:30:00.000Z'),
        respawnStartTime: new Date('2026-01-15T02:00:00.000Z'),
        maxRespawnTime: new Date('2026-01-15T04:00:00.000Z'),
      });

      expect(withMaxRespawn.bonusPoints).toBe(1);
      expect(withMaxRespawn.totalPoints).toBe(2);
      expect(withMaxRespawn.appliedBonuses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ruleId: 'bonus-progress',
            points: 1,
          }),
        ]),
      );

      const withoutMaxRespawn = service.calculateMemberPoints({
        ...getDefaultParams(),
        scoringRules,
        trackingDurationPercentage: 100,
        killTime: new Date('2026-01-15T03:30:00.000Z'),
        respawnStartTime: new Date('2026-01-15T02:00:00.000Z'),
        maxRespawnTime: null,
      });

      expect(withoutMaxRespawn.bonusPoints).toBe(0);
      expect(withoutMaxRespawn.totalPoints).toBe(1);
      expect(withoutMaxRespawn.appliedBonuses).toHaveLength(0);
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
        scoringMode: 'ADVANCED',
        scoringRules: null,
      });

      await service.recalculateEventPoints(eventId, 1);

      expect(txMock.eventKillPoint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'kp-1' },
          data: expect.objectContaining({
            basePoints: 0.5,
            points: 1.5,
            trackingDurationSeconds: 4032,
            trackingDurationPercentage: 56,
            bonusBreakdown: expect.arrayContaining([
              expect.objectContaining({
                ruleId: 'bonus-small-group',
                points: 0.5,
              }),
              expect.objectContaining({
                ruleId: 'bonus-night',
                points: 0.5,
              }),
            ]),
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
        scoringMode: 'ADVANCED',
        scoringRules: null,
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

  describe('updateKillPoint', () => {
    it('sets basePoints equal to manually edited points and clears bonus breakdown', async () => {
      mockPrismaService.eventKillPoint.findFirst.mockResolvedValue({
        id: 'kp-1',
        killId: 'kill-1',
        memberId: 123,
        points: 1.5,
        confirmationDeadlineAt: null,
        confirmedAt: null,
        kill: {
          heroNpc: {
            npcName: 'Test Hero',
          },
        },
      });
      mockPrismaService.eventKillPoint.update.mockResolvedValue({
        id: 'kp-1',
      });
      mockPrismaService.eventRanking.findFirst.mockResolvedValue({
        id: 'ranking-1',
        totalPoints: 10,
      });
      mockPrismaService.eventRanking.update.mockResolvedValue({});
      mockPrismaService.eventPointsEditHistory.create.mockResolvedValue({});

      await service.updateKillPoint(
        'guild-1',
        'event-1',
        'kill-1',
        'kp-1',
        2.5,
        'user-1',
      );

      expect(mockPrismaService.eventKillPoint.update).toHaveBeenCalledWith({
        where: { id: 'kp-1' },
        data: {
          points: 2.5,
          basePoints: 2.5,
          bonusBreakdown: [],
        },
      });
    });
  });
});
