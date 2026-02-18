import { Test, type TestingModule } from '@nestjs/testing';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { TimersService } from './timers.service';
import { PrismaService } from 'src/db/prisma.service';
import { GuildsService } from 'src/guilds/guilds.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { CreateTimerFromGameClientDto } from 'src/timers/dto/create-timer-from-game-client.dto';
import { validateAndCalculateSpawnTimes } from 'src/timers/utils/validate-spawn-times';
import { TIMER_LIMITS } from 'src/timers/constants/timer-limits';
import { RedisService } from 'src/lib/redis/redis.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { EventsService } from 'src/events/events.service';
import { getSyntheticNpcId } from 'src/events/utils/get-synthetic-npc-id';

describe('TimersService', () => {
  let service: TimersService;

  const mockPrismaService = {
    timer: {
      upsert: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  const mockGuildsService = {
    getGuildsForRequiredPermissions: jest.fn(),
    getMultipleGuildsPermissions: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    setNX: jest.fn(),
    del: jest.fn(),
    deleteByPattern: jest.fn(),
  };

  const mockEventsService = {
    checkAndRecordEventHeroKill: jest.fn().mockResolvedValue(undefined),
    findActiveEventHeroByNpc: jest.fn().mockResolvedValue(null),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  const mockRedlock = {
    acquire: jest.fn(),
    release: jest.fn(),
  };

  const mockRedlockLock = {
    release: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    // Setup redlock mock to return a lock object
    mockRedlock.acquire.mockResolvedValue(mockRedlockLock);
    mockRedlock.release.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimersService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
        {
          provide: GuildsService,
          useValue: mockGuildsService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    service = module.get<TimersService>(TimersService);

    // Inject mock redlock (bypassing onModuleInit)
    (service as any).redlock = mockRedlock;

    jest.clearAllMocks();
    mockRedisService.deleteByPattern.mockResolvedValue(0);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTimerForGuild', () => {
    const userId = 'user123';
    const mockDto: CreateTimerFromGameClientDto = {
      respBaseSeconds: 3600,
      respawnRandomness: 10,
      world: 'test-world',
      npc: {
        id: 123,
        name: 'Test Boss',
        prof: 'w',
        location: 'Test Location',
        wt: 25,
        lvl: 100,
        type: 1,
        icon: 'icon.png',
        hpp: 1000,
        x: 100,
        y: 200,
      },
      characterId: 'char123',
      accountId: 'acc123',
    };

    const mockTimer = {
      guildId: 'guild1',
      world: 'test-world',
      npcId: 123,
      minSpawnTime: new Date(),
      maxSpawnTime: new Date(),
      latestRespBaseSeconds: 3600,
      latestRespawnRandomness: 10,
      createdById: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      npc: mockDto.npc,
      member: { id: 1, ign: 'TestUser' },
    };

    it('should create timer with calculated spawn times', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      const result = await service.createTimerForGuild(
        'discord123',
        userId,
        'guild1',
        mockDto,
      );

      expect(result).toBeDefined();
      expect(mockRedlock.acquire).toHaveBeenCalled();
      expect(mockPrismaService.timer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timerId: {
              guildId: 'guild1',
              world: 'test-world',
              npcId: 123,
            },
          },
        }),
      );
      expect(mockAmqpConnection.publish).toHaveBeenCalled();
      expect(mockRedlockLock.release).toHaveBeenCalled();
    });

    it('should use custom spawn times when provided', async () => {
      const customMin = new Date(Date.now() + 3600000);
      const customMax = new Date(Date.now() + 7200000);
      const dtoWithCustomTimes = {
        ...mockDto,
        customMinSpawnTime: customMin,
        customMaxSpawnTime: customMax,
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      await service.createTimerForGuild(
        'discord123',
        userId,
        'guild1',
        dtoWithCustomTimes,
      );

      expect(mockPrismaService.timer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            minSpawnTime: customMin,
            maxSpawnTime: customMax,
          }),
          update: expect.objectContaining({
            minSpawnTime: customMin,
            maxSpawnTime: customMax,
          }),
        }),
      );
    });

    it('should throw BadRequestException when NPC wt is too low', async () => {
      const lowWtDto = {
        ...mockDto,
        npc: { ...mockDto.npc, wt: 15 },
      };

      await expect(
        service.createTimerForGuild('discord123', userId, 'guild1', lowWtDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should emit update timer event after creation', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      await service.createTimerForGuild(
        'discord123',
        userId,
        'guild1',
        mockDto,
      );

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        mockTimer,
      );
    });

    it('should throw ConflictException when lock cannot be acquired', async () => {
      const ExecutionError = require('redlock').ExecutionError;
      mockRedisService.get.mockResolvedValue(null);
      mockRedlock.acquire.mockRejectedValue(new ExecutionError('Lock failed'));

      await expect(
        service.createTimerForGuild('discord123', userId, 'guild1', mockDto),
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.timer.upsert).not.toHaveBeenCalled();
    });

    it('should return existing timer when lock cannot be acquired but timer was created concurrently', async () => {
      const ExecutionError = require('redlock').ExecutionError;
      mockRedisService.get.mockResolvedValue(null);
      mockRedlock.acquire.mockRejectedValue(new ExecutionError('Lock failed'));
      mockPrismaService.timer.findUnique.mockResolvedValue(mockTimer);

      const result = await service.createTimerForGuild(
        'discord123',
        userId,
        'guild1',
        mockDto,
      );

      expect(result).toMatchObject({
        guildId: mockTimer.guildId,
        npcId: mockTimer.npcId,
        world: mockTimer.world,
      });
      expect(mockPrismaService.timer.upsert).not.toHaveBeenCalled();
    });

    it('should return cached timer on deduplication hit', async () => {
      const cachedTimer = JSON.stringify(mockTimer);
      mockRedisService.get.mockResolvedValue(cachedTimer);

      const result = await service.createTimerForGuild(
        'discord123',
        userId,
        'guild1',
        mockDto,
      );

      expect(result).toMatchObject({
        guildId: mockTimer.guildId,
        npcId: mockTimer.npcId,
        world: mockTimer.world,
      });
      expect(mockRedisService.setNX).not.toHaveBeenCalled();
      expect(mockPrismaService.timer.upsert).not.toHaveBeenCalled();
    });

    it('should cache timer result after creation', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      await service.createTimerForGuild(
        'discord123',
        userId,
        'guild1',
        mockDto,
      );

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining('timer:dedup:'),
        expect.any(String),
        expect.any(Number),
      );
    });

    it('should release lock even if upsert fails', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.timer.upsert.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createTimerForGuild('discord123', userId, 'guild1', mockDto),
      ).rejects.toThrow('Database error');

      expect(mockRedlockLock.release).toHaveBeenCalled();
    });

    it('should migrate synthetic timer context to real npcId for event hero scoring window', async () => {
      const syntheticNpcId = getSyntheticNpcId('hero-1');
      const syntheticTimer = {
        guildId: 'guild1',
        world: 'test-world',
        npcId: syntheticNpcId,
        minSpawnTime: new Date('2026-02-18T09:27:52.727Z'),
        maxSpawnTime: new Date('2026-02-18T11:30:00.000Z'),
        latestRespBaseSeconds: 3600,
        latestRespawnRandomness: 10,
        createdById: 1,
        tempId: null,
        wasReset: false,
        windowOpenedAt: new Date('2026-02-18T09:27:52.727Z'),
        npc: { ...mockDto.npc, id: syntheticNpcId },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockPrismaService.timer.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(syntheticTimer);
      mockPrismaService.timer.upsert
        .mockResolvedValueOnce({ ...syntheticTimer, npcId: mockDto.npc.id })
        .mockResolvedValueOnce(mockTimer);
      mockPrismaService.timer.delete.mockResolvedValue(syntheticTimer);
      mockEventsService.findActiveEventHeroByNpc.mockResolvedValue({
        eventHero: { id: 'hero-1', npcId: null },
        event: { id: 'event-1' },
      });

      await service.createTimerForGuild('discord123', userId, 'guild1', mockDto);

      expect(mockPrismaService.timer.delete).toHaveBeenCalledWith({
        where: {
          timerId: {
            guildId: 'guild1',
            world: 'test-world',
            npcId: syntheticNpcId,
          },
        },
      });

      expect(mockEventsService.checkAndRecordEventHeroKill).toHaveBeenCalledWith(
        expect.objectContaining({
          timerData: expect.objectContaining({
            previousMinSpawnTime: syntheticTimer.minSpawnTime,
            previousMaxSpawnTime: syntheticTimer.maxSpawnTime,
            windowOpenedAt: syntheticTimer.windowOpenedAt,
          }),
        }),
      );

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('timers.delete'),
        expect.objectContaining({ npcId: syntheticNpcId }),
      );
    });

    it('should handle 50 concurrent createTimerForGuild calls idempotently for the same npc', async () => {
      const ExecutionError = require('redlock').ExecutionError;
      const totalCalls = 50;
      let createdTimer: typeof mockTimer | null = null;
      let mainLockHeld = false;

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockEventsService.findActiveEventHeroByNpc.mockResolvedValue(null);

      mockPrismaService.timer.findUnique.mockImplementation(async (args: any) => {
        const queriedNpcId = args?.where?.timerId?.npcId;
        if (queriedNpcId !== mockDto.npc.id) {
          return null;
        }
        return createdTimer;
      });

      mockPrismaService.timer.upsert.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
        createdTimer = mockTimer;
        return mockTimer;
      });

      mockRedlock.acquire.mockImplementation(async (keys: string[]) => {
        const key = keys[0];
        if (key === 'timer:lock:guild1:test-world:123') {
          if (mainLockHeld) {
            throw new ExecutionError('Lock failed');
          }
          mainLockHeld = true;
          return {
            release: jest.fn().mockImplementation(async () => {
              mainLockHeld = false;
            }),
          };
        }

        return { release: jest.fn().mockResolvedValue(undefined) };
      });

      const results = await Promise.all(
        Array.from({ length: totalCalls }, (_, i) =>
          service.createTimerForGuild(
            `discord-${i}`,
            `user-${i}`,
            'guild1',
            mockDto,
          ),
        ),
      );

      expect(results).toHaveLength(totalCalls);
      expect(results.every((timer) => timer.npcId === mockDto.npc.id)).toBe(true);
      expect(mockPrismaService.timer.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateAndCalculateSpawnTimes', () => {
    const baseDto: CreateTimerFromGameClientDto = {
      respBaseSeconds: 3600,
      respawnRandomness: 10,
      world: 'test-world',
      npc: {
        id: 123,
        name: 'Test Boss',
        prof: 'w',
        location: 'Test Location',
        wt: 25,
        lvl: 100,
        type: 1,
        icon: 'icon.png',
        hpp: 1000,
        x: 100,
        y: 200,
      },
      characterId: 'char123',
      accountId: 'acc123',
    };

    it('should calculate spawn times from respBaseSeconds', () => {
      const now = new Date();
      const result = validateAndCalculateSpawnTimes(baseDto, now);

      expect(result.minSpawnTime).toBeDefined();
      expect(result.maxSpawnTime).toBeDefined();
      expect(result.maxSpawnTime.getTime()).toBeGreaterThan(
        result.minSpawnTime.getTime(),
      );
    });

    it('should use custom spawn times when provided', () => {
      const customMin = new Date(Date.now() + 3600000);
      const customMax = new Date(Date.now() + 7200000);
      const dto = {
        ...baseDto,
        customMinSpawnTime: customMin,
        customMaxSpawnTime: customMax,
      };

      const result = validateAndCalculateSpawnTimes(dto);

      expect(result.minSpawnTime).toEqual(customMin);
      expect(result.maxSpawnTime).toEqual(customMax);
    });

    it('should throw when maxSpawnTime is before minSpawnTime', () => {
      const customMin = new Date(Date.now() + 7200000);
      const customMax = new Date(Date.now() + 3600000);
      const dto = {
        ...baseDto,
        customMinSpawnTime: customMin,
        customMaxSpawnTime: customMax,
      };

      expect(() => validateAndCalculateSpawnTimes(dto)).toThrow(
        BadRequestException,
      );
    });

    it('should throw when spawn time is in the past', () => {
      const customMin = new Date(Date.now() - 3600000);
      const customMax = new Date(Date.now() + 3600000);
      const dto = {
        ...baseDto,
        customMinSpawnTime: customMin,
        customMaxSpawnTime: customMax,
      };

      expect(() => validateAndCalculateSpawnTimes(dto)).toThrow(
        BadRequestException,
      );
    });

    it('should throw when spawn window exceeds maximum allowed', () => {
      const customMin = new Date();
      const customMax = new Date(
        Date.now() +
          (TIMER_LIMITS.MAX_SPAWN_WINDOW_DAYS + 1) * 24 * 60 * 60 * 1000,
      );
      const dto = {
        ...baseDto,
        customMinSpawnTime: customMin,
        customMaxSpawnTime: customMax,
      };

      expect(() => validateAndCalculateSpawnTimes(dto)).toThrow(
        BadRequestException,
      );
    });

    it('should accept ISO string dates and convert them to Date objects', () => {
      const customMin = new Date(Date.now() + 3600000);
      const customMax = new Date(Date.now() + 7200000);
      const dto = {
        ...baseDto,
        customMinSpawnTime: customMin.toISOString() as unknown as Date,
        customMaxSpawnTime: customMax.toISOString() as unknown as Date,
      };

      const result = validateAndCalculateSpawnTimes(dto);

      expect(result.minSpawnTime).toBeInstanceOf(Date);
      expect(result.maxSpawnTime).toBeInstanceOf(Date);
      expect(
        Math.abs(result.minSpawnTime.getTime() - customMin.getTime()),
      ).toBeLessThan(1000);
      expect(
        Math.abs(result.maxSpawnTime.getTime() - customMax.getTime()),
      ).toBeLessThan(1000);
    });
  });

  describe('Cache invalidation', () => {
    const userId = 'user123';
    const mockDto: CreateTimerFromGameClientDto = {
      respBaseSeconds: 3600,
      respawnRandomness: 10,
      world: 'test-world',
      npc: {
        id: 123,
        name: 'Test Boss',
        prof: 'w',
        location: 'Test Location',
        wt: 25,
        lvl: 100,
        type: 1,
        icon: 'icon.png',
        hpp: 1000,
        x: 100,
        y: 200,
      },
      characterId: 'char123',
      accountId: 'acc123',
    };

    const mockTimer = {
      guildId: 'guild1',
      world: 'test-world',
      npcId: 123,
      minSpawnTime: new Date(),
      maxSpawnTime: new Date(),
      latestRespBaseSeconds: 3600,
      latestRespawnRandomness: 10,
      createdById: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      npc: mockDto.npc,
      member: { id: 1, ign: 'TestUser' },
    };

    it('should invalidate cache when timer is created', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.deleteByPattern.mockResolvedValue(2);
      mockPrismaService.timer.upsert.mockResolvedValue({
        ...mockTimer,
        guildId: 'guild1',
      });

      await service.createTimerForGuild(
        'discord123',
        userId,
        'guild1',
        mockDto,
      );

      expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(
        'timer:list:guild1:*',
      );
    });

    it('should invalidate cache when timer is reset', async () => {
      mockRedisService.deleteByPattern.mockResolvedValue(1);
      mockPrismaService.timer.findUnique.mockResolvedValue({
        ...mockTimer,
        latestRespBaseSeconds: 3600,
        latestRespawnRandomness: 10,
      });
      mockPrismaService.timer.update.mockResolvedValue(mockTimer);

      await service.resetTimer('discord123', 'guild1', '123', {
        world: 'test-world',
      });

      expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(
        'timer:list:guild1:*',
      );
    });

    it('should invalidate cache when timer is deleted', async () => {
      mockRedisService.deleteByPattern.mockResolvedValue(1);
      mockPrismaService.timer.delete.mockResolvedValue(mockTimer);

      await service.deleteTimer('guild1', '123', 'test-world');

      expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(
        'timer:list:guild1:*',
      );
    });
  });

  describe('searchNpcsWithTimerData', () => {
    const mockTimersQueryResult = [
      {
        npcId: 123,
        npc: {
          name: 'Test Boss',
          lvl: 100,
          type: 'ELITE',
          prof: 'w',
          location: 'Test Location',
          wt: 25,
          icon: 'test-icon.png',
        },
        latestRespBaseSeconds: 3600,
        latestRespawnRandomness: 10,
      },
      {
        npcId: 124,
        npc: {
          name: 'Test Elite',
          lvl: 150,
          type: 'ELITE2',
          prof: 'm',
          location: 'Test Cave',
          wt: 30,
          icon: 'elite-icon.png',
        },
        latestRespBaseSeconds: 7200,
        latestRespawnRandomness: 15,
      },
    ];

    it('should search NPCs with timer data', async () => {
      mockPrismaService.$queryRaw = jest
        .fn()
        .mockResolvedValue(mockTimersQueryResult);

      const result = await service.searchNpcsWithTimerData(
        'guild1',
        'test-world',
        'Test',
        10,
      );

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        npcId: 123,
        name: 'Test Boss',
        lvl: 100,
        type: 'ELITE',
        prof: 'w',
        location: 'Test Location',
        wt: 25,
        icon: 'test-icon.png',
        latestRespBaseSeconds: 3600,
        latestRespawnRandomness: 10,
      });
    });

    it('should handle empty search results', async () => {
      mockPrismaService.$queryRaw = jest.fn().mockResolvedValue([]);

      const result = await service.searchNpcsWithTimerData(
        'guild1',
        'test-world',
        'NonExistentNPC',
        10,
      );

      expect(result).toHaveLength(0);
    });

    it('should filter out null results from invalid NPC data', async () => {
      const invalidTimerData = [
        {
          npcId: 125,
          npc: null,
          latestRespBaseSeconds: 1800,
          latestRespawnRandomness: 5,
        },
      ];

      mockPrismaService.$queryRaw = jest
        .fn()
        .mockResolvedValue(invalidTimerData);

      const result = await service.searchNpcsWithTimerData(
        'guild1',
        'test-world',
        'Invalid',
        10,
      );

      expect(result).toHaveLength(0);
    });

    it('should use default limit when not provided', async () => {
      mockPrismaService.$queryRaw = jest
        .fn()
        .mockResolvedValue(mockTimersQueryResult);

      await service.searchNpcsWithTimerData('guild1', 'test-world', 'Test');

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });
});
