import type { Mock } from "vitest";
import { mockFn } from "#src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import { KillsService } from "./kills.service.js";
import { KillsRepository } from "./kills.repository.js";
import { RedisService } from "@lootlog/nest-shared/redis";
import { UserLootlogConfigService } from "#src/user-lootlog-config/user-lootlog-config.service";
import { GuildsService } from "#src/guilds/guilds.service";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
import type { CreateKillDto } from "./dto/create-kill.dto.js";
import {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from "./dto/get-kill-stats.dto.js";
import { GetMemberKillsDto } from "./dto/get-member-kills.dto.js";
import {
  createAccessPolicy,
  type Capability,
} from "@lootlog/domain/access-policy";

type Role = typeof roleTable.$inferSelect;

const policy = (...capabilities: Capability[]) =>
  createAccessPolicy({ capabilities });

describe("KillsService", () => {
  let service: KillsService;
  let databaseCalls: {
    userKillStats: {
      upsert: Mock;
      findMany: Mock;
    };
    userKillStatsBucket: {
      upsert: Mock;
      findMany: Mock;
    };
    npcKillStats: {
      upsert: Mock;
      findMany: Mock;
      groupBy: Mock;
    };
    npcKillStatsBucket: {
      upsert: Mock;
      findMany: Mock;
      groupBy: Mock;
    };
    guildKillSummary: {
      upsert: Mock;
      findMany: Mock;
      findFirst: Mock;
      groupBy: Mock;
    };
    guildKillSummaryBucket: {
      upsert: Mock;
      findMany: Mock;
      groupBy: Mock;
    };
    member: {
      findUnique: Mock;
      findFirst: Mock;
      findMany: Mock;
    };
  };
  let redisService: {
    setNX: Mock;
    getJson: Mock;
    getOrSetJson: Mock;
    deleteByPattern: Mock;
  };
  let userLootlogConfigService: {
    getLootlogCharacterConfig: Mock;
  };
  let guildsService: {
    getGuildsForRequiredPermissions: Mock;
  };
  let logger: {
    log: Mock;
    error: Mock;
    warn: Mock;
  };

  const mockCreateKillDto: CreateKillDto = {
    world: "pandora",
    npc: {
      id: -12345,
      name: "Test Boss",
      lvl: 300,
      prof: "w",
      wt: 85,
      icon: "boss.gif",
    },
    characterId: "67890",
    accountId: "11111",
  };

  const createMockRole = (overrides: Partial<Role> = {}): Role => ({
    id: "role1",
    name: "Test Role",
    color: 16711680,
    position: 1,
    permissions: [Permission.LOOTLOG_LOOTS_READ],
    lvlRangeFrom: 0,
    lvlRangeTo: 500,
    guildId: "guild1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const mockDatabaseCalls = {
      userKillStats: {
        upsert: mockFn(),
        findMany: mockFn(),
      },
      userKillStatsBucket: {
        upsert: mockFn(),
        findMany: mockFn(),
      },
      npcKillStats: {
        upsert: mockFn(),
        findMany: mockFn(),
        groupBy: mockFn(),
      },
      npcKillStatsBucket: {
        upsert: mockFn(),
        findMany: mockFn(),
        groupBy: mockFn(),
      },
      guildKillSummary: {
        upsert: mockFn(),
        findMany: mockFn(),
        findFirst: mockFn(),
        groupBy: mockFn(),
      },
      guildKillSummaryBucket: {
        upsert: mockFn(),
        findMany: mockFn(),
        groupBy: mockFn(),
      },
      member: {
        findUnique: mockFn(),
        findFirst: mockFn(),
        findMany: mockFn().mockResolvedValue([]),
      },
    };

    const mockKillsRepository = {
      incrementUser: mockFn().mockImplementation((input) =>
        mockDatabaseCalls.userKillStats.upsert({
          where: {
            userId_world_npcId: {
              userId: input.userId,
              world: input.world,
              npcId: input.npcId,
            },
          },
          create: { ...input, totalKills: 1 },
          update: {
            totalKills: { increment: 1 },
            lastKilledAt: input.lastKilledAt,
            npcName: input.npcName,
            npcLvl: input.npcLvl,
            npcProf: input.npcProf,
            npcIcon: input.npcIcon,
          },
        }),
      ),
      incrementUserBucket: mockFn().mockImplementation((input) =>
        mockDatabaseCalls.userKillStatsBucket.upsert({
          where: {
            userId_world_npcId_periodStart: {
              userId: input.userId,
              world: input.world,
              npcId: input.npcId,
              periodStart: input.periodStart,
            },
          },
          create: { ...input, totalKills: 1 },
          update: {
            totalKills: { increment: 1 },
            lastKilledAt: input.lastKilledAt,
            npcName: input.npcName,
            npcLvl: input.npcLvl,
            npcProf: input.npcProf,
            npcIcon: input.npcIcon,
          },
        }),
      ),
      incrementMember: mockFn().mockImplementation((input) =>
        mockDatabaseCalls.npcKillStats.upsert({
          where: {
            guildId_memberId_world_npcId: {
              guildId: input.guildId,
              memberId: input.memberId,
              world: input.world,
              npcId: input.npcId,
            },
          },
          create: { ...input, memberKills: 1 },
          update: {
            memberKills: { increment: 1 },
            lastKilledAt: input.lastKilledAt,
            npcName: input.npcName,
            npcLvl: input.npcLvl,
            npcProf: input.npcProf,
            npcIcon: input.npcIcon,
          },
        }),
      ),
      incrementMemberBucket: mockFn().mockImplementation((input) =>
        mockDatabaseCalls.npcKillStatsBucket.upsert({
          where: {
            guildId_memberId_world_npcId_periodStart: {
              guildId: input.guildId,
              memberId: input.memberId,
              world: input.world,
              npcId: input.npcId,
              periodStart: input.periodStart,
            },
          },
          create: { ...input, memberKills: 1 },
          update: {
            memberKills: { increment: 1 },
            lastKilledAt: input.lastKilledAt,
            npcName: input.npcName,
            npcLvl: input.npcLvl,
            npcProf: input.npcProf,
            npcIcon: input.npcIcon,
          },
        }),
      ),
      incrementGuild: mockFn().mockImplementation((input) =>
        mockDatabaseCalls.guildKillSummary.upsert({
          where: {
            guildId_world_npcId: {
              guildId: input.guildId,
              world: input.world,
              npcId: input.npcId,
            },
          },
          create: { ...input, uniqueKills: 1 },
          update: {
            uniqueKills: { increment: 1 },
            lastKilledAt: input.lastKilledAt,
            npcName: input.npcName,
            npcLvl: input.npcLvl,
            npcProf: input.npcProf,
            npcIcon: input.npcIcon,
          },
        }),
      ),
      incrementGuildBucket: mockFn().mockImplementation((input) =>
        mockDatabaseCalls.guildKillSummaryBucket.upsert({
          where: {
            guildId_world_npcId_periodStart: {
              guildId: input.guildId,
              world: input.world,
              npcId: input.npcId,
              periodStart: input.periodStart,
            },
          },
          create: { ...input, uniqueKills: 1 },
          update: {
            uniqueKills: { increment: 1 },
            lastKilledAt: input.lastKilledAt,
            npcName: input.npcName,
            npcLvl: input.npcLvl,
            npcProf: input.npcProf,
            npcIcon: input.npcIcon,
          },
        }),
      ),
      findMembersByGuilds: mockFn().mockImplementation((userId, guildIds) =>
        mockDatabaseCalls.member.findMany({
          where: { userId, guildId: { in: guildIds } },
        }),
      ),
      findMembers: mockFn().mockImplementation((memberIds) =>
        mockDatabaseCalls.member.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, name: true, avatar: true, userId: true },
        }),
      ),
      findMember: mockFn().mockImplementation((guildId, memberId) =>
        mockDatabaseCalls.member.findFirst({
          where: { id: memberId, guildId },
        }),
      ),
      findUserStats: mockFn().mockImplementation((where, bucket) =>
        bucket
          ? mockDatabaseCalls.userKillStatsBucket.findMany({ where })
          : mockDatabaseCalls.userKillStats.findMany({ where }),
      ),
      findMemberStats: mockFn().mockImplementation(
        (where, bucket, includeMember) => {
          const query = includeMember
            ? { where, include: { member: true } }
            : { where };
          return bucket
            ? mockDatabaseCalls.npcKillStatsBucket.findMany(query)
            : mockDatabaseCalls.npcKillStats.findMany(query);
        },
      ),
      findGuildSummaries: mockFn().mockImplementation((where, bucket) =>
        bucket
          ? mockDatabaseCalls.guildKillSummaryBucket.findMany({ where })
          : mockDatabaseCalls.guildKillSummary.findMany({ where }),
      ),
      groupMemberStats: mockFn().mockImplementation((where, bucket) =>
        bucket
          ? mockDatabaseCalls.npcKillStatsBucket.groupBy({
              by: ["memberId", "npcType"],
              where,
              _sum: { memberKills: true },
            })
          : mockDatabaseCalls.npcKillStats.groupBy({
              by: ["memberId", "npcType"],
              where,
              _sum: { memberKills: true },
            }),
      ),
      groupGuildSummaries: mockFn().mockImplementation((where, bucket) =>
        bucket
          ? mockDatabaseCalls.guildKillSummaryBucket.groupBy({
              by: ["npcType"],
              where,
              _sum: { uniqueKills: true },
            })
          : mockDatabaseCalls.guildKillSummary.groupBy({
              by: ["npcType"],
              where,
              _sum: { uniqueKills: true },
            }),
      ),
    };

    const mockRedisService = {
      setNX: mockFn().mockResolvedValue(true),
      getJson: mockFn().mockResolvedValue(null),
      getOrSetJson: mockFn().mockImplementation(
        ({ factory }: { factory: () => Promise<unknown> }) => factory(),
      ),
      deleteByPattern: mockFn().mockResolvedValue(0),
    };

    const mockUserLootlogConfigService = {
      getLootlogCharacterConfig: mockFn(),
    };
    const mockGuildsService = {
      getGuildsForRequiredPermissions: mockFn().mockResolvedValue([
        { id: "guild1" },
        { id: "guild2" },
        { id: "guild3" },
      ]),
    };

    const mockLogger = {
      log: mockFn(),
      error: mockFn(),
      warn: mockFn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KillsService,
        { provide: KillsRepository, useValue: mockKillsRepository },
        { provide: RedisService, useValue: mockRedisService },
        {
          provide: UserLootlogConfigService,
          useValue: mockUserLootlogConfigService,
        },
        {
          provide: GuildsService,
          useValue: mockGuildsService,
        },
        { provide: APPLICATION_LOGGER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<KillsService>(KillsService);
    databaseCalls = mockDatabaseCalls;
    redisService = module.get(RedisService);
    userLootlogConfigService = module.get(UserLootlogConfigService);
    guildsService = module.get(GuildsService);
    logger = module.get(APPLICATION_LOGGER);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });
  });

  describe("createKill", () => {
    const discordId = "discord123";

    it("should always save to UserKillStats when not deduplicated", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      await service.createKill(discordId, mockCreateKillDto);

      expect(databaseCalls.userKillStats.upsert).toHaveBeenCalledWith({
        where: {
          userId_world_npcId: {
            userId: discordId,
            world: "pandora",
            npcId: 12345,
          },
        },
        create: expect.objectContaining({
          userId: discordId,
          world: "pandora",
          npcId: 12345,
          npcName: "Test Boss",
          npcType: NpcType.HERO,
          totalKills: 1,
        }),
        update: expect.objectContaining({
          totalKills: { increment: 1 },
        }),
      });
      expect(databaseCalls.userKillStatsBucket.upsert).toHaveBeenCalledWith({
        where: {
          userId_world_npcId_periodStart: {
            userId: discordId,
            world: "pandora",
            npcId: 12345,
            periodStart: expect.any(Date),
          },
        },
        create: expect.objectContaining({
          userId: discordId,
          world: "pandora",
          npcId: 12345,
          npcName: "Test Boss",
          npcType: NpcType.HERO,
          totalKills: 1,
          periodStart: expect.any(Date),
        }),
        update: expect.objectContaining({
          totalKills: { increment: 1 },
        }),
      });
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        `kill-stats:user-*:${discordId}:*`,
      );
    });

    it("should return deduplicated: true when user already reported this kill", async () => {
      redisService.setNX.mockResolvedValue(false);
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(result).toEqual({ deduplicated: true, updated: 0 });
      expect(databaseCalls.userKillStats.upsert).not.toHaveBeenCalled();
      expect(redisService.deleteByPattern).not.toHaveBeenCalled();
    });

    it("should return updated: 0 when no guilds are configured", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(result).toEqual({ updated: 0 });
      expect(databaseCalls.npcKillStats.upsert).not.toHaveBeenCalled();
    });

    it("should save to NpcKillStats and GuildKillSummary for each configured guild", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1", "guild2"],
      });
      databaseCalls.member.findMany.mockResolvedValue([
        { id: 1, guildId: "guild1" },
        { id: 2, guildId: "guild2" },
      ]);
      databaseCalls.npcKillStats.upsert.mockResolvedValue({});
      databaseCalls.guildKillSummary.upsert.mockResolvedValue({});

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(
        guildsService.getGuildsForRequiredPermissions,
      ).toHaveBeenCalledWith(discordId, [Permission.LOOTLOG_LOOTS_WRITE]);
      expect(databaseCalls.member.findMany).toHaveBeenCalledTimes(1);
      expect(databaseCalls.npcKillStats.upsert).toHaveBeenCalledTimes(2);
      expect(databaseCalls.npcKillStatsBucket.upsert).toHaveBeenCalledTimes(2);
      expect(databaseCalls.guildKillSummary.upsert).toHaveBeenCalledTimes(2);
      expect(databaseCalls.guildKillSummaryBucket.upsert).toHaveBeenCalledTimes(
        2,
      );
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        `kill-stats:user-*:${discordId}:*`,
      );
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        "kill-stats:guild-*:guild1:*",
      );
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        "kill-stats:member-kills:guild1:*",
      );
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        "kill-stats:guild-*:guild2:*",
      );
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        "kill-stats:member-kills:guild2:*",
      );
      expect(result).toEqual({ updated: 2 });
    });

    it("should skip guilds where member is not found", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1", "guild2"],
      });
      databaseCalls.member.findMany.mockResolvedValue([
        { id: 1, guildId: "guild1" },
      ]);
      databaseCalls.npcKillStats.upsert.mockResolvedValue({});
      databaseCalls.guildKillSummary.upsert.mockResolvedValue({});

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(databaseCalls.npcKillStats.upsert).toHaveBeenCalledTimes(1);
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        "kill-stats:guild-*:guild1:*",
      );
      expect(redisService.deleteByPattern).not.toHaveBeenCalledWith(
        "kill-stats:guild-*:guild2:*",
      );
      expect(result).toEqual({ updated: 1 });
    });

    it("should skip configured guilds where user no longer has loot write access", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1", "guild2"],
      });
      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1" },
      ]);
      databaseCalls.member.findMany.mockResolvedValue([
        { id: 1, guildId: "guild1" },
      ]);
      databaseCalls.npcKillStats.upsert.mockResolvedValue({});
      databaseCalls.guildKillSummary.upsert.mockResolvedValue({});

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(databaseCalls.member.findMany).toHaveBeenCalledWith({
        where: { userId: discordId, guildId: { in: ["guild1"] } },
      });
      expect(databaseCalls.npcKillStats.upsert).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ updated: 1 });
    });

    it("should process each guild only once", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1", "guild2", "guild3"],
      });
      databaseCalls.member.findMany.mockResolvedValue([
        { id: 1, guildId: "guild1" },
        { id: 1, guildId: "guild2" },
        { id: 1, guildId: "guild3" },
      ]);
      databaseCalls.npcKillStats.upsert.mockResolvedValue({});
      databaseCalls.guildKillSummary.upsert.mockResolvedValue({});

      await service.createKill(discordId, mockCreateKillDto);

      expect(databaseCalls.member.findMany).toHaveBeenCalledTimes(1);
    });

    it("should handle UserKillStats upsert errors gracefully", async () => {
      databaseCalls.userKillStats.upsert.mockRejectedValue(
        new Error("DB error"),
      );
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(logger.error).toHaveBeenCalled();
      expect(result).toEqual({ updated: 0 });
    });

    it("should handle NpcKillStats upsert errors gracefully", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1"],
      });
      databaseCalls.member.findMany.mockResolvedValue([
        { id: 1, guildId: "guild1" },
      ]);
      databaseCalls.npcKillStats.upsert.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(logger.error).toHaveBeenCalled();
      expect(result).toEqual({ updated: 0 });
    });

    it("should convert negative NPC ID to positive", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      await service.createKill(discordId, mockCreateKillDto);

      expect(databaseCalls.userKillStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_world_npcId: expect.objectContaining({
              npcId: 12345,
            }),
          }),
        }),
      );
    });

    it("should not increment GuildKillSummary if guild already reported this kill", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1"],
      });
      databaseCalls.member.findMany.mockResolvedValue([
        { id: 1, guildId: "guild1" },
      ]);
      databaseCalls.npcKillStats.upsert.mockResolvedValue({});
      // First setNX call (user dedup) returns true, second (guild dedup) returns false
      redisService.setNX
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await service.createKill(discordId, mockCreateKillDto);

      expect(databaseCalls.npcKillStats.upsert).toHaveBeenCalledTimes(1);
      expect(databaseCalls.guildKillSummary.upsert).not.toHaveBeenCalled();
      expect(
        databaseCalls.guildKillSummaryBucket.upsert,
      ).not.toHaveBeenCalled();
    });

    describe("COLOSSUS stable ID handling", () => {
      const colossusKillDto: CreateKillDto = {
        world: "pandora",
        npc: {
          id: 999999,
          name: "Wielki Kolos",
          lvl: 350,
          prof: "w",
          wt: 95, // COLOSSUS type (wt > 89)
          icon: "colossus.gif",
        },
        characterId: "67890",
        accountId: "11111",
      };

      it("should use a stable negative ID for COLOSSUS NPCs", async () => {
        userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
          null,
        );

        await service.createKill(discordId, colossusKillDto);

        const upsertCall = databaseCalls.userKillStats.upsert.mock.calls[0][0];
        expect(upsertCall.where.userId_world_npcId.npcId).toBeLessThan(0);
        expect(upsertCall.create.npcId).toBeLessThan(0);
        expect(upsertCall.create.npcType).toBe(NpcType.COLOSSUS);
      });

      it("should use the same stable ID for COLOSSUS with same name but different spawn IDs", async () => {
        userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
          null,
        );

        // First kill with spawn ID 999999
        await service.createKill(discordId, colossusKillDto);
        const firstNpcId =
          databaseCalls.userKillStats.upsert.mock.calls[0][0].create.npcId;

        vi.clearAllMocks();
        redisService.setNX.mockResolvedValue(true);

        // Second kill with different spawn ID but same name
        const colossusKillDto2: CreateKillDto = {
          ...colossusKillDto,
          npc: {
            ...colossusKillDto.npc,
            id: 888888, // Different spawn ID
          },
        };

        await service.createKill(discordId, colossusKillDto2);
        const secondNpcId =
          databaseCalls.userKillStats.upsert.mock.calls[0][0].create.npcId;

        expect(firstNpcId).toBe(secondNpcId);
      });

      it("should use different stable IDs for different COLOSSUS names", async () => {
        userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
          null,
        );

        await service.createKill(discordId, colossusKillDto);
        const firstNpcId =
          databaseCalls.userKillStats.upsert.mock.calls[0][0].create.npcId;

        vi.clearAllMocks();
        redisService.setNX.mockResolvedValue(true);

        const colossusKillDto2: CreateKillDto = {
          ...colossusKillDto,
          npc: {
            ...colossusKillDto.npc,
            name: "Inny Kolos", // Different name
          },
        };

        await service.createKill(discordId, colossusKillDto2);
        const secondNpcId =
          databaseCalls.userKillStats.upsert.mock.calls[0][0].create.npcId;

        expect(firstNpcId).not.toBe(secondNpcId);
      });

      it("should use stable ID for Redis dedup key with COLOSSUS", async () => {
        userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
          null,
        );

        await service.createKill(discordId, colossusKillDto);

        const setNXCall = redisService.setNX.mock.calls[0];
        const dedupKey = setNXCall[0] as string;

        // The dedup key should contain the stable (negative) ID, not the spawn ID
        expect(dedupKey).toContain(":" + String(dedupKey.split(":").pop()));
        expect(dedupKey).not.toContain(":999999");
      });
    });
  });

  describe("getGuildKillStats", () => {
    const guildId = "guild123";

    const mockMemberStats = [
      {
        memberId: 1,
        npcType: NpcType.HERO,
        _sum: { memberKills: 50 },
      },
      {
        memberId: 1,
        npcType: NpcType.TITAN,
        _sum: { memberKills: 20 },
      },
      {
        memberId: 2,
        npcType: NpcType.HERO,
        _sum: { memberKills: 30 },
      },
    ];

    const mockGuildSummary = [
      { npcType: NpcType.HERO, _sum: { uniqueKills: 40 } },
      { npcType: NpcType.TITAN, _sum: { uniqueKills: 15 } },
    ];

    const mockMembers = [
      { id: 1, name: "Player1", avatar: null, userId: "user1" },
      { id: 2, name: "Player2", avatar: null, userId: "user2" },
    ];

    it("should return aggregated kill stats", async () => {
      databaseCalls.npcKillStats.groupBy.mockResolvedValue(mockMemberStats);
      databaseCalls.guildKillSummary.groupBy.mockResolvedValue(
        mockGuildSummary,
      );
      databaseCalls.member.findMany.mockResolvedValue(mockMembers);
      const query = new GetGuildKillStatsDto();

      const result = await service.getGuildKillStats(
        guildId,
        policy(),
        [],
        query,
      );

      expect(result.overview.guildUniqueKills).toBe(55);
      expect(result.overview.totalMemberParticipations).toBe(100);
      expect(result.overview.killsByType).toEqual({
        [NpcType.HERO]: 40,
        [NpcType.TITAN]: 15,
      });
      expect(result.overview.participationsByType).toEqual({
        [NpcType.HERO]: 80,
        [NpcType.TITAN]: 20,
      });
      expect(result.memberRanking).toHaveLength(2);
      expect(result.memberRanking[0].memberName).toBe("Player1");
      expect(result.memberRanking[0].totalParticipations).toBe(70);
    });

    it("should return cached guild kill stats without querying stats tables", async () => {
      const cachedStats = {
        overview: {
          guildUniqueKills: 1,
          totalMemberParticipations: 2,
          killsByType: { [NpcType.HERO]: 1 },
          participationsByType: { [NpcType.HERO]: 2 },
        },
        memberRanking: [],
      };
      redisService.getJson.mockResolvedValueOnce(cachedStats);
      const query = new GetGuildKillStatsDto();

      const result = await service.getGuildKillStats(
        guildId,
        policy(),
        [],
        query,
      );

      expect(result).toEqual(cachedStats);
      expect(redisService.getOrSetJson).not.toHaveBeenCalled();
      expect(databaseCalls.npcKillStats.findMany).not.toHaveBeenCalled();
      expect(databaseCalls.npcKillStats.groupBy).not.toHaveBeenCalled();
      expect(databaseCalls.guildKillSummary.findMany).not.toHaveBeenCalled();
      expect(databaseCalls.guildKillSummary.groupBy).not.toHaveBeenCalled();
    });

    it("should use bucket tables when period is provided", async () => {
      databaseCalls.npcKillStatsBucket.groupBy.mockResolvedValue(
        mockMemberStats,
      );
      databaseCalls.guildKillSummaryBucket.groupBy.mockResolvedValue(
        mockGuildSummary,
      );
      databaseCalls.member.findMany.mockResolvedValue(mockMembers);
      const query = new GetGuildKillStatsDto();
      query.period = "24h";

      const result = await service.getGuildKillStats(
        guildId,
        policy(),
        [],
        query,
      );

      expect(databaseCalls.npcKillStats.findMany).not.toHaveBeenCalled();
      expect(databaseCalls.guildKillSummary.findMany).not.toHaveBeenCalled();
      expect(databaseCalls.npcKillStatsBucket.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            periodStart: { gte: expect.any(Date) },
          }),
        }),
      );
      expect(result.overview.guildUniqueKills).toBe(55);
    });

    it("should filter by NPC type when provided", async () => {
      databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
      databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
      const query = new GetGuildKillStatsDto();
      query.npcTypes = [NpcType.TITAN];

      await service.getGuildKillStats(guildId, policy(), [], query);

      expect(databaseCalls.npcKillStats.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            npcType: { in: [NpcType.TITAN] },
          }),
        }),
      );
    });

    it("should filter by level range when provided", async () => {
      databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
      databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
      const query = new GetGuildKillStatsDto();
      query.minLvl = 100;
      query.maxLvl = 300;

      await service.getGuildKillStats(guildId, policy(), [], query);

      expect(databaseCalls.npcKillStats.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            npcLvl: { gte: 100, lte: 300 },
          }),
        }),
      );
    });

    it("should ignore zero level range values from unselected filters", async () => {
      databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
      databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
      const query = new GetGuildKillStatsDto();
      query.minLvl = 0;
      query.maxLvl = 0;

      await service.getGuildKillStats(guildId, policy(), [], query);

      expect(databaseCalls.npcKillStats.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            npcLvl: expect.anything(),
          }),
        }),
      );
    });

    it("should ignore zero level range values for member kill stats", async () => {
      databaseCalls.member.findFirst.mockResolvedValue({
        id: 1,
        guildId,
        name: "Player1",
        avatar: null,
        userId: "user1",
      });
      databaseCalls.npcKillStats.findMany.mockResolvedValue([
        {
          memberId: 1,
          npcId: 100,
          npcName: "Boss",
          npcType: NpcType.HERO,
          npcLvl: 300,
          npcProf: "w",
          npcIcon: null,
          memberKills: 3,
        },
      ]);
      const query = new GetMemberKillsDto();
      query.minLvl = 0;
      query.maxLvl = 0;

      const result = await service.getMemberKills(
        guildId,
        1,
        policy(),
        [],
        query,
      );

      expect(databaseCalls.npcKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            npcLvl: expect.anything(),
          }),
        }),
      );
      expect(result?.overview.totalParticipations).toBe(3);
    });

    describe("permission filtering", () => {
      it("should not apply visibility filter for administrative users", async () => {
        databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
        databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const accessPolicy = policy(Permission.OWNER);

        await service.getGuildKillStats(guildId, accessPolicy, [], query);

        expect(databaseCalls.npcKillStats.groupBy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              OR: expect.anything(),
            }),
          }),
        );
      });

      it("should not apply visibility filter when no roles provided", async () => {
        databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
        databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();

        await service.getGuildKillStats(guildId, policy(), [], query);

        expect(databaseCalls.npcKillStats.groupBy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              OR: expect.anything(),
            }),
          }),
        );
      });

      it("should filter out TITANs when role lacks TITANS_READ permission", async () => {
        databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
        databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [Permission.LOOTLOG_LOOTS_READ],
        });

        await service.getGuildKillStats(guildId, policy(), [role], query);

        expect(databaseCalls.npcKillStats.groupBy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                expect.objectContaining({
                  AND: expect.arrayContaining([
                    { npcType: { not: NpcType.TITAN } },
                  ]),
                }),
              ],
            }),
          }),
        );
      });

      it("should allow TITANs when role has TITANS_READ permission", async () => {
        databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
        databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_TITANS_READ,
          ],
        });

        await service.getGuildKillStats(guildId, policy(), [role], query);

        const call = databaseCalls.npcKillStats.groupBy.mock.calls[0][0];
        const andConditions = call.where.OR?.[0]?.AND || [];
        const hasTitanFilter = andConditions.some(
          (c: { npcType?: { not?: NpcType } }) =>
            c.npcType?.not === NpcType.TITAN,
        );
        expect(hasTitanFilter).toBe(false);
      });

      it("should filter out HEROes when role lacks HEROES_READ permission", async () => {
        databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
        databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [Permission.LOOTLOG_LOOTS_READ],
        });

        await service.getGuildKillStats(guildId, policy(), [role], query);

        expect(databaseCalls.npcKillStats.groupBy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                expect.objectContaining({
                  AND: expect.arrayContaining([
                    { npcType: { notIn: [NpcType.HERO, NpcType.EVENT_HERO] } },
                  ]),
                }),
              ],
            }),
          }),
        );
      });

      it("should allow HEROes when role has HEROES_READ permission", async () => {
        databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
        databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_HEROES_READ,
          ],
        });

        await service.getGuildKillStats(guildId, policy(), [role], query);

        const call = databaseCalls.npcKillStats.groupBy.mock.calls[0][0];
        const andConditions = call.where.OR?.[0]?.AND || [];
        const hasHeroFilter = andConditions.some(
          (c: { npcType?: { notIn?: NpcType[] } }) =>
            c.npcType?.notIn?.includes(NpcType.HERO) ||
            c.npcType?.notIn?.includes(NpcType.EVENT_HERO),
        );
        expect(hasHeroFilter).toBe(false);
      });

      it("should apply level range filter from role", async () => {
        databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
        databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          lvlRangeFrom: 100,
          lvlRangeTo: 300,
        });

        await service.getGuildKillStats(guildId, policy(), [role], query);

        expect(databaseCalls.npcKillStats.groupBy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                expect.objectContaining({
                  AND: expect.arrayContaining([
                    { npcLvl: { gte: 100 } },
                    { npcLvl: { lte: 300 } },
                  ]),
                }),
              ],
            }),
          }),
        );
      });

      it("should combine visibility from multiple roles with OR", async () => {
        databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
        databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role1 = createMockRole({
          id: "role1",
          permissions: [Permission.LOOTLOG_LOOTS_READ],
          lvlRangeFrom: 0,
          lvlRangeTo: 200,
        });
        const role2 = createMockRole({
          id: "role2",
          permissions: [
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_TITANS_READ,
          ],
          lvlRangeFrom: 200,
          lvlRangeTo: 500,
        });

        await service.getGuildKillStats(
          guildId,
          policy(),
          [role1, role2],
          query,
        );

        const call = databaseCalls.npcKillStats.groupBy.mock.calls[0][0];
        expect(call.where.OR).toHaveLength(2);
      });

      it("should skip roles without LOOTLOG_LOOTS_READ permission", async () => {
        databaseCalls.npcKillStats.groupBy.mockResolvedValue([]);
        databaseCalls.guildKillSummary.groupBy.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role1 = createMockRole({
          id: "role1",
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        });
        const role2 = createMockRole({
          id: "role2",
          permissions: [Permission.LOOTLOG_LOOTS_READ],
        });

        await service.getGuildKillStats(
          guildId,
          policy(),
          [role1, role2],
          query,
        );

        const call = databaseCalls.npcKillStats.groupBy.mock.calls[0][0];
        expect(call.where.OR).toHaveLength(1);
      });
    });
  });

  describe("getUserKillStats", () => {
    const discordId = "discord123";

    const mockUserStats = [
      {
        world: "pandora",
        npcId: 999,
        npcName: "Boss1",
        npcType: NpcType.HERO,
        npcLvl: 300,
        npcProf: "w",
        npcIcon: "boss.gif",
        totalKills: 50,
      },
      {
        world: "tempest",
        npcId: 888,
        npcName: "Boss2",
        npcType: NpcType.TITAN,
        npcLvl: 400,
        npcProf: null,
        npcIcon: "titan.gif",
        totalKills: 20,
      },
      {
        world: "pandora",
        npcId: 888,
        npcName: "Boss2",
        npcType: NpcType.TITAN,
        npcLvl: 400,
        npcProf: null,
        npcIcon: "titan.gif",
        totalKills: 30,
      },
    ];

    it("should return aggregated user stats", async () => {
      databaseCalls.userKillStats.findMany.mockResolvedValue(mockUserStats);
      const query = new GetUserKillStatsDto();

      const result = await service.getUserKillStats(discordId, query);

      expect(result.overview.totalKills).toBe(100);
      expect(result.overview.killsByType).toEqual({
        [NpcType.HERO]: 50,
        [NpcType.TITAN]: 50,
      });
      expect(result.overview.killsByWorld).toEqual({
        pandora: 80,
        tempest: 20,
      });
    });

    it("should return cached user kill stats without querying stats tables", async () => {
      const cachedStats = {
        overview: {
          totalKills: 7,
          killsByType: { [NpcType.TITAN]: 7 },
          killsByWorld: { pandora: 7 },
        },
        topNpcs: [],
      };
      redisService.getJson.mockResolvedValueOnce(cachedStats);
      const query = new GetUserKillStatsDto();

      const result = await service.getUserKillStats(discordId, query);

      expect(result).toEqual(cachedStats);
      expect(redisService.getOrSetJson).not.toHaveBeenCalled();
      expect(databaseCalls.userKillStats.findMany).not.toHaveBeenCalled();
      expect(databaseCalls.userKillStatsBucket.findMany).not.toHaveBeenCalled();
    });

    it("should use user bucket table when period is provided", async () => {
      databaseCalls.userKillStatsBucket.findMany.mockResolvedValue(
        mockUserStats,
      );
      const query = new GetUserKillStatsDto();
      query.period = "7d";

      const result = await service.getUserKillStats(discordId, query);

      expect(databaseCalls.userKillStats.findMany).not.toHaveBeenCalled();
      expect(databaseCalls.userKillStatsBucket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            periodStart: { gte: expect.any(Date) },
          }),
        }),
      );
      expect(result.overview.totalKills).toBe(100);
    });

    it("should return top NPCs sorted by kill count with world-npc combination", async () => {
      databaseCalls.userKillStats.findMany.mockResolvedValue(mockUserStats);
      const query = new GetUserKillStatsDto();

      const result = await service.getUserKillStats(discordId, query);

      // Stats are grouped by world:npcId, so same npc on different worlds are separate entries
      expect(result.topNpcs).toHaveLength(3);
      expect(result.topNpcs[0].npcName).toBe("Boss1");
      expect(result.topNpcs[0].totalKills).toBe(50);
    });

    it("should filter by world when provided", async () => {
      databaseCalls.userKillStats.findMany.mockResolvedValue([]);
      const query = new GetUserKillStatsDto();
      query.world = "pandora";

      await service.getUserKillStats(discordId, query);

      expect(databaseCalls.userKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            world: "pandora",
          }),
        }),
      );
    });

    it("should filter by NPC types when provided", async () => {
      databaseCalls.userKillStats.findMany.mockResolvedValue([]);
      const query = new GetUserKillStatsDto();
      query.npcTypes = [NpcType.HERO, NpcType.TITAN];

      await service.getUserKillStats(discordId, query);

      expect(databaseCalls.userKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            npcType: { in: [NpcType.HERO, NpcType.TITAN] },
          }),
        }),
      );
    });

    it("should handle empty stats", async () => {
      databaseCalls.userKillStats.findMany.mockResolvedValue([]);
      const query = new GetUserKillStatsDto();

      const result = await service.getUserKillStats(discordId, query);

      expect(result.overview.totalKills).toBe(0);
      expect(result.overview.killsByType).toEqual({});
      expect(result.overview.killsByWorld).toEqual({});
      expect(result.topNpcs).toEqual([]);
    });

    it("should limit topNpcs to specified limit", async () => {
      const manyNpcs = Array.from({ length: 15 }, (_, i) => ({
        world: "pandora",
        npcId: 1000 + i,
        npcName: `Boss${i}`,
        npcType: NpcType.HERO,
        npcLvl: 300,
        npcProf: null,
        npcIcon: "boss.gif",
        totalKills: 100 - i,
      }));
      databaseCalls.userKillStats.findMany.mockResolvedValue(manyNpcs);
      const query = new GetUserKillStatsDto();
      query.topNpcsLimit = 10;

      const result = await service.getUserKillStats(discordId, query);

      expect(result.topNpcs).toHaveLength(10);
      expect(result.topNpcs[0].totalKills).toBe(100);
      expect(result.topNpcs[9].totalKills).toBe(91);
    });
  });
});
