import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BattleAnalyticsService } from './battle-analytics.service';
import { PrismaService } from 'src/shared/modules/prisma/prisma.service';
import { RedisService } from 'src/shared/modules/redis/redis.service';

describe('BattleAnalyticsService', () => {
  let service: BattleAnalyticsService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUserId = 'user-123';
  const mockCharacterId = 'char-123';
  const mockWorld = 'world1';

  const mockUserCharacter = {
    id: 'uc-1',
    userId: mockUserId,
    characterId: mockCharacterId,
    world: mockWorld,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWarrior1 = {
    id: 'w-1',
    battleId: 'b-1',
    originalId: mockCharacterId,
    name: 'TestPlayer',
    icon: 'icon1',
    prof: 'warrior',
    lvl: 100,
    team: 1,
    ph: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWarrior2 = {
    id: 'w-2',
    battleId: 'b-1',
    originalId: 'opponent-1',
    name: 'Opponent1',
    icon: 'icon2',
    prof: 'mage',
    lvl: 95,
    team: 2,
    ph: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBattle = {
    id: 'b-1',
    userId: mockUserId,
    accountId: 'acc-1',
    characterId: mockCharacterId,
    world: mockWorld,
    type: '1v1',
    winner: 'TestPlayer',
    loser: 'Opponent1',
    winningTeam: 1,
    losingTeam: 2,
    hasFlee: false,
    duration: 1000,
    matchmaking: true,
    rating: 1500,
    opponentRating: 1450,
    ratingDelta: 25,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    warriors: [mockWarrior1, mockWarrior2],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      userCharacter: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      battle: {
        findMany: jest.fn(),
      },
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      getClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattleAnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<BattleAnalyticsService>(BattleAnalyticsService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBattleAnalytics', () => {
    it('should return cached result if available', async () => {
      const cachedData = JSON.stringify({
        totalBattles: 10,
        wins: 6,
        losses: 4,
        winRatio: 60,
        totalPH: 500,
      });

      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getBattleAnalytics({}, mockUserId);

      expect(result).toEqual(JSON.parse(cachedData));
      expect(prismaService.userCharacter.findMany).not.toHaveBeenCalled();
      expect(prismaService.battle.findMany).not.toHaveBeenCalled();
    });

    it('should return analytics for all characters when no characterId provided', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([
        mockUserCharacter,
      ]);
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getBattleAnalytics({}, mockUserId);

      expect(result).toEqual({
        totalBattles: 1,
        wins: 1,
        losses: 0,
        winRatio: 100,
        totalPH: 50,
      });
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should return analytics for specific character when characterId provided', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getBattleAnalytics(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual({
        totalBattles: 1,
        wins: 1,
        losses: 0,
        winRatio: 100,
        totalPH: 50,
      });
      expect(prismaService.userCharacter.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          characterId: mockCharacterId,
        },
      });
    });

    it('should throw NotFoundException when character not found for user', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(null);

      await expect(
        service.getBattleAnalytics(
          { characterId: mockCharacterId },
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return zero stats when no characters found', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([]);

      const result = await service.getBattleAnalytics({}, mockUserId);

      expect(result).toEqual({
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRatio: 0,
        totalPH: 0,
      });
    });

    it('should count losses correctly', async () => {
      const lossBattle = {
        ...mockBattle,
        id: 'b-2',
        winningTeam: 2,
        losingTeam: 1,
        warriors: [{ ...mockWarrior1, team: 1 }, mockWarrior2],
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([
        mockUserCharacter,
      ]);
      prismaService.battle.findMany.mockResolvedValue([lossBattle]);

      const result = await service.getBattleAnalytics({}, mockUserId);

      expect(result).toEqual({
        totalBattles: 1,
        wins: 0,
        losses: 1,
        winRatio: 0,
        totalPH: 50,
      });
    });

    it('should exclude battles with flee', async () => {
      const fleeBattle = {
        ...mockBattle,
        hasFlee: true,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([
        mockUserCharacter,
      ]);
      prismaService.battle.findMany.mockResolvedValue([fleeBattle]);

      const result = await service.getBattleAnalytics({}, mockUserId);

      expect(result).toEqual({
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRatio: 0,
        totalPH: 50,
      });
    });

    it('should filter battles by world', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([
        mockUserCharacter,
      ]);
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      await service.getBattleAnalytics({ world: mockWorld }, mockUserId);

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            world: mockWorld,
          }),
        }),
      );
    });

    it('should filter battles by opponent level range', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([
        mockUserCharacter,
      ]);
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getBattleAnalytics(
        { minLevel: 90, maxLevel: 100 },
        mockUserId,
      );

      expect(result.totalBattles).toBe(1);
    });

    it('should exclude battles outside opponent level range', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([
        mockUserCharacter,
      ]);
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getBattleAnalytics(
        { minLevel: 100, maxLevel: 110 },
        mockUserId,
      );

      expect(result.totalBattles).toBe(0);
    });

    it('should filter by PH battles', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([
        mockUserCharacter,
      ]);
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      await service.getBattleAnalytics({ ph: true }, mockUserId);

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warriors: expect.objectContaining({
              some: expect.objectContaining({
                ph: { gt: 0 },
              }),
            }),
          }),
        }),
      );
    });

    it('should filter by matchmaking', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([
        mockUserCharacter,
      ]);
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      await service.getBattleAnalytics({ matchmaking: true }, mockUserId);

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matchmaking: true,
          }),
        }),
      );
    });

    it('should calculate win ratio correctly with multiple battles', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        winningTeam: 2,
        losingTeam: 1,
        warriors: [{ ...mockWarrior1, team: 1 }, mockWarrior2],
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([
        mockUserCharacter,
      ]);
      prismaService.battle.findMany.mockResolvedValue([mockBattle, battle2]);

      const result = await service.getBattleAnalytics({}, mockUserId);

      expect(result).toEqual({
        totalBattles: 2,
        wins: 1,
        losses: 1,
        winRatio: 50,
        totalPH: 100,
      });
    });
  });

  describe('calculateProfessionWinRate', () => {
    it('should return cached result if available', async () => {
      const cachedData = JSON.stringify([
        { prof: 'mage', wins: 5, losses: 3, totalBattles: 8, winRate: 62.5 },
      ]);

      redisService.get.mockResolvedValue(cachedData);

      const result = await service.calculateProfessionWinRate({}, mockUserId);

      expect(result).toEqual(JSON.parse(cachedData));
      expect(prismaService.battle.findMany).not.toHaveBeenCalled();
    });

    it('should calculate profession win rates correctly', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.calculateProfessionWinRate(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual([
        {
          prof: 'mage',
          wins: 1,
          losses: 0,
          totalBattles: 1,
          winRate: 100,
        },
      ]);
    });

    it('should return empty array when no characters found', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([]);

      const result = await service.calculateProfessionWinRate({}, mockUserId);

      expect(result).toEqual([]);
    });

    it('should aggregate multiple battles against same profession', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        winningTeam: 2,
        losingTeam: 1,
        warriors: [
          { ...mockWarrior1, team: 1 },
          { ...mockWarrior2, id: 'w-3', originalId: 'opponent-2' },
        ],
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle, battle2]);

      const result = await service.calculateProfessionWinRate(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual([
        {
          prof: 'mage',
          wins: 1,
          losses: 1,
          totalBattles: 2,
          winRate: 50,
        },
      ]);
    });

    it('should sort results by total battles descending', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        warriors: [
          mockWarrior1,
          { ...mockWarrior2, prof: 'hunter', originalId: 'opponent-2' },
        ],
      };
      const battle3 = {
        ...mockBattle,
        id: 'b-3',
        warriors: [
          mockWarrior1,
          { ...mockWarrior2, prof: 'hunter', originalId: 'opponent-3' },
        ],
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([
        mockBattle,
        battle2,
        battle3,
      ]);

      const result = await service.calculateProfessionWinRate(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result[0].prof).toBe('hunter');
      expect(result[0].totalBattles).toBe(2);
      expect(result[1].prof).toBe('mage');
      expect(result[1].totalBattles).toBe(1);
    });

    it('should query with hasFlee false', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      await service.calculateProfessionWinRate(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hasFlee: false,
          }),
        }),
      );
    });
  });

  describe('getHeadToHead', () => {
    it('should return empty result when no characters found', async () => {
      prismaService.userCharacter.findMany.mockResolvedValue([]);

      const result = await service.getHeadToHead({}, mockUserId);

      expect(result.records).toEqual([]);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should calculate head to head statistics', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getHeadToHead(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.records).toHaveLength(1);
      expect(result.records[0]).toMatchObject({
        opponentId: 'opponent-1',
        opponentName: 'Opponent1',
        wins: 1,
        losses: 0,
        totalBattles: 1,
        winRate: 100,
      });
    });

    it('should calculate avgRatingDelta excluding battles with ratingDelta = 0', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        ratingDelta: 0,
      };
      const battle3 = {
        ...mockBattle,
        id: 'b-3',
        ratingDelta: 30,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([
        mockBattle,
        battle2,
        battle3,
      ]);

      const result = await service.getHeadToHead(
        { characterId: mockCharacterId, matchmaking: true },
        mockUserId,
      );

      expect(result.records[0].totalRatingDelta).toBe(55);
      expect(result.records[0].avgRatingDelta).toBe(27.5);
    });

    it('should set avgRatingDelta to 0 when all battles have ratingDelta = 0', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        ratingDelta: 0,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([battle2]);

      const result = await service.getHeadToHead(
        { characterId: mockCharacterId, matchmaking: true },
        mockUserId,
      );

      expect(result.records[0].totalRatingDelta).toBe(0);
      expect(result.records[0].avgRatingDelta).toBe(0);
    });

    it('should filter by search query', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getHeadToHead(
        { characterId: mockCharacterId, search: 'opponent' },
        mockUserId,
      );

      expect(result.records).toHaveLength(1);
    });

    it('should filter by minBattles', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getHeadToHead(
        { characterId: mockCharacterId, minBattles: 2 },
        mockUserId,
      );

      expect(result.records).toHaveLength(0);
    });

    it('should sort by specified field', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        warriors: [
          mockWarrior1,
          { ...mockWarrior2, originalId: 'opponent-2', name: 'Opponent2' },
        ],
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle, battle2]);

      const result = await service.getHeadToHead(
        { characterId: mockCharacterId, sortBy: 'wins', sortOrder: 'asc' },
        mockUserId,
      );

      expect(result.records).toHaveLength(2);
    });

    it('should handle pagination with cursor', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const cursor = Buffer.from('1').toString('base64');
      const result = await service.getHeadToHead(
        { characterId: mockCharacterId, cursor, size: 1 },
        mockUserId,
      );

      expect(result.pagination.hasPrev).toBe(true);
    });

    it('should include total count when requested', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getHeadToHead(
        { characterId: mockCharacterId, includeTotal: true },
        mockUserId,
      );

      expect(result.pagination.total).toBeDefined();
      expect(result.meta.performance.totalItems).toBeDefined();
    });
  });

  describe('getCurrentStreak', () => {
    it('should return cached result if available', async () => {
      const cachedData = JSON.stringify({
        current: { type: 'wins', count: 5 },
        longest: { wins: 10, losses: 3 },
      });

      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getCurrentStreak({}, mockUserId);

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it('should return default streak when no characters found', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([]);

      const result = await service.getCurrentStreak({}, mockUserId);

      expect(result).toEqual({
        current: { type: 'none', count: 0 },
        longest: { wins: 0, losses: 0 },
      });
    });

    it('should return default streak when no battles found', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([]);

      const result = await service.getCurrentStreak(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual({
        current: { type: 'none', count: 0 },
        longest: { wins: 0, losses: 0 },
      });
    });

    it('should calculate current win streak', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        createdAt: new Date('2024-01-02'),
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([battle2, mockBattle]);

      const result = await service.getCurrentStreak(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.current).toEqual({ type: 'wins', count: 2 });
      expect(result.longest.wins).toBe(2);
    });

    it('should calculate current loss streak', async () => {
      const lossBattle = {
        ...mockBattle,
        winningTeam: 2,
        losingTeam: 1,
        warriors: [{ ...mockWarrior1, team: 1 }, mockWarrior2],
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([lossBattle]);

      const result = await service.getCurrentStreak(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.current).toEqual({ type: 'losses', count: 1 });
      expect(result.longest.losses).toBe(1);
    });

    it('should calculate longest streaks correctly', async () => {
      const battles = [
        { ...mockBattle, id: 'b-5', createdAt: new Date('2024-01-05') },
        {
          ...mockBattle,
          id: 'b-4',
          winningTeam: 2,
          losingTeam: 1,
          warriors: [{ ...mockWarrior1, team: 1 }, mockWarrior2],
          createdAt: new Date('2024-01-04'),
        },
        { ...mockBattle, id: 'b-3', createdAt: new Date('2024-01-03') },
        { ...mockBattle, id: 'b-2', createdAt: new Date('2024-01-02') },
        { ...mockBattle, id: 'b-1', createdAt: new Date('2024-01-01') },
      ];

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue(battles);

      const result = await service.getCurrentStreak(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.current).toEqual({ type: 'wins', count: 1 });
      expect(result.longest.wins).toBe(3);
      expect(result.longest.losses).toBe(1);
    });
  });

  describe('getBattleDurationStats', () => {
    it('should return cached result if available', async () => {
      const cachedData = JSON.stringify({
        avgWinDuration: 1500,
        avgLossDuration: 1200,
        fastest: { duration: 800, battleId: 'b-1' },
        longest: { duration: 2000, battleId: 'b-2' },
      });

      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getBattleDurationStats({}, mockUserId);

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it('should return default stats when no characters found', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([]);

      const result = await service.getBattleDurationStats({}, mockUserId);

      expect(result).toEqual({
        avgWinDuration: 0,
        avgLossDuration: 0,
        fastest: null,
        longest: null,
      });
    });

    it('should return default stats when no battles found', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([]);

      const result = await service.getBattleDurationStats(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual({
        avgWinDuration: 0,
        avgLossDuration: 0,
        fastest: null,
        longest: null,
      });
    });

    it('should calculate duration statistics correctly', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        duration: 2000,
        winningTeam: 2,
        losingTeam: 1,
        warriors: [{ ...mockWarrior1, team: 1 }, mockWarrior2],
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle, battle2]);

      const result = await service.getBattleDurationStats(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.avgWinDuration).toBe(1000);
      expect(result.avgLossDuration).toBe(2000);
      expect(result.fastest).toEqual({ duration: 1000, battleId: 'b-1' });
      expect(result.longest).toEqual({ duration: 2000, battleId: 'b-2' });
    });

    it('should handle only wins', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getBattleDurationStats(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.avgWinDuration).toBe(1000);
      expect(result.avgLossDuration).toBe(0);
    });

    it('should handle only losses', async () => {
      const lossBattle = {
        ...mockBattle,
        winningTeam: 2,
        losingTeam: 1,
        warriors: [{ ...mockWarrior1, team: 1 }, mockWarrior2],
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([lossBattle]);

      const result = await service.getBattleDurationStats(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.avgWinDuration).toBe(0);
      expect(result.avgLossDuration).toBe(1000);
    });
  });

  describe('getPhGrowthTimeSeries', () => {
    it('should return cached result if available', async () => {
      const cachedData = JSON.stringify([
        {
          date: '2024-01-01T00:00:00.000Z',
          ph: 50,
          cumulativePh: 50,
          battleId: 'b-1',
        },
      ]);

      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getPhGrowthTimeSeries({}, mockUserId);

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it('should return empty array when no characters found', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([]);

      const result = await service.getPhGrowthTimeSeries({}, mockUserId);

      expect(result).toEqual([]);
    });

    it('should calculate PH growth time series', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        createdAt: new Date('2024-01-02'),
        warriors: [{ ...mockWarrior1, ph: 30 }, mockWarrior2],
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle, battle2]);

      const result = await service.getPhGrowthTimeSeries(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        ph: 50,
        cumulativePh: 50,
        battleId: 'b-1',
      });
      expect(result[1]).toMatchObject({
        ph: 30,
        cumulativePh: 80,
        battleId: 'b-2',
      });
    });

    it('should only include battles with PH > 0', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      await service.getPhGrowthTimeSeries(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warriors: expect.objectContaining({
              some: expect.objectContaining({
                ph: { gt: 0 },
              }),
            }),
          }),
        }),
      );
    });

    it('should order results by creation date ascending', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      await service.getPhGrowthTimeSeries(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('getRatingGrowthTimeSeries', () => {
    it('should return cached result if available', async () => {
      const cachedData = JSON.stringify([
        {
          date: '2024-01-01T00:00:00.000Z',
          ratingDelta: 25,
          rating: 1500,
          battleId: 'b-1',
        },
      ]);

      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getRatingGrowthTimeSeries({}, mockUserId);

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it('should return empty array when no characters found', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([]);

      const result = await service.getRatingGrowthTimeSeries({}, mockUserId);

      expect(result).toEqual([]);
    });

    it('should calculate rating growth time series', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        rating: 1525,
        ratingDelta: 25,
        createdAt: new Date('2024-01-02'),
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle, battle2]);

      const result = await service.getRatingGrowthTimeSeries(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        ratingDelta: 25,
        rating: 1500,
        battleId: 'b-1',
      });
      expect(result[1]).toMatchObject({
        ratingDelta: 25,
        rating: 1525,
        battleId: 'b-2',
      });
    });

    it('should only include matchmaking battles with rating data', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      await service.getRatingGrowthTimeSeries(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matchmaking: true,
            rating: { not: null },
            ratingDelta: { not: null },
          }),
        }),
      );
    });
  });

  describe('getRatingDeltaByOpponent', () => {
    it('should return cached result if available', async () => {
      const cachedData = JSON.stringify([
        {
          opponentId: 'opponent-1',
          opponentName: 'Opponent1',
          totalRatingDelta: 50,
          avgRatingDelta: 25,
          wins: 2,
          losses: 0,
          totalBattles: 2,
        },
      ]);

      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getRatingDeltaByOpponent({}, mockUserId);

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it('should return empty array when no characters found', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findMany.mockResolvedValue([]);

      const result = await service.getRatingDeltaByOpponent({}, mockUserId);

      expect(result).toEqual([]);
    });

    it('should calculate rating delta by opponent', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getRatingDeltaByOpponent(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        opponentId: 'opponent-1',
        opponentName: 'Opponent1',
        totalRatingDelta: 25,
        wins: 1,
        losses: 0,
        totalBattles: 1,
        avgRatingDelta: 25,
      });
    });

    it('should calculate avgRatingDelta excluding battles with ratingDelta = 0', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        ratingDelta: 0,
      };
      const battle3 = {
        ...mockBattle,
        id: 'b-3',
        ratingDelta: 30,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([
        mockBattle,
        battle2,
        battle3,
      ]);

      const result = await service.getRatingDeltaByOpponent(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result[0].totalRatingDelta).toBe(55);
      expect(result[0].avgRatingDelta).toBe(27.5);
      expect(result[0].totalBattles).toBe(3);
    });

    it('should set avgRatingDelta to 0 when all battles have ratingDelta = 0', async () => {
      const battle2 = {
        ...mockBattle,
        ratingDelta: 0,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([battle2]);

      const result = await service.getRatingDeltaByOpponent(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result[0].totalRatingDelta).toBe(0);
      expect(result[0].avgRatingDelta).toBe(0);
    });

    it('should sort results by total rating delta descending', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        ratingDelta: 30,
        warriors: [
          mockWarrior1,
          { ...mockWarrior2, originalId: 'opponent-2', name: 'Opponent2' },
        ],
      };

      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle, battle2]);

      const result = await service.getRatingDeltaByOpponent(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result[0].opponentId).toBe('opponent-2');
      expect(result[0].totalRatingDelta).toBe(30);
      expect(result[1].opponentId).toBe('opponent-1');
      expect(result[1].totalRatingDelta).toBe(25);
    });

    it('should only include matchmaking battles without flee', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      await service.getRatingDeltaByOpponent(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matchmaking: true,
            ratingDelta: { not: null },
            hasFlee: false,
          }),
        }),
      );
    });
  });

  describe('getPlayerVsPlayerBattles', () => {
    it('should return empty result when no characters found', async () => {
      prismaService.userCharacter.findMany.mockResolvedValue([]);

      const result = await service.getPlayerVsPlayerBattles(
        { opponentId: 'opponent-1' },
        mockUserId,
      );

      expect(result.battles).toEqual([]);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should return battles between player and opponent', async () => {
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getPlayerVsPlayerBattles(
        { characterId: mockCharacterId, opponentId: 'opponent-1' },
        mockUserId,
      );

      expect(result.battles).toHaveLength(1);
      expect(result.battles[0]).toMatchObject({
        battleId: 'b-1',
        duration: 1000,
        ratingDelta: 25,
        userRating: 1500,
        opponentRating: 1450,
      });
    });

    it('should filter out battles without the specified opponent', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        warriors: [
          mockWarrior1,
          { ...mockWarrior2, originalId: 'opponent-2', name: 'Opponent2' },
        ],
      };

      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle, battle2]);

      const result = await service.getPlayerVsPlayerBattles(
        { characterId: mockCharacterId, opponentId: 'opponent-1' },
        mockUserId,
      );

      expect(result.battles).toHaveLength(1);
      expect(result.battles[0].battleId).toBe('b-1');
    });

    it('should handle pagination with cursor', async () => {
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const cursor = Buffer.from('1').toString('base64');
      const result = await service.getPlayerVsPlayerBattles(
        { characterId: mockCharacterId, opponentId: 'opponent-1', cursor },
        mockUserId,
      );

      expect(result.pagination.hasPrev).toBe(true);
    });

    it('should include total count when requested', async () => {
      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getPlayerVsPlayerBattles(
        {
          characterId: mockCharacterId,
          opponentId: 'opponent-1',
          includeTotal: true,
        },
        mockUserId,
      );

      expect(result.pagination.total).toBeDefined();
      expect(result.meta.performance.totalItems).toBeDefined();
    });

    it('should filter by opponent level range', async () => {
      const battle2 = {
        ...mockBattle,
        id: 'b-2',
        warriors: [
          mockWarrior1,
          { ...mockWarrior2, lvl: 110, originalId: 'opponent-1' },
        ],
      };

      prismaService.userCharacter.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      prismaService.battle.findMany.mockResolvedValue([mockBattle, battle2]);

      const result = await service.getPlayerVsPlayerBattles(
        {
          characterId: mockCharacterId,
          opponentId: 'opponent-1',
          minLevel: 90,
          maxLevel: 100,
        },
        mockUserId,
      );

      expect(result.battles).toHaveLength(1);
      expect(result.battles[0].battleId).toBe('b-1');
    });
  });

  describe('invalidateAnalyticsCache', () => {
    it('should invalidate all analytics cache keys for user', async () => {
      const mockRedisClient = {
        keys: jest.fn().mockResolvedValue(['key1', 'key2']),
        del: jest.fn().mockResolvedValue(2),
      };

      redisService.getClient.mockResolvedValue(mockRedisClient as any);

      await service.invalidateAnalyticsCache(mockUserId);

      expect(mockRedisClient.keys).toHaveBeenCalledWith(
        `analytics:${mockUserId}:*`,
      );
      expect(mockRedisClient.keys).toHaveBeenCalledWith(
        `statistics:*:${mockUserId}:*`,
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2');
    });

    it('should handle empty cache keys', async () => {
      const mockRedisClient = {
        keys: jest.fn().mockResolvedValue([]),
        del: jest.fn(),
      };

      redisService.getClient.mockResolvedValue(mockRedisClient as any);

      await service.invalidateAnalyticsCache(mockUserId);

      expect(mockRedisClient.keys).toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockRedisClient = {
        keys: jest.fn().mockRejectedValue(new Error('Redis error')),
      };

      redisService.getClient.mockResolvedValue(mockRedisClient as any);

      await expect(
        service.invalidateAnalyticsCache(mockUserId),
      ).resolves.not.toThrow();
    });
  });
});
