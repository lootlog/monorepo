import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { TimersService } from "./timers.service";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { BadRequestException, ConflictException } from "@nestjs/common";
import type { CreateTimerFromGameClientDto } from "src/timers/dto/create-timer-from-game-client.dto";
import { validateAndCalculateSpawnTimes } from "src/timers/utils/validate-spawn-times";
import { TIMER_LIMITS } from "src/timers/constants/timer-limits";
import { RedisService } from "@lootlog/nest-shared/redis";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { RedlockService } from "src/lib/redlock/redlock.service";
import { getSyntheticNpcId } from "src/events/utils/get-synthetic-npc-id";
import { buildTimerKey } from "src/timers/utils/timer-key";
import { EventTimerHooksService } from "src/events/services/event-timer-hooks.service";
import { ErrorKey } from "src/timers/enum/error-key.enum";
import { ExecutionError } from "redlock";
import { UserLootlogConfigService } from "src/user-lootlog-config/user-lootlog-config.service";
import { RoutingKey } from "src/enum/routing-key.enum";

describe("TimersService", () => {
  let service: TimersService;

  const mockPrismaService = {
    timer: {
      upsert: mockFn(),
      create: mockFn(),
      findMany: mockFn(),
      findUnique: mockFn(),
      update: mockFn(),
      delete: mockFn(),
      deleteMany: mockFn(),
    },
    $queryRaw: mockFn(),
  };

  const mockAmqpConnection = {
    publish: mockFn(),
  };

  const mockGuildsService = {
    getGuildsForRequiredPermissions: mockFn(),
    getMultipleGuildsPermissions: mockFn(),
  };

  const mockRedisService = {
    get: mockFn(),
    set: mockFn(),
    setNX: mockFn(),
    eval: mockFn(),
    del: mockFn(),
    deleteByPattern: mockFn(),
  };

  const mockEventTimerHooksService = {
    enqueueEventHeroKillCheck: mockFn().mockResolvedValue(undefined),
    findActiveEventHeroByNpc: mockFn().mockResolvedValue(null),
  };

  const mockUserLootlogConfigService = {
    getLootlogCharacterConfig: mockFn().mockResolvedValue(null),
  };

  const mockLogger = {
    log: mockFn(),
    error: mockFn(),
    warn: mockFn(),
    debug: mockFn(),
    verbose: mockFn(),
  };

  const mockRedlock = {
    acquire: mockFn(),
    release: mockFn(),
  };

  const mockRedlockLock = {
    release: mockFn().mockResolvedValue(undefined),
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
          provide: UserLootlogConfigService,
          useValue: mockUserLootlogConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: EventTimerHooksService,
          useValue: mockEventTimerHooksService,
        },
        {
          provide: RedlockService,
          useValue: { createInstance: mockFn().mockReturnValue(mockRedlock) },
        },
      ],
    }).compile();

    service = module.get<TimersService>(TimersService);

    // Inject mock redlock (bypassing onModuleInit)
    (service as unknown as { redlock: typeof mockRedlock }).redlock =
      mockRedlock;

    vi.clearAllMocks();
    mockRedisService.deleteByPattern.mockResolvedValue(0);
    mockRedisService.setNX.mockResolvedValue(true);
    mockRedisService.eval.mockResolvedValue(1);
    mockPrismaService.timer.findUnique.mockResolvedValue(null);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createTimerForGuild", () => {
    const userId = "user123";
    const mockDto: CreateTimerFromGameClientDto = {
      respBaseSeconds: 3600,
      respawnRandomness: 10,
      world: "test-world",
      npc: {
        id: 123,
        name: "Test Boss",
        prof: "w",
        location: "Test Location",
        wt: 25,
        lvl: 100,
        type: 1,
        icon: "icon.png",
        hpp: 1000,
        x: 100,
        y: 200,
      },
      characterId: "char123",
      accountId: "acc123",
    };

    const mockTimer = {
      guildId: "guild1",
      world: "test-world",
      npcId: 123,
      timerKey: buildTimerKey(123, mockDto.npc.name),
      minSpawnTime: new Date(),
      maxSpawnTime: new Date(),
      latestRespBaseSeconds: 3600,
      latestRespawnRandomness: 10,
      createdById: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      npc: mockDto.npc,
      member: { id: 1, ign: "TestUser" },
    };

    it("should create timer with calculated spawn times", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      const result = await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        mockDto,
      );

      expect(result).toBeDefined();
      expect(mockRedlock.acquire).toHaveBeenCalled();
      expect(mockPrismaService.timer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timerId: {
              guildId: "guild1",
              world: "test-world",
              timerKey: buildTimerKey(123, mockDto.npc.name),
            },
          },
        }),
      );
      expect(mockAmqpConnection.publish).toHaveBeenCalled();
      expect(mockRedlockLock.release).toHaveBeenCalled();
    });

    it("should use custom spawn times when provided", async () => {
      const customMin = new Date(Date.now() + 3600000);
      const customMax = new Date(Date.now() + 7200000);
      const dtoWithCustomTimes = {
        ...mockDto,
        customMinSpawnTime: customMin.toISOString(),
        customMaxSpawnTime: customMax.toISOString(),
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
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

    it("should throw BadRequestException when NPC wt is too low", async () => {
      const lowWtDto = {
        ...mockDto,
        npc: { ...mockDto.npc, wt: 15 },
      };

      await expect(
        service.createTimerForGuild("discord123", userId, "guild1", lowWtDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should emit update timer event after creation", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        mockDto,
      );

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        mockTimer,
      );
    });

    it("should throw ConflictException when lock cannot be acquired", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedlock.acquire.mockRejectedValue(new ExecutionError("Lock failed"));

      await expect(
        service.createTimerForGuild("discord123", userId, "guild1", mockDto),
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.timer.upsert).not.toHaveBeenCalled();
    });

    it("should return existing timer when lock cannot be acquired but timer was created concurrently", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedlock.acquire.mockRejectedValue(new ExecutionError("Lock failed"));
      const concurrentlyCreatedTimer = {
        ...mockTimer,
        updatedAt: new Date(Date.now() + 1000),
      };
      mockPrismaService.timer.findUnique.mockResolvedValue(
        concurrentlyCreatedTimer,
      );

      const result = await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        mockDto,
      );

      expect(result).toMatchObject({
        guildId: concurrentlyCreatedTimer.guildId,
        npcId: concurrentlyCreatedTimer.npcId,
        world: concurrentlyCreatedTimer.world,
      });
      expect(mockPrismaService.timer.upsert).not.toHaveBeenCalled();
    });

    it("should return cached timer on deduplication hit", async () => {
      const cachedTimer = JSON.stringify(mockTimer);
      mockRedisService.get.mockResolvedValue(cachedTimer);

      const result = await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
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

    it("should cache timer result after creation", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        mockDto,
      );

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `timer:dedup:guild1:test-world:${buildTimerKey(mockDto.npc.id, mockDto.npc.name)}`,
        expect.any(String),
        30,
      );
      expect(mockRedisService.setNX).toHaveBeenCalledWith(
        `timer:dedup:guild1:test-world:${buildTimerKey(mockDto.npc.id, mockDto.npc.name)}:lock`,
        expect.any(String),
        30,
      );
    });

    it("should not release a dedup lock acquired by another request after TTL expiry", async () => {
      const lockKey = `timer:dedup:guild1:test-world:${buildTimerKey(mockDto.npc.id, mockDto.npc.name)}:lock`;
      let currentLockToken: string | null = null;
      let originalLockToken: string | null = null;

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.setNX.mockImplementation(
        (_key: string, value: string) => {
          originalLockToken = value;
          currentLockToken = value;
          return true;
        },
      );
      mockRedisService.eval.mockImplementation(
        (_script: string, _keys: string[], args: string[]) => {
          if (currentLockToken === args[0]) {
            currentLockToken = null;
            return 1;
          }

          return 0;
        },
      );
      mockPrismaService.timer.upsert.mockImplementation(async () => {
        currentLockToken = "new-owner-token";
        return mockTimer;
      });

      await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        mockDto,
      );

      expect(originalLockToken).toEqual(expect.any(String));
      expect(currentLockToken).toBe("new-owner-token");
      expect(mockRedisService.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get", KEYS[1]) == ARGV[1]'),
        [lockKey],
        [originalLockToken],
      );
      expect(mockRedisService.del).not.toHaveBeenCalledWith(lockKey);
    });

    it("should return existing timer during dedup lock contention without publishing again", async () => {
      vi.useFakeTimers();
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.setNX.mockResolvedValue(false);
      mockPrismaService.timer.findUnique.mockResolvedValue({
        ...mockTimer,
        updatedAt: new Date(Date.now() + 1000),
      });

      const resultPromise = service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        mockDto,
      );

      await vi.advanceTimersByTimeAsync(5000);
      const result = await resultPromise;
      vi.useRealTimers();

      expect(result).toMatchObject({
        guildId: mockTimer.guildId,
        npcId: mockTimer.npcId,
        world: mockTimer.world,
      });
      expect(mockPrismaService.timer.upsert).not.toHaveBeenCalled();
      expect(mockAmqpConnection.publish).not.toHaveBeenCalled();
    });

    it("should take over timer creation when dedup lock holder fails before creating a timer", async () => {
      vi.useFakeTimers();
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.setNX
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      mockPrismaService.timer.findUnique.mockResolvedValue(null);
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      const resultPromise = service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        mockDto,
      );

      await vi.advanceTimersByTimeAsync(5000);
      const result = await resultPromise;
      vi.useRealTimers();

      expect(result).toMatchObject({
        guildId: mockTimer.guildId,
        npcId: mockTimer.npcId,
        world: mockTimer.world,
      });
      expect(mockRedisService.setNX).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.timer.upsert).toHaveBeenCalledTimes(1);
      expect(
        mockAmqpConnection.publish.mock.calls.filter(
          (call) => call[1] === RoutingKey.GUILDS_TIMERS_UPDATE,
        ),
      ).toHaveLength(1);
    });

    it("should use the same dedup cache for different discord users in the same timer burst", async () => {
      const cachedTimer = JSON.stringify(mockTimer);
      mockRedisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(cachedTimer);
      mockRedisService.set.mockResolvedValue(undefined);
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      const firstResult = await service.createTimerForGuild(
        "discord-1",
        "user-1",
        "guild1",
        mockDto,
      );
      const secondResult = await service.createTimerForGuild(
        "discord-2",
        "user-2",
        "guild1",
        mockDto,
      );

      expect(firstResult.npcId).toBe(mockDto.npc.id);
      expect(secondResult.npcId).toBe(mockDto.npc.id);
      expect(mockPrismaService.timer.upsert).toHaveBeenCalledTimes(1);
      expect(
        mockAmqpConnection.publish.mock.calls.filter(
          (call) => call[1] === RoutingKey.GUILDS_TIMERS_UPDATE,
        ),
      ).toHaveLength(1);
      expect(
        mockEventTimerHooksService.enqueueEventHeroKillCheck,
      ).toHaveBeenCalledTimes(1);
      expect(mockRedisService.get).toHaveBeenCalledWith(
        `timer:dedup:guild1:test-world:${buildTimerKey(mockDto.npc.id, mockDto.npc.name)}`,
      );
    });

    it("should release lock even if upsert fails", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.timer.upsert.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        service.createTimerForGuild("discord123", userId, "guild1", mockDto),
      ).rejects.toThrow("Database error");

      expect(mockRedlockLock.release).toHaveBeenCalled();
    });

    it("should update timer even when current window has not opened yet", async () => {
      const futureMinSpawnTime = new Date(Date.now() + 10 * 60 * 1000);
      const existingTimer = {
        ...mockTimer,
        minSpawnTime: futureMinSpawnTime,
        maxSpawnTime: new Date(Date.now() + 20 * 60 * 1000),
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockPrismaService.timer.findUnique.mockResolvedValue(existingTimer);
      mockPrismaService.timer.upsert.mockResolvedValue(mockTimer);

      const result = await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        mockDto,
      );

      expect(result).toBeDefined();
      expect(mockPrismaService.timer.upsert).toHaveBeenCalled();
      expect(mockAmqpConnection.publish).toHaveBeenCalled();
      expect(
        mockEventTimerHooksService.enqueueEventHeroKillCheck,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          timerData: expect.objectContaining({
            previousMinSpawnTime: existingTimer.minSpawnTime,
            previousMaxSpawnTime: existingTimer.maxSpawnTime,
          }),
        }),
      );
    });

    it("should migrate synthetic timer context to real npcId for event hero scoring window", async () => {
      const syntheticNpcId = getSyntheticNpcId("hero-1");
      const syntheticTimer = {
        guildId: "guild1",
        world: "test-world",
        npcId: syntheticNpcId,
        timerKey: buildTimerKey(syntheticNpcId, mockDto.npc.name),
        minSpawnTime: new Date("2026-02-18T09:27:52.727Z"),
        maxSpawnTime: new Date("2026-02-18T11:30:00.000Z"),
        latestRespBaseSeconds: 3600,
        latestRespawnRandomness: 10,
        createdById: 1,
        tempId: null,
        wasReset: false,
        windowOpenedAt: new Date("2026-02-18T09:27:52.727Z"),
        npc: { ...mockDto.npc, id: syntheticNpcId },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockPrismaService.timer.findUnique.mockImplementation(
        (args: { where?: { timerId?: { timerKey?: string } } }) => {
          if (args?.where?.timerId?.timerKey === syntheticTimer.timerKey) {
            return syntheticTimer;
          }
          return null;
        },
      );
      mockPrismaService.timer.upsert
        .mockResolvedValueOnce({ ...syntheticTimer, npcId: mockDto.npc.id })
        .mockResolvedValueOnce(mockTimer);
      mockPrismaService.timer.delete.mockResolvedValue(syntheticTimer);
      mockEventTimerHooksService.findActiveEventHeroByNpc.mockResolvedValue({
        eventHero: { id: "hero-1", npcId: null },
        event: { id: "event-1" },
      });

      await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        mockDto,
      );

      expect(mockPrismaService.timer.delete).toHaveBeenCalledWith({
        where: {
          timerId: {
            guildId: "guild1",
            world: "test-world",
            timerKey: buildTimerKey(syntheticNpcId, mockDto.npc.name),
          },
        },
      });

      expect(
        mockEventTimerHooksService.enqueueEventHeroKillCheck,
      ).toHaveBeenCalledWith(
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
        expect.stringContaining("timers.delete"),
        expect.objectContaining({
          npcId: syntheticNpcId,
          timerKey: buildTimerKey(syntheticNpcId, mockDto.npc.name),
        }),
      );
    });

    it("should handle 50 concurrent createTimerForGuild calls idempotently for the same npc", async () => {
      const totalCalls = 50;
      let createdTimer: typeof mockTimer | null = null;
      let dedupCache: string | null = null;
      let dedupLockHeld = false;
      let mainLockHeld = false;

      mockRedisService.get.mockImplementation((key: string) => {
        if (
          key ===
          `timer:dedup:guild1:test-world:${buildTimerKey(mockDto.npc.id, mockDto.npc.name)}`
        ) {
          return dedupCache;
        }
        return null;
      });
      mockRedisService.set.mockImplementation((key: string, value: string) => {
        if (
          key ===
          `timer:dedup:guild1:test-world:${buildTimerKey(mockDto.npc.id, mockDto.npc.name)}`
        ) {
          dedupCache = value;
        }
        return undefined;
      });
      let dedupLockToken: string | null = null;
      mockRedisService.setNX.mockImplementation(
        (key: string, value: string) => {
          if (
            key ===
            `timer:dedup:guild1:test-world:${buildTimerKey(mockDto.npc.id, mockDto.npc.name)}:lock`
          ) {
            if (dedupLockHeld) {
              return false;
            }
            dedupLockHeld = true;
            dedupLockToken = value;
            return true;
          }
          return true;
        },
      );
      mockRedisService.eval.mockImplementation(
        (_script: string, keys: string[], args: string[]) => {
          const key = keys[0];
          if (
            key ===
              `timer:dedup:guild1:test-world:${buildTimerKey(mockDto.npc.id, mockDto.npc.name)}:lock` &&
            args[0] === dedupLockToken
          ) {
            dedupLockHeld = false;
            dedupLockToken = null;
            return 1;
          }
          return 0;
        },
      );
      mockEventTimerHooksService.findActiveEventHeroByNpc.mockResolvedValue(
        null,
      );

      mockPrismaService.timer.findUnique.mockImplementation(
        (args: { where?: { timerId?: { timerKey?: string } } }) => {
          const queriedTimerKey = args?.where?.timerId?.timerKey;
          if (
            queriedTimerKey !== buildTimerKey(mockDto.npc.id, mockDto.npc.name)
          ) {
            return null;
          }
          return createdTimer;
        },
      );

      mockPrismaService.timer.upsert.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
        createdTimer = {
          ...mockTimer,
          updatedAt: new Date(Date.now() + 1000),
        };
        return createdTimer;
      });

      mockRedlock.acquire.mockImplementation((keys: string[]) => {
        const key = keys[0];
        if (
          key ===
          `timer:lock:guild1:test-world:${buildTimerKey(mockDto.npc.id, mockDto.npc.name)}`
        ) {
          if (mainLockHeld) {
            throw new ExecutionError("Lock failed");
          }
          mainLockHeld = true;
          return {
            release: mockFn().mockImplementation(() => {
              mainLockHeld = false;
            }),
          };
        }

        return { release: mockFn().mockResolvedValue(undefined) };
      });

      const results = await Promise.all(
        Array.from({ length: totalCalls }, (_, i) =>
          service.createTimerForGuild(
            `discord-${i}`,
            `user-${i}`,
            "guild1",
            mockDto,
          ),
        ),
      );

      expect(results).toHaveLength(totalCalls);
      expect(results.every((timer) => timer.npcId === mockDto.npc.id)).toBe(
        true,
      );
      expect(mockPrismaService.timer.upsert).toHaveBeenCalledTimes(1);
    });

    it("should create separate timers for the same npcId when normalized names differ", async () => {
      const secondDto = {
        ...mockDto,
        npc: {
          ...mockDto.npc,
          name: "Other Boss",
        },
      };
      const secondTimer = {
        ...mockTimer,
        timerKey: buildTimerKey(secondDto.npc.id, secondDto.npc.name),
        npc: secondDto.npc,
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockPrismaService.timer.findUnique.mockResolvedValue(null);
      mockPrismaService.timer.upsert
        .mockResolvedValueOnce(mockTimer)
        .mockResolvedValueOnce(secondTimer);

      const firstResult = await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        mockDto,
      );
      const secondResult = await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        secondDto,
      );

      expect((firstResult as { timerKey: string }).timerKey).toBe(
        buildTimerKey(123, mockDto.npc.name),
      );
      expect((secondResult as { timerKey: string }).timerKey).toBe(
        buildTimerKey(123, secondDto.npc.name),
      );
      expect(mockPrismaService.timer.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: {
            timerId: {
              guildId: "guild1",
              world: "test-world",
              timerKey: buildTimerKey(123, secondDto.npc.name),
            },
          },
        }),
      );
    });
  });

  describe("validateAndCalculateSpawnTimes", () => {
    const baseDto: CreateTimerFromGameClientDto = {
      respBaseSeconds: 3600,
      respawnRandomness: 10,
      world: "test-world",
      npc: {
        id: 123,
        name: "Test Boss",
        prof: "w",
        location: "Test Location",
        wt: 25,
        lvl: 100,
        type: 1,
        icon: "icon.png",
        hpp: 1000,
        x: 100,
        y: 200,
      },
      characterId: "char123",
      accountId: "acc123",
    };

    it("should calculate spawn times from respBaseSeconds", () => {
      const now = new Date();
      const result = validateAndCalculateSpawnTimes(baseDto, now);

      expect(result.minSpawnTime).toBeDefined();
      expect(result.maxSpawnTime).toBeDefined();
      expect(result.maxSpawnTime.getTime()).toBeGreaterThan(
        result.minSpawnTime.getTime(),
      );
    });

    it("should use custom spawn times when provided", () => {
      const customMin = new Date(Date.now() + 3600000);
      const customMax = new Date(Date.now() + 7200000);
      const dto = {
        ...baseDto,
        customMinSpawnTime: customMin,
        customMaxSpawnTime: customMax,
      };

      const result = validateAndCalculateSpawnTimes(
        dto as unknown as CreateTimerFromGameClientDto,
      );

      expect(result.minSpawnTime).toEqual(customMin);
      expect(result.maxSpawnTime).toEqual(customMax);
    });

    it("should throw when maxSpawnTime is before minSpawnTime", () => {
      const customMin = new Date(Date.now() + 7200000);
      const customMax = new Date(Date.now() + 3600000);
      const dto = {
        ...baseDto,
        customMinSpawnTime: customMin,
        customMaxSpawnTime: customMax,
      };

      expect(() =>
        validateAndCalculateSpawnTimes(
          dto as unknown as CreateTimerFromGameClientDto,
        ),
      ).toThrow(BadRequestException);
    });

    it("should throw when spawn time is in the past", () => {
      const customMin = new Date(Date.now() - 3600000);
      const customMax = new Date(Date.now() + 3600000);
      const dto = {
        ...baseDto,
        customMinSpawnTime: customMin,
        customMaxSpawnTime: customMax,
      };

      expect(() =>
        validateAndCalculateSpawnTimes(
          dto as unknown as CreateTimerFromGameClientDto,
        ),
      ).toThrow(BadRequestException);
    });

    it("should throw when spawn window exceeds maximum allowed", () => {
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

      expect(() =>
        validateAndCalculateSpawnTimes(
          dto as unknown as CreateTimerFromGameClientDto,
        ),
      ).toThrow(BadRequestException);
    });

    it("should accept ISO string dates and convert them to Date objects", () => {
      const customMin = new Date(Date.now() + 3600000);
      const customMax = new Date(Date.now() + 7200000);
      const dto = {
        ...baseDto,
        customMinSpawnTime: customMin.toISOString() as unknown as Date,
        customMaxSpawnTime: customMax.toISOString() as unknown as Date,
      };

      const result = validateAndCalculateSpawnTimes(
        dto as unknown as CreateTimerFromGameClientDto,
      );

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

  describe("Cache invalidation", () => {
    const userId = "user123";
    const mockDto: CreateTimerFromGameClientDto = {
      respBaseSeconds: 3600,
      respawnRandomness: 10,
      world: "test-world",
      npc: {
        id: 123,
        name: "Test Boss",
        prof: "w",
        location: "Test Location",
        wt: 25,
        lvl: 100,
        type: 1,
        icon: "icon.png",
        hpp: 1000,
        x: 100,
        y: 200,
      },
      characterId: "char123",
      accountId: "acc123",
    };

    const mockTimer = {
      guildId: "guild1",
      world: "test-world",
      npcId: 123,
      timerKey: buildTimerKey(123, mockDto.npc.name),
      minSpawnTime: new Date(),
      maxSpawnTime: new Date(),
      latestRespBaseSeconds: 3600,
      latestRespawnRandomness: 10,
      createdById: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      npc: mockDto.npc,
      member: { id: 1, ign: "TestUser" },
    };

    it("should invalidate cache when timer is created", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.deleteByPattern.mockResolvedValue(2);
      mockPrismaService.timer.upsert.mockResolvedValue({
        ...mockTimer,
        guildId: "guild1",
      });

      await service.createTimerForGuild(
        "discord123",
        userId,
        "guild1",
        mockDto,
      );

      expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(
        "timer:list:guild1:*",
      );
    });

    it("should invalidate cache when timer is reset", async () => {
      mockRedisService.deleteByPattern.mockResolvedValue(1);
      mockEventTimerHooksService.findActiveEventHeroByNpc.mockResolvedValue(
        null,
      );
      mockPrismaService.timer.findUnique.mockResolvedValue({
        ...mockTimer,
        latestRespBaseSeconds: 3600,
        latestRespawnRandomness: 10,
      });
      mockPrismaService.timer.findMany.mockResolvedValue([
        {
          ...mockTimer,
          latestRespBaseSeconds: 3600,
          latestRespawnRandomness: 10,
        },
      ]);
      mockPrismaService.timer.update.mockResolvedValue(mockTimer);

      await service.resetTimer("discord123", "guild1", "123", {
        world: "test-world",
      });

      expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(
        "timer:list:guild1:*",
      );
    });

    it("should block resetting event timers through generic reset flow", async () => {
      mockPrismaService.timer.findMany.mockResolvedValue([mockTimer]);
      mockEventTimerHooksService.findActiveEventHeroByNpc.mockResolvedValue({
        eventHero: { id: "hero-1", npcId: mockTimer.npcId },
        event: { id: "event-1" },
      });

      await expect(
        service.resetTimer("discord123", "guild1", "123", {
          world: "test-world",
        }),
      ).rejects.toMatchObject({
        response: { message: ErrorKey.EVENT_TIMER_CANNOT_BE_RESET },
      });

      expect(mockRedlock.acquire).not.toHaveBeenCalled();
      expect(mockPrismaService.timer.update).not.toHaveBeenCalled();
      expect(mockRedisService.deleteByPattern).not.toHaveBeenCalled();
    });

    it("should block resetting event timers found by name when hero stores wrong npcId", async () => {
      mockPrismaService.timer.findMany.mockResolvedValue([mockTimer]);
      mockEventTimerHooksService.findActiveEventHeroByNpc.mockResolvedValue({
        eventHero: { id: "hero-1", npcId: 999 },
        event: { id: "event-1" },
      });

      await expect(
        service.resetTimer("discord123", "guild1", "123", {
          world: "test-world",
        }),
      ).rejects.toMatchObject({
        response: { message: ErrorKey.EVENT_TIMER_CANNOT_BE_RESET },
      });

      expect(mockRedlock.acquire).not.toHaveBeenCalled();
      expect(mockPrismaService.timer.update).not.toHaveBeenCalled();
      expect(mockRedisService.deleteByPattern).not.toHaveBeenCalled();
    });

    it("should invalidate cache when timer is deleted", async () => {
      mockRedisService.deleteByPattern.mockResolvedValue(1);
      mockEventTimerHooksService.findActiveEventHeroByNpc.mockResolvedValue(
        null,
      );
      mockPrismaService.timer.findMany.mockResolvedValue([mockTimer]);
      mockPrismaService.timer.delete.mockResolvedValue(mockTimer);

      await service.deleteTimer("guild1", "123", "test-world");

      expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(
        "timer:list:guild1:*",
      );
    });

    it("should block deleting event timers through generic delete flow", async () => {
      mockPrismaService.timer.findMany.mockResolvedValue([mockTimer]);
      mockEventTimerHooksService.findActiveEventHeroByNpc.mockResolvedValue({
        eventHero: { id: "hero-1", npcId: mockTimer.npcId },
        event: { id: "event-1" },
      });

      await expect(
        service.deleteTimer("guild1", "123", "test-world"),
      ).rejects.toMatchObject({
        response: { message: ErrorKey.EVENT_TIMER_MUST_USE_EVENT_CLOSE },
      });

      expect(mockPrismaService.timer.delete).not.toHaveBeenCalled();
      expect(mockRedisService.deleteByPattern).not.toHaveBeenCalled();
    });

    it("should block deleting event timers found by name when hero stores wrong npcId", async () => {
      mockPrismaService.timer.findMany.mockResolvedValue([mockTimer]);
      mockEventTimerHooksService.findActiveEventHeroByNpc.mockResolvedValue({
        eventHero: { id: "hero-1", npcId: 999 },
        event: { id: "event-1" },
      });

      await expect(
        service.deleteTimer("guild1", "123", "test-world"),
      ).rejects.toMatchObject({
        response: { message: ErrorKey.EVENT_TIMER_MUST_USE_EVENT_CLOSE },
      });

      expect(mockPrismaService.timer.delete).not.toHaveBeenCalled();
      expect(mockRedisService.deleteByPattern).not.toHaveBeenCalled();
    });
  });

  describe("createManualTimer", () => {
    it("should persist provided NPC level and profession", async () => {
      mockPrismaService.timer.create.mockResolvedValue({
        guildId: "guild1",
        world: "test-world",
        npcId: 123,
        timerKey: buildTimerKey(123, "Test Boss"),
        minSpawnTime: new Date(),
        maxSpawnTime: new Date(),
        latestRespBaseSeconds: 90,
        latestRespawnRandomness: 33,
        wasReset: false,
        createdById: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        npc: {
          id: 123,
          name: "Test Boss",
          prof: "w",
          location: "",
          wt: "",
          lvl: 120,
          type: "",
          icon: "",
          margonemType: 1,
        },
        member: null,
      });

      await service.createManualTimer("discord123", "guild1", {
        name: "Test Boss",
        minSeconds: 60,
        maxSeconds: 120,
        lvl: 120,
        prof: "w",
        world: "test-world",
      });

      expect(mockPrismaService.timer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            npc: expect.objectContaining({
              name: "Test Boss",
              lvl: 120,
              prof: "w",
            }),
          }),
        }),
      );
    });

    it("should fall back to empty manual timer NPC metadata", async () => {
      mockPrismaService.timer.create.mockResolvedValue({
        guildId: "guild1",
        world: "test-world",
        npcId: 123,
        timerKey: buildTimerKey(123, "Custom Boss"),
        minSpawnTime: new Date(),
        maxSpawnTime: new Date(),
        latestRespBaseSeconds: 90,
        latestRespawnRandomness: 33,
        wasReset: false,
        createdById: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        npc: {
          id: 123,
          name: "Custom Boss",
          prof: "",
          location: "",
          wt: "",
          lvl: 0,
          type: "",
          icon: "",
          margonemType: 1,
        },
        member: null,
      });

      await service.createManualTimer("discord123", "guild1", {
        name: "Custom Boss",
        minSeconds: 60,
        maxSeconds: 120,
        world: "test-world",
      });

      expect(mockPrismaService.timer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            npc: expect.objectContaining({
              name: "Custom Boss",
              lvl: 0,
              prof: "",
            }),
          }),
        }),
      );
    });
  });

  describe("searchNpcsWithTimerData", () => {
    const mockTimersQueryResult = [
      {
        npcId: 123,
        timerKey: buildTimerKey(123, "Test Boss"),
        npc: {
          name: "Test Boss",
          lvl: 100,
          type: "ELITE",
          prof: "w",
          location: "Test Location",
          wt: 25,
          icon: "test-icon.png",
        },
        latestRespBaseSeconds: 3600,
        latestRespawnRandomness: 10,
      },
      {
        npcId: 124,
        timerKey: buildTimerKey(124, "Test Elite"),
        npc: {
          name: "Test Elite",
          lvl: 150,
          type: "ELITE2",
          prof: "m",
          location: "Test Cave",
          wt: 30,
          icon: "elite-icon.png",
        },
        latestRespBaseSeconds: 7200,
        latestRespawnRandomness: 15,
      },
    ];

    it("should search NPCs with timer data", async () => {
      mockPrismaService.$queryRaw = mockFn<
        () => Promise<unknown>
      >().mockResolvedValue(mockTimersQueryResult);

      const result = await service.searchNpcsWithTimerData(
        "guild1",
        "test-world",
        "Test",
        10,
      );

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        npcId: 123,
        timerKey: buildTimerKey(123, "Test Boss"),
        name: "Test Boss",
        lvl: 100,
        type: "ELITE",
        prof: "w",
        location: "Test Location",
        wt: 25,
        icon: "test-icon.png",
        latestRespBaseSeconds: 3600,
        latestRespawnRandomness: 10,
      });
    });

    it("should handle empty search results", async () => {
      mockPrismaService.$queryRaw = mockFn().mockResolvedValue([]);

      const result = await service.searchNpcsWithTimerData(
        "guild1",
        "test-world",
        "NonExistentNPC",
        10,
      );

      expect(result).toHaveLength(0);
    });

    it("should filter out null results from invalid NPC data", async () => {
      const invalidTimerData = [
        {
          npcId: 125,
          npc: null,
          latestRespBaseSeconds: 1800,
          latestRespawnRandomness: 5,
        },
      ];

      mockPrismaService.$queryRaw =
        mockFn().mockResolvedValue(invalidTimerData);

      const result = await service.searchNpcsWithTimerData(
        "guild1",
        "test-world",
        "Invalid",
        10,
      );

      expect(result).toHaveLength(0);
    });

    it("should use default limit when not provided", async () => {
      mockPrismaService.$queryRaw = mockFn<
        () => Promise<unknown>
      >().mockResolvedValue(mockTimersQueryResult);

      await service.searchNpcsWithTimerData("guild1", "test-world", "Test");

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });
});
