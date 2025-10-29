import { Test, type TestingModule } from '@nestjs/testing';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { TimersService } from './timers.service';
import { PrismaService } from 'src/db/prisma.service';
import { GuildsService } from 'src/guilds/guilds.service';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';
import { BadRequestException } from '@nestjs/common';
import type { CreateTimerFromGameClientDto } from 'src/timers/dto/create-timer-from-game-client.dto';
import { validateAndCalculateSpawnTimes } from 'src/timers/utils/validate-spawn-times';
import { TIMER_LIMITS } from 'src/timers/constants/timer-limits';

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
  };

  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  const mockGuildsService = {
    getGuildsForRequiredPermissions: jest.fn(),
    getMultipleGuildsPermissions: jest.fn(),
  };

  const mockUserLootlogConfigService = {
    getLootlogCharacterConfig: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimersService,
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
          provide: UserLootlogConfigService,
          useValue: mockUserLootlogConfigService,
        },
      ],
    }).compile();

    service = module.get<TimersService>(TimersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTimerForGuild', () => {
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
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      const result = await service.createTimerForGuild(
        'discord123',
        'guild1',
        mockDto,
      );

      expect(result).toBeDefined();
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
    });

    it('should use custom spawn times when provided', async () => {
      const customMin = new Date(Date.now() + 3600000);
      const customMax = new Date(Date.now() + 7200000);
      const dtoWithCustomTimes = {
        ...mockDto,
        customMinSpawnTime: customMin,
        customMaxSpawnTime: customMax,
      };

      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      await service.createTimerForGuild(
        'discord123',
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
        service.createTimerForGuild('discord123', 'guild1', lowWtDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should emit update timer event after creation', async () => {
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      await service.createTimerForGuild('discord123', 'guild1', mockDto);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        mockTimer,
      );
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
  });
});
