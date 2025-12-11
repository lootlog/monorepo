import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventPointsService } from './event-points.service';
import { PrismaService } from 'src/db/prisma.service';
import type { Event } from 'generated/client';
import type {
  TimeOfDayMultiplier,
  TrackersMultipliers,
  MapsCountMultipliers,
} from '../interfaces/time-multiplier.interface';

describe('EventPointsService', () => {
  let service: EventPointsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    event: {
      findFirst: jest.fn(),
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
    eventPresenceLog: {
      findMany: jest.fn(),
    },
    eventPointsEditHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventPointsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EventPointsService>(EventPointsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // calculateMemberPoints - Main Points Calculation
  // ==========================================================================
  describe('calculateMemberPoints', () => {
    const createMockEvent = (
      basePoints: number,
      timeMultipliers: TimeOfDayMultiplier[] | null = null,
      trackersMultipliers: TrackersMultipliers | null = null,
      mapsCountMultipliers: MapsCountMultipliers | null = null,
    ): Event => {
      return {
        id: 'event-1',
        guildId: 'guild-1',
        name: 'Test Event',
        world: 'tempest',
        basePointsPerKill: basePoints,
        timeOfDayMultipliers: timeMultipliers as unknown as Event['timeOfDayMultipliers'],
        trackersMultipliers: trackersMultipliers as unknown as Event['trackersMultipliers'],
        mapsCountMultipliers: mapsCountMultipliers as unknown as Event['mapsCountMultipliers'],
        assignmentTimeoutMinutes: 5,
        autoCalculatePoints: true,
        mapAssignmentCap: null,
        startsAt: new Date(),
        endsAt: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    describe('with no multipliers configured', () => {
      it('should return base points when no multipliers are set', () => {
        const event = createMockEvent(100);
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(100);
        expect(result.appliedMultiplier).toBe(1.0);
      });

      it('should return base points when all multiplier configs are null', () => {
        const event = createMockEvent(50, null, null, null);
        const killTime = new Date('2024-01-15T14:30:00');

        const result = service.calculateMemberPoints(event, killTime, 3, 5);

        expect(result.points).toBe(50);
        expect(result.appliedMultiplier).toBe(1.0);
      });
    });

    describe('with time of day multipliers only', () => {
      it('should apply time multiplier within normal range', () => {
        const event = createMockEvent(100, [
          { from: '08:00', to: '20:00', multiplier: 1.5 },
        ]);
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(150);
        expect(result.appliedMultiplier).toBe(1.5);
      });

      it('should return 1.0 multiplier when time is outside all ranges', () => {
        const event = createMockEvent(100, [
          { from: '08:00', to: '12:00', multiplier: 2.0 },
        ]);
        const killTime = new Date('2024-01-15T14:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(100);
        expect(result.appliedMultiplier).toBe(1.0);
      });

      it('should handle overnight time range (22:00 to 06:00) - late night', () => {
        const event = createMockEvent(100, [
          { from: '22:00', to: '06:00', multiplier: 2.0 },
        ]);
        const killTime = new Date('2024-01-15T23:30:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(200);
        expect(result.appliedMultiplier).toBe(2.0);
      });

      it('should handle overnight time range (22:00 to 06:00) - early morning', () => {
        const event = createMockEvent(100, [
          { from: '22:00', to: '06:00', multiplier: 2.0 },
        ]);
        const killTime = new Date('2024-01-15T03:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(200);
        expect(result.appliedMultiplier).toBe(2.0);
      });

      it('should handle exact boundary start time (inclusive)', () => {
        const event = createMockEvent(100, [
          { from: '10:00', to: '14:00', multiplier: 1.5 },
        ]);
        const killTime = new Date('2024-01-15T10:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(150);
        expect(result.appliedMultiplier).toBe(1.5);
      });

      it('should handle exact boundary end time (exclusive)', () => {
        const event = createMockEvent(100, [
          { from: '10:00', to: '14:00', multiplier: 1.5 },
        ]);
        const killTime = new Date('2024-01-15T14:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(100);
        expect(result.appliedMultiplier).toBe(1.0);
      });

      it('should use first matching range when multiple ranges exist', () => {
        const event = createMockEvent(100, [
          { from: '08:00', to: '12:00', multiplier: 1.5 },
          { from: '10:00', to: '14:00', multiplier: 2.0 },
        ]);
        const killTime = new Date('2024-01-15T11:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(150);
        expect(result.appliedMultiplier).toBe(1.5);
      });

      it('should handle empty multipliers array', () => {
        const event = createMockEvent(100, []);
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(100);
        expect(result.appliedMultiplier).toBe(1.0);
      });

      it('should handle midnight edge case in overnight range', () => {
        const event = createMockEvent(100, [
          { from: '22:00', to: '06:00', multiplier: 3.0 },
        ]);
        const killTime = new Date('2024-01-15T00:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(300);
        expect(result.appliedMultiplier).toBe(3.0);
      });
    });

    describe('with trackers multipliers only', () => {
      it('should apply trackers multiplier for exact key match', () => {
        const event = createMockEvent(100, null, {
          '1': 1.0,
          '3': 1.5,
          '5': 2.0,
        });
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 3);

        expect(result.points).toBe(150);
        expect(result.appliedMultiplier).toBe(1.5);
      });

      it('should use highest key <= assignedCount when between keys', () => {
        const event = createMockEvent(100, null, {
          '1': 1.0,
          '3': 1.5,
          '5': 2.0,
        });
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 4);

        expect(result.points).toBe(150);
        expect(result.appliedMultiplier).toBe(1.5);
      });

      it('should use highest multiplier when assignedCount exceeds all keys', () => {
        const event = createMockEvent(100, null, {
          '1': 1.0,
          '3': 1.5,
          '5': 2.0,
        });
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 10);

        expect(result.points).toBe(200);
        expect(result.appliedMultiplier).toBe(2.0);
      });

      it('should use lowest key multiplier when assignedCount < all keys', () => {
        const event = createMockEvent(100, null, {
          '3': 1.5,
          '5': 2.0,
        });
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(150);
        expect(result.appliedMultiplier).toBe(1.5);
      });

      it('should return 1.0 when assignedCount is 0', () => {
        const event = createMockEvent(100, null, {
          '1': 1.5,
          '3': 2.0,
        });
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 0);

        expect(result.points).toBe(100);
        expect(result.appliedMultiplier).toBe(1.0);
      });

      it('should handle single key in multipliers', () => {
        const event = createMockEvent(100, null, {
          '2': 1.75,
        });
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 5);

        expect(result.points).toBe(175);
        expect(result.appliedMultiplier).toBe(1.75);
      });
    });

    describe('with maps count multipliers only', () => {
      it('should apply maps multiplier for exact key match', () => {
        const event = createMockEvent(100, null, null, {
          '1': 1.0,
          '3': 1.5,
          '5': 2.0,
        });
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 3, 1);

        expect(result.points).toBe(150);
        expect(result.appliedMultiplier).toBe(1.5);
      });

      it('should use highest key <= mapCount when between keys', () => {
        const event = createMockEvent(100, null, null, {
          '1': 1.0,
          '3': 1.5,
          '5': 2.0,
        });
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 4, 1);

        expect(result.points).toBe(150);
        expect(result.appliedMultiplier).toBe(1.5);
      });

      it('should return 1.0 when mapCount < all keys (different from trackers!)', () => {
        const event = createMockEvent(100, null, null, {
          '3': 1.5,
          '5': 2.0,
        });
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(100);
        expect(result.appliedMultiplier).toBe(1.0);
      });

      it('should return 1.0 when mapCount is 0', () => {
        const event = createMockEvent(100, null, null, {
          '1': 1.5,
          '3': 2.0,
        });
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 0, 1);

        expect(result.points).toBe(100);
        expect(result.appliedMultiplier).toBe(1.0);
      });

      it('should use highest multiplier when mapCount exceeds all keys', () => {
        const event = createMockEvent(100, null, null, {
          '1': 1.0,
          '3': 1.5,
          '5': 2.0,
        });
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 8, 1);

        expect(result.points).toBe(200);
        expect(result.appliedMultiplier).toBe(2.0);
      });
    });

    describe('with combined multipliers', () => {
      it('should multiply all three multipliers together', () => {
        const event = createMockEvent(
          100,
          [{ from: '08:00', to: '20:00', multiplier: 1.5 }],
          { '3': 2.0 },
          { '2': 1.2 },
        );
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 2, 3);

        expect(result.appliedMultiplier).toBe(1.5 * 2.0 * 1.2);
        expect(result.points).toBe(Math.round(100 * 1.5 * 2.0 * 1.2));
      });

      it('should handle fractional points with rounding', () => {
        const event = createMockEvent(
          100,
          [{ from: '00:00', to: '23:59', multiplier: 1.33 }],
          { '1': 1.27 },
          { '1': 1.11 },
        );
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        const expectedMultiplier = 1.33 * 1.27 * 1.11;
        expect(result.appliedMultiplier).toBeCloseTo(expectedMultiplier, 10);
        expect(result.points).toBe(Math.round(100 * expectedMultiplier));
      });

      it('should handle mix of active and inactive multipliers', () => {
        const event = createMockEvent(
          100,
          [{ from: '08:00', to: '10:00', multiplier: 2.0 }],
          { '5': 1.5 },
          { '1': 1.3 },
        );
        const killTime = new Date('2024-01-15T14:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 2);

        expect(result.appliedMultiplier).toBe(1.0 * 1.5 * 1.3);
        expect(result.points).toBe(Math.round(100 * 1.0 * 1.5 * 1.3));
      });
    });

    describe('edge cases', () => {
      it('should handle basePointsPerKill of 0', () => {
        const event = createMockEvent(
          0,
          [{ from: '00:00', to: '23:59', multiplier: 2.0 }],
        );
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(0);
        expect(result.appliedMultiplier).toBe(2.0);
      });

      it('should handle very large basePointsPerKill', () => {
        const event = createMockEvent(1000000);
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(1000000);
        expect(result.appliedMultiplier).toBe(1.0);
      });

      it('should handle very small multipliers', () => {
        const event = createMockEvent(
          100,
          [{ from: '00:00', to: '23:59', multiplier: 0.1 }],
        );
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(10);
        expect(result.appliedMultiplier).toBe(0.1);
      });

      it('should handle time with single digit hour correctly', () => {
        const event = createMockEvent(100, [
          { from: '06:00', to: '09:00', multiplier: 1.5 },
        ]);
        const killTime = new Date('2024-01-15T07:30:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 1);

        expect(result.points).toBe(150);
        expect(result.appliedMultiplier).toBe(1.5);
      });

      it('should handle NaN keys in multipliers gracefully', () => {
        const event = createMockEvent(100, null, {
          'invalid': 2.0,
          '3': 1.5,
        } as TrackersMultipliers);
        const killTime = new Date('2024-01-15T12:00:00');

        const result = service.calculateMemberPoints(event, killTime, 1, 3);

        expect(result.points).toBe(150);
        expect(result.appliedMultiplier).toBe(1.5);
      });
    });
  });

  // ==========================================================================
  // getRanking - Event Rankings
  // ==========================================================================
  describe('getRanking', () => {
    it('should return rankings ordered by totalPoints descending', async () => {
      const mockEvent = { id: 'event-1', guildId: 'guild-1' };
      const mockRankings = [
        { id: 'r1', totalPoints: 100, member: { name: 'Player1' } },
        { id: 'r2', totalPoints: 50, member: { name: 'Player2' } },
      ];

      mockPrismaService.event.findFirst.mockResolvedValue(mockEvent);
      mockPrismaService.eventRanking.findMany.mockResolvedValue(mockRankings);

      const result = await service.getRanking('guild-1', 'event-1');

      expect(mockPrismaService.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'event-1', guildId: 'guild-1' },
      });
      expect(mockPrismaService.eventRanking.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' },
        include: { member: true },
        orderBy: { totalPoints: 'desc' },
      });
      expect(result).toEqual(mockRankings);
    });

    it('should throw NotFoundException when event does not exist', async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(service.getRanking('guild-1', 'event-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when event belongs to different guild', async () => {
      mockPrismaService.event.findFirst.mockResolvedValue(null);

      await expect(service.getRanking('guild-2', 'event-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'event-1', guildId: 'guild-2' },
      });
    });
  });

  // ==========================================================================
  // getMemberPresenceStats - Presence Statistics
  // ==========================================================================
  describe('getMemberPresenceStats', () => {
    it('should return zero stats when no maps found', async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);

      const result = await service.getMemberPresenceStats('hero-1', 1);

      expect(result).toEqual({
        timeOnMapSeconds: 0,
        afkPercentage: 0,
        wasPresent: false,
        mapName: '',
      });
    });

    it('should return zero stats when no presence logs found', async () => {
      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Desert Map' },
      ]);
      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue([]);

      const result = await service.getMemberPresenceStats('hero-1', 1);

      expect(result).toEqual({
        timeOnMapSeconds: 0,
        afkPercentage: 0,
        wasPresent: false,
        mapName: 'Desert Map',
      });
    });

    it('should calculate total time and AFK percentage correctly', async () => {
      const now = new Date('2024-01-15T12:00:00');
      jest.useFakeTimers().setSystemTime(now);

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Desert Map' },
      ]);
      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue([
        {
          mapId: 'map-1',
          startedAt: new Date('2024-01-15T10:00:00'),
          endedAt: new Date('2024-01-15T11:00:00'),
          isAfk: false,
        },
        {
          mapId: 'map-1',
          startedAt: new Date('2024-01-15T11:00:00'),
          endedAt: new Date('2024-01-15T11:30:00'),
          isAfk: true,
        },
      ]);

      const result = await service.getMemberPresenceStats('hero-1', 1);

      expect(result.timeOnMapSeconds).toBe(5400);
      expect(result.afkPercentage).toBeCloseTo(33.33, 1);
      expect(result.wasPresent).toBe(true);
      expect(result.mapName).toBe('Desert Map');

      jest.useRealTimers();
    });

    it('should handle ongoing presence (no endedAt)', async () => {
      const now = new Date('2024-01-15T12:00:00');
      jest.useFakeTimers().setSystemTime(now);

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Forest Map' },
      ]);
      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue([
        {
          mapId: 'map-1',
          startedAt: new Date('2024-01-15T11:00:00'),
          endedAt: null,
          isAfk: false,
        },
      ]);

      const result = await service.getMemberPresenceStats('hero-1', 1);

      expect(result.timeOnMapSeconds).toBe(3600);
      expect(result.afkPercentage).toBe(0);
      expect(result.wasPresent).toBe(true);

      jest.useRealTimers();
    });

    it('should filter by since date when provided', async () => {
      const since = new Date('2024-01-15T10:00:00');

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'Cave Map' },
      ]);
      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue([]);

      await service.getMemberPresenceStats('hero-1', 1, since);

      expect(mockPrismaService.eventPresenceLog.findMany).toHaveBeenCalledWith({
        where: {
          mapId: { in: ['map-1'] },
          memberId: 1,
          startedAt: { gte: since },
        },
        orderBy: { startedAt: 'asc' },
      });
    });

    it('should handle multiple maps and return last map name', async () => {
      const now = new Date('2024-01-15T12:00:00');
      jest.useFakeTimers().setSystemTime(now);

      mockPrismaService.eventMap.findMany.mockResolvedValue([
        { id: 'map-1', mapName: 'First Map' },
        { id: 'map-2', mapName: 'Second Map' },
      ]);
      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue([
        {
          mapId: 'map-1',
          startedAt: new Date('2024-01-15T10:00:00'),
          endedAt: new Date('2024-01-15T11:00:00'),
          isAfk: false,
        },
        {
          mapId: 'map-2',
          startedAt: new Date('2024-01-15T11:00:00'),
          endedAt: new Date('2024-01-15T12:00:00'),
          isAfk: false,
        },
      ]);

      const result = await service.getMemberPresenceStats('hero-1', 1);

      expect(result.mapName).toBe('Second Map');
      expect(result.timeOnMapSeconds).toBe(7200);

      jest.useRealTimers();
    });
  });

  // ==========================================================================
  // updateRankingAfterKill - Ranking Updates
  // ==========================================================================
  describe('updateRankingAfterKill', () => {
    it('should create new ranking when none exists', async () => {
      mockPrismaService.eventRanking.findUnique.mockResolvedValue(null);
      mockPrismaService.eventRanking.create.mockResolvedValue({
        id: 'ranking-1',
      });

      const killPoints = [
        {
          id: 'kp-1',
          memberId: 1,
          points: 100,
          timeOnMapSeconds: 3600,
          afkPercentage: 10,
        },
      ];

      await service.updateRankingAfterKill('event-1', 'Dragon', killPoints as any);

      expect(mockPrismaService.eventRanking.create).toHaveBeenCalledWith({
        data: {
          eventId: 'event-1',
          memberId: 1,
          heroNpcName: 'Dragon',
          totalPoints: 100,
          totalKills: 1,
          totalTimeSeconds: 3600,
          avgAfkPercentage: 10,
        },
      });
    });

    it('should update existing ranking with incremented values', async () => {
      const existingRanking = {
        id: 'ranking-1',
        totalKills: 5,
        avgAfkPercentage: 20,
      };
      mockPrismaService.eventRanking.findUnique.mockResolvedValue(existingRanking);
      mockPrismaService.eventRanking.update.mockResolvedValue({});

      const killPoints = [
        {
          id: 'kp-1',
          memberId: 1,
          points: 100,
          timeOnMapSeconds: 3600,
          afkPercentage: 10,
        },
      ];

      await service.updateRankingAfterKill('event-1', 'Dragon', killPoints as any);

      expect(mockPrismaService.eventRanking.update).toHaveBeenCalledWith({
        where: {
          eventId_memberId_heroNpcName: {
            eventId: 'event-1',
            memberId: 1,
            heroNpcName: 'Dragon',
          },
        },
        data: {
          totalPoints: { increment: 100 },
          totalKills: { increment: 1 },
          totalTimeSeconds: { increment: 3600 },
          avgAfkPercentage: 18.33,
        },
      });
    });

    it('should handle multiple kill points from different members', async () => {
      mockPrismaService.eventRanking.findUnique.mockResolvedValue(null);
      mockPrismaService.eventRanking.create.mockResolvedValue({});

      const killPoints = [
        {
          id: 'kp-1',
          memberId: 1,
          points: 100,
          timeOnMapSeconds: 3600,
          afkPercentage: 10,
        },
        {
          id: 'kp-2',
          memberId: 2,
          points: 150,
          timeOnMapSeconds: 1800,
          afkPercentage: 5,
        },
      ];

      await service.updateRankingAfterKill('event-1', 'Dragon', killPoints as any);

      expect(mockPrismaService.eventRanking.create).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // updateKillPoint - Manual Points Editing
  // ==========================================================================
  describe('updateKillPoint', () => {
    it('should throw NotFoundException when kill point not found', async () => {
      mockPrismaService.eventKillPoint.findFirst.mockResolvedValue(null);

      await expect(
        service.updateKillPoint('guild-1', 'event-1', 'kill-1', 'kp-1', 200, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update kill point and create edit history', async () => {
      const existingKillPoint = {
        id: 'kp-1',
        killId: 'kill-1',
        memberId: 1,
        points: 100,
        appliedMultiplier: 1.5,
        kill: { heroNpc: { npcName: 'Dragon' } },
      };
      const existingRanking = {
        id: 'ranking-1',
        totalPoints: 500,
      };

      mockPrismaService.eventKillPoint.findFirst.mockResolvedValue(existingKillPoint);
      mockPrismaService.eventKillPoint.update.mockResolvedValue({
        ...existingKillPoint,
        points: 200,
      });
      mockPrismaService.eventRanking.findFirst.mockResolvedValue(existingRanking);
      mockPrismaService.eventRanking.update.mockResolvedValue({});
      mockPrismaService.eventPointsEditHistory.create.mockResolvedValue({});

      await service.updateKillPoint(
        'guild-1',
        'event-1',
        'kill-1',
        'kp-1',
        200,
        'user-1',
      );

      expect(mockPrismaService.eventKillPoint.update).toHaveBeenCalledWith({
        where: { id: 'kp-1' },
        data: {
          points: 200,
          basePoints: Math.round(200 / 1.5),
        },
      });

      expect(mockPrismaService.eventRanking.update).toHaveBeenCalledWith({
        where: { id: 'ranking-1' },
        data: {
          totalPoints: { increment: 100 },
          pointsModified: true,
        },
      });

      expect(mockPrismaService.eventPointsEditHistory.create).toHaveBeenCalledWith({
        data: {
          rankingId: 'ranking-1',
          previousPoints: 500,
          newPoints: 600,
          editType: 'KILL_POINT',
          editedByUserId: 'user-1',
        },
      });
    });

    it('should not create edit history when points unchanged', async () => {
      const existingKillPoint = {
        id: 'kp-1',
        killId: 'kill-1',
        memberId: 1,
        points: 100,
        appliedMultiplier: 1.5,
        kill: { heroNpc: { npcName: 'Dragon' } },
      };

      mockPrismaService.eventKillPoint.findFirst.mockResolvedValue(existingKillPoint);
      mockPrismaService.eventKillPoint.update.mockResolvedValue({
        ...existingKillPoint,
      });

      await service.updateKillPoint(
        'guild-1',
        'event-1',
        'kill-1',
        'kp-1',
        100,
        'user-1',
      );

      expect(mockPrismaService.eventPointsEditHistory.create).not.toHaveBeenCalled();
    });

    it('should handle zero multiplier by using newPoints as basePoints', async () => {
      const existingKillPoint = {
        id: 'kp-1',
        killId: 'kill-1',
        memberId: 1,
        points: 100,
        appliedMultiplier: 0,
        kill: { heroNpc: { npcName: 'Dragon' } },
      };

      mockPrismaService.eventKillPoint.findFirst.mockResolvedValue(existingKillPoint);
      mockPrismaService.eventKillPoint.update.mockResolvedValue({});
      mockPrismaService.eventRanking.findFirst.mockResolvedValue(null);

      await service.updateKillPoint(
        'guild-1',
        'event-1',
        'kill-1',
        'kp-1',
        200,
        'user-1',
      );

      expect(mockPrismaService.eventKillPoint.update).toHaveBeenCalledWith({
        where: { id: 'kp-1' },
        data: {
          points: 200,
          basePoints: 200,
        },
      });
    });
  });

  // ==========================================================================
  // updateRankingPoints - Direct Ranking Edit
  // ==========================================================================
  describe('updateRankingPoints', () => {
    it('should throw NotFoundException when ranking not found', async () => {
      mockPrismaService.eventRanking.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRankingPoints('guild-1', 'event-1', 'ranking-1', 1000, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update ranking and create edit history', async () => {
      const existingRanking = {
        id: 'ranking-1',
        totalPoints: 500,
      };

      mockPrismaService.eventRanking.findFirst.mockResolvedValue(existingRanking);
      mockPrismaService.eventPointsEditHistory.create.mockResolvedValue({});
      mockPrismaService.eventRanking.update.mockResolvedValue({
        ...existingRanking,
        totalPoints: 1000,
      });

      const result = await service.updateRankingPoints(
        'guild-1',
        'event-1',
        'ranking-1',
        1000,
        'user-1',
      );

      expect(mockPrismaService.eventPointsEditHistory.create).toHaveBeenCalledWith({
        data: {
          rankingId: 'ranking-1',
          previousPoints: 500,
          newPoints: 1000,
          editType: 'RANKING',
          editedByUserId: 'user-1',
        },
      });

      expect(mockPrismaService.eventRanking.update).toHaveBeenCalledWith({
        where: { id: 'ranking-1' },
        data: { totalPoints: 1000, pointsModified: true },
      });
    });
  });

  // ==========================================================================
  // getRankingEditHistory
  // ==========================================================================
  describe('getRankingEditHistory', () => {
    it('should throw NotFoundException when ranking not found', async () => {
      mockPrismaService.eventRanking.findFirst.mockResolvedValue(null);

      await expect(
        service.getRankingEditHistory('guild-1', 'event-1', 'ranking-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return edit history ordered by editedAt descending', async () => {
      mockPrismaService.eventRanking.findFirst.mockResolvedValue({
        id: 'ranking-1',
      });
      const mockHistory = [
        { id: 'h1', editedAt: new Date('2024-01-15') },
        { id: 'h2', editedAt: new Date('2024-01-14') },
      ];
      mockPrismaService.eventPointsEditHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getRankingEditHistory(
        'guild-1',
        'event-1',
        'ranking-1',
      );

      expect(mockPrismaService.eventPointsEditHistory.findMany).toHaveBeenCalledWith({
        where: { rankingId: 'ranking-1' },
        orderBy: { editedAt: 'desc' },
      });
      expect(result).toEqual(mockHistory);
    });
  });

  // ==========================================================================
  // recalculateEventPoints
  // ==========================================================================
  describe('recalculateEventPoints', () => {
    it('should do nothing when no kill points exist', async () => {
      mockPrismaService.eventKillPoint.findMany.mockResolvedValue([]);

      await service.recalculateEventPoints('event-1', 200);

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should recalculate all points and rebuild rankings', async () => {
      const killPoints = [
        {
          id: 'kp-1',
          memberId: 1,
          appliedMultiplier: 1.5,
          timeOnMapSeconds: 3600,
          afkPercentage: 10,
          kill: { heroNpc: { npcName: 'Dragon', eventId: 'event-1' } },
        },
      ];

      mockPrismaService.eventKillPoint.findMany.mockResolvedValue(killPoints);

      const mockTx = {
        eventKillPoint: {
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([
            {
              ...killPoints[0],
              points: 300,
            },
          ]),
        },
        eventRanking: {
          deleteMany: jest.fn(),
          create: jest.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockTx),
      );

      await service.recalculateEventPoints('event-1', 200);

      expect(mockTx.eventKillPoint.update).toHaveBeenCalledWith({
        where: { id: 'kp-1' },
        data: {
          basePoints: 200,
          points: Math.round(200 * 1.5),
        },
      });

      expect(mockTx.eventRanking.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' },
      });

      expect(mockTx.eventRanking.create).toHaveBeenCalled();
    });
  });
});
