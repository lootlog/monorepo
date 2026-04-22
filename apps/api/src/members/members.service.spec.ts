import type { Mocked } from "vitest";
import { mockFn } from "src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MembersService } from "./members.service";
import { PrismaService } from "src/db/prisma.service";
import { DiscordService } from "src/discord/discord.service";
import { DiscordRateLimiterService } from "src/discord/discord-rate-limiter.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { ErrorKey } from "./enum/error-key.enum";
import { RuntimeEnvironment } from "src/types/runtime.types";
import type { APIGuildMember } from "discord-api-types/v10";
import {
  Permission,
  type Member,
  type Guild,
  MemberType,
} from "src/generated/prisma/client";
import { MemberRefreshSchedulerService } from "./member-refresh-scheduler.service";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";
import {
  getPermissionsCacheKey,
  getUserLootlogConfigCachePattern,
} from "src/shared/constants/cache.constant";

vi.mock("src/config/service.config", () => ({
  serviceConfig: { env: "local" },
}));

describe("MembersService", () => {
  let service: MembersService;
  let prismaService: Mocked<PrismaService>;
  let discordService: Mocked<DiscordService>;
  let _rateLimiter: Mocked<DiscordRateLimiterService>;
  let _refreshScheduler: Mocked<MemberRefreshSchedulerService>;
  let amqpConnection: Mocked<AmqpConnection>;

  const mockGuild: Guild = {
    id: "guild-123",
    name: "Test Guild",
    vanityUrl: null,
    icon: "icon.png",
    ownerId: "owner-123",
    notificationRuleLimit: 20,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember: Member & { roles: unknown[] } = {
    id: 123,
    userId: "discord-123",
    guildId: "guild-123",
    type: MemberType.USER,
    name: "Test User",
    avatar: "avatar.png",
    banner: null,
    active: true,
    globalUserId: "user-123",
    lastDiscordSyncAt: new Date(),
    lastDiscordAttemptAt: new Date(),
    lastDiscordStatus: "SUCCESS",
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [],
  };

  const mockDiscordMember: APIGuildMember = {
    user: {
      id: "discord-123",
      username: "testuser",
      discriminator: "0001",
      avatar: "avatar.png",
      global_name: "Test User",
    },
    nick: null,
    avatar: null,
    roles: [],
    joined_at: "2021-01-01T00:00:00.000Z",
    deaf: false,
    mute: false,
  } as APIGuildMember;

  beforeEach(async () => {
    const mockPrismaService = {
      member: {
        findUnique: mockFn(),
        findMany: mockFn(),
        upsert: mockFn(),
        update: mockFn(),
        updateMany: mockFn(),
      },
      guild: {
        findFirst: mockFn(),
      },
      userCharactersLootlogSettings: {
        findMany: mockFn(),
      },
      playerSnapshot: {
        findMany: mockFn(),
      },
      role: {
        findMany: mockFn(),
      },
      memberRefreshJob: {
        findFirst: mockFn(),
        findUnique: mockFn(),
        create: mockFn(),
        update: mockFn(),
      },
    };

    const mockDiscordService = {
      getGuildMember: mockFn(),
    };

    const mockRateLimiter = {
      getNextAvailableAtForUser: mockFn().mockResolvedValue(null),
    };

    const mockRefreshScheduler = {
      enqueueRefresh: mockFn().mockResolvedValue({
        queued: true,
        nextRefreshAt: new Date(Date.now() + 5000),
      }),
      isUserRefreshLocked: mockFn().mockResolvedValue(false),
      acquireUserRefreshLock: mockFn().mockResolvedValue(true),
      releaseUserRefreshLock: mockFn(),
    };

    const mockAmqpConnection = {
      publish: mockFn(),
    };

    const mockLogger = {
      log: mockFn(),
      error: mockFn(),
      warn: mockFn(),
      debug: mockFn(),
    };

    const mockRedisService = {
      get: mockFn(),
      set: mockFn(),
      del: mockFn(),
      deleteByPattern: mockFn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DiscordService, useValue: mockDiscordService },
        { provide: DiscordRateLimiterService, useValue: mockRateLimiter },
        {
          provide: MemberRefreshSchedulerService,
          useValue: mockRefreshScheduler,
        },
        { provide: AmqpConnection, useValue: mockAmqpConnection },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    prismaService = module.get(PrismaService);
    discordService = module.get(DiscordService);
    _rateLimiter = module.get(DiscordRateLimiterService);
    _refreshScheduler = module.get(MemberRefreshSchedulerService);
    amqpConnection = module.get(AmqpConnection);

    // Suppress logger output
    vi.spyOn(service["logger"], "warn").mockImplementation();
    vi.spyOn(service["logger"], "debug").mockImplementation();
    vi.spyOn(service["logger"], "error").mockImplementation();
    vi.spyOn(service["logger"], "log").mockImplementation();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should set environment from config", () => {
      expect(service["env"]).toBe(RuntimeEnvironment.LOCAL);
    });
  });

  describe("soft TTL helpers", () => {
    it("should return a 5 minute soft stale threshold in local", () => {
      const referenceTime = new Date("2026-03-10T10:00:00.000Z");

      const result = service.getMemberSoftStaleThreshold(referenceTime);

      expect(result).toEqual(new Date("2026-03-10T09:55:00.000Z"));
    });

    it("should return a 15 minute soft stale threshold in prod", () => {
      (service as MembersService & { env: RuntimeEnvironment }).env =
        RuntimeEnvironment.PROD;
      const referenceTime = new Date("2026-03-10T10:00:00.000Z");

      const result = service.getMemberSoftStaleThreshold(referenceTime);

      expect(result).toEqual(new Date("2026-03-10T09:45:00.000Z"));
    });

    it("should use the threshold helper when checking soft staleness", () => {
      const threshold = new Date("2026-03-10T10:00:00.000Z");
      vi.spyOn(service, "getMemberSoftStaleThreshold").mockReturnValue(
        threshold,
      );

      expect(
        service.isMemberSoftStale({
          lastDiscordSyncAt: new Date("2026-03-10T09:59:59.000Z"),
          updatedAt: new Date("2026-03-10T10:05:00.000Z"),
        }),
      ).toBe(true);
      expect(
        service.isMemberSoftStale({
          lastDiscordSyncAt: new Date("2026-03-10T10:00:01.000Z"),
          updatedAt: new Date("2026-03-10T10:05:00.000Z"),
        }),
      ).toBe(false);
    });
  });

  describe("getGuildMemberById", () => {
    const options = {
      discordId: "discord-123",
      guildId: "guild-123",
      userId: "user-123",
    };

    it("should return cached member when valid and not expired", async () => {
      const futureDate = new Date(Date.now() + 10000);
      const cachedMember = { ...mockMember, updatedAt: futureDate };
      prismaService.member.findUnique.mockResolvedValue(cachedMember);

      const result = await service.getGuildMemberById(options);

      expect(result).toEqual(cachedMember);
      expect(discordService.getGuildMember).not.toHaveBeenCalled();
    });

    it("should fetch from Discord when member not in cache", async () => {
      prismaService.member.findUnique.mockResolvedValue(null);
      discordService.getGuildMember.mockResolvedValue(mockDiscordMember);
      prismaService.role.findMany.mockResolvedValue([]);
      prismaService.member.upsert.mockResolvedValue(mockMember);

      const result = await service.getGuildMemberById(options);

      expect(discordService.getGuildMember).toHaveBeenCalledWith({
        guildId: options.guildId,
        userId: options.userId,
        discordId: options.discordId,
      });
      expect(prismaService.member.upsert).toHaveBeenCalled();
      expect(result).toEqual(mockMember);
    });

    it("should throw BadRequestException when refresh=true and TTL active", async () => {
      const futureDate = new Date(Date.now() + 10000);
      const cachedMember = { ...mockMember, updatedAt: futureDate };
      prismaService.guild.findFirst.mockResolvedValue(mockGuild);
      prismaService.member.findUnique.mockResolvedValue(cachedMember);

      await expect(
        service.getGuildMemberById({ ...options, refresh: true }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getGuildMemberById({ ...options, refresh: true }),
      ).rejects.toThrow(ErrorKey.MEMBER_TTL_ACTIVE);
    });

    it("should return stale data when Discord API returns null", async () => {
      const staleMember = {
        ...mockMember,
        updatedAt: new Date(0),
        lastDiscordSyncAt: new Date(0),
      };
      prismaService.member.findUnique.mockResolvedValue(staleMember);
      discordService.getGuildMember.mockResolvedValue(null);

      const result = await service.getGuildMemberById(options);

      expect(result).toEqual(
        expect.objectContaining({
          ...staleMember,
          isStale: true,
          refreshQueued: false,
          nextRefreshAt: null,
          staleWarning:
            "Using cached data due to Discord API rate limiting or errors",
        }),
      );
      expect(service["logger"].log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warn",
          message: expect.stringContaining("Discord API returned null"),
        }),
      );
    });

    it("should deactivate member and return null when Discord returns NotFoundException", async () => {
      prismaService.member.findUnique
        .mockResolvedValueOnce(null) // First call in getGuildMemberById
        .mockResolvedValueOnce(mockMember); // Second call in deactivateMember
      discordService.getGuildMember.mockRejectedValue(
        new NotFoundException("Member not found"),
      );
      prismaService.member.update.mockResolvedValue({
        ...mockMember,
        active: false,
      });

      const result = await service.getGuildMemberById(options);

      expect(result).toBeNull();
      expect(prismaService.member.update).toHaveBeenCalledWith({
        where: {
          memberId: { userId: options.discordId, guildId: options.guildId },
        },
        data: expect.objectContaining({
          active: false,
          lastDiscordStatus: "NOT_FOUND",
          roles: { set: [] },
        }),
      });
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_MEMBERS_REMOVE,
        {
          id: options.discordId,
          discordId: options.discordId,
          userId: options.userId,
          guildId: options.guildId,
        },
      );
      expect(service["redisService"].del).toHaveBeenCalledWith(
        getPermissionsCacheKey(options.userId, options.guildId),
      );
      expect(service["redisService"].deleteByPattern).toHaveBeenCalledWith(
        getUserLootlogConfigCachePattern(options.discordId),
      );
    });

    it("should deactivate member when authentication fails (401)", async () => {
      prismaService.member.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockMember);
      const unauthorizedError = new HttpException(
        "Unauthorized",
        HttpStatus.UNAUTHORIZED,
      );
      discordService.getGuildMember.mockRejectedValue(unauthorizedError);
      prismaService.member.update.mockResolvedValue({
        ...mockMember,
        active: false,
      });

      const result = await service.getGuildMemberById(options);

      expect(result).toBeNull();
      expect(service["logger"].log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warn",
          message:
            "User authentication failed (token expired/invalid), deactivating member",
        }),
      );
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_MEMBERS_REMOVE,
        {
          id: options.discordId,
          discordId: options.discordId,
          userId: options.userId,
          guildId: options.guildId,
        },
      );
    });

    it("should not publish member removal when Discord deactivates an already inactive member", async () => {
      prismaService.member.findUnique.mockResolvedValue({
        ...mockMember,
        active: false,
      });
      prismaService.member.update.mockResolvedValue({
        ...mockMember,
        active: false,
      });
      discordService.getGuildMember.mockRejectedValue(
        new NotFoundException("Member not found"),
      );

      const result = await service.syncMemberFromDiscord(options);

      expect(result).toBeNull();
      expect(amqpConnection.publish).not.toHaveBeenCalled();
    });

    it("should return stale data when auth service unavailable", async () => {
      const staleMember = {
        ...mockMember,
        updatedAt: new Date(0),
        lastDiscordSyncAt: new Date(0),
      };
      prismaService.member.findUnique.mockResolvedValue(staleMember);
      discordService.getGuildMember.mockRejectedValue(
        new ServiceUnavailableException("Service unavailable"),
      );

      const result = await service.getGuildMemberById(options);

      expect(result).toEqual(
        expect.objectContaining({
          ...staleMember,
          isStale: true,
          refreshQueued: false,
          nextRefreshAt: null,
          staleWarning:
            "Using cached data due to Discord API rate limiting or errors",
        }),
      );
      expect(service["logger"].log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warn",
          message: "Auth service unavailable, keeping cached member state",
        }),
      );
    });

    it("should throw error when refresh=true and general error occurs", async () => {
      prismaService.guild.findFirst.mockResolvedValue(mockGuild);
      prismaService.member.findUnique.mockResolvedValue(null);
      discordService.getGuildMember.mockRejectedValue(
        new Error("Network error"),
      );

      await expect(
        service.getGuildMemberById({ ...options, refresh: true }),
      ).rejects.toThrow(Error);
      await expect(
        service.getGuildMemberById({ ...options, refresh: true }),
      ).rejects.toThrow("Network error");
    });

    it("should return stale data on general error when refresh=false", async () => {
      const staleMember = {
        ...mockMember,
        updatedAt: new Date(0),
        lastDiscordSyncAt: new Date(0),
      };
      prismaService.member.findUnique.mockResolvedValue(staleMember);
      discordService.getGuildMember.mockRejectedValue(
        new Error("Network error"),
      );

      const result = await service.getGuildMemberById(options);

      expect(result).toEqual(
        expect.objectContaining({
          ...staleMember,
          isStale: true,
          refreshQueued: false,
          nextRefreshAt: null,
          staleWarning:
            "Using cached data due to Discord API rate limiting or errors",
        }),
      );
      expect(service["logger"].log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          message: expect.stringContaining(
            "Failed to fetch member from Discord",
          ),
        }),
      );
    });

    it("should call getGuildById when refresh=true", async () => {
      prismaService.guild.findFirst.mockResolvedValue(mockGuild);
      prismaService.member.findUnique.mockResolvedValue(null);
      discordService.getGuildMember.mockResolvedValue(mockDiscordMember);
      prismaService.role.findMany.mockResolvedValue([]);
      prismaService.member.upsert.mockResolvedValue(mockMember);

      await service.getGuildMemberById({ ...options, refresh: true });

      expect(prismaService.guild.findFirst).toHaveBeenCalled();
    });

    it("should call getGuildById when standalone=true", async () => {
      prismaService.guild.findFirst.mockResolvedValue(mockGuild);
      prismaService.member.findUnique.mockResolvedValue(null);
      discordService.getGuildMember.mockResolvedValue(mockDiscordMember);
      prismaService.role.findMany.mockResolvedValue([]);
      prismaService.member.upsert.mockResolvedValue(mockMember);

      await service.getGuildMemberById({ ...options, standalone: true });

      expect(prismaService.guild.findFirst).toHaveBeenCalled();
    });
  });

  describe("getMemberLootlogConfigSummary", () => {
    it("should return guild-scoped character summary with latest player snapshots", async () => {
      prismaService.member.findUnique.mockResolvedValue({
        userId: "discord-123",
        active: true,
      });
      prismaService.userCharactersLootlogSettings.findMany.mockResolvedValue([
        {
          userId: "discord-123",
          accountId: "10",
          characterId: "20",
          catchingGuildIds: ["guild-123"],
        },
        {
          userId: "discord-123",
          accountId: "10",
          characterId: "21",
          catchingGuildIds: [],
        },
      ]);
      prismaService.playerSnapshot.findMany.mockResolvedValue([
        {
          accountId: 10,
          characterId: 20,
          name: "Newest Name",
          world: "Berufs",
          icon: "newest.png",
        },
        {
          accountId: 10,
          characterId: 20,
          name: "Older Name",
          world: "Zorza",
          icon: "older.png",
        },
      ]);

      const result = await service.getMemberLootlogConfigSummary({
        discordId: "discord-123",
        guildId: "guild-123",
      });

      expect(result).toEqual({
        memberUserId: "discord-123",
        guildId: "guild-123",
        isActive: true,
        configuredCharacterCount: 2,
        enabledCharacterCount: 1,
        characters: [
          {
            accountId: "10",
            characterId: "20",
            enabledForGuild: true,
            characterName: "Newest Name",
            world: "Berufs",
            icon: "newest.png",
            metadataStatus: "resolved",
          },
          {
            accountId: "10",
            characterId: "21",
            enabledForGuild: false,
            characterName: null,
            world: null,
            icon: null,
            metadataStatus: "missing_snapshot",
          },
        ],
      });
    });

    it("should return fallback metadata states for invalid character refs", async () => {
      prismaService.member.findUnique.mockResolvedValue({
        userId: "discord-123",
        active: false,
      });
      prismaService.userCharactersLootlogSettings.findMany.mockResolvedValue([
        {
          userId: "discord-123",
          accountId: "abc",
          characterId: "999",
          catchingGuildIds: ["guild-123"],
        },
      ]);
      prismaService.playerSnapshot.findMany.mockResolvedValue([]);

      const result = await service.getMemberLootlogConfigSummary({
        discordId: "discord-123",
        guildId: "guild-123",
      });

      expect(result.characters).toEqual([
        {
          accountId: "abc",
          characterId: "999",
          enabledForGuild: true,
          characterName: null,
          world: null,
          icon: null,
          metadataStatus: "invalid_character_ref",
        },
      ]);
    });

    it("should throw when member is missing", async () => {
      prismaService.member.findUnique.mockResolvedValue(null);

      await expect(
        service.getMemberLootlogConfigSummary({
          discordId: "discord-123",
          guildId: "guild-123",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("refreshMember", () => {
    const options = { discordId: "discord-123", guildId: "guild-123" };

    it("should throw NotFoundException when member not found", async () => {
      prismaService.member.findUnique.mockResolvedValue(null);

      await expect(service.refreshMember(options)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.refreshMember(options)).rejects.toThrow(
        "Member not found or global user ID is missing",
      );
    });

    it("should throw NotFoundException when globalUserId is missing", async () => {
      const memberWithoutGlobalId = { ...mockMember, globalUserId: null };
      prismaService.member.findUnique.mockResolvedValue(memberWithoutGlobalId);

      await expect(service.refreshMember(options)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should successfully refresh member", async () => {
      prismaService.member.findUnique.mockResolvedValue(mockMember);
      prismaService.guild.findFirst.mockResolvedValue(mockGuild);
      prismaService.member.findUnique
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(null);
      discordService.getGuildMember.mockResolvedValue(mockDiscordMember);
      prismaService.role.findMany.mockResolvedValue([]);
      prismaService.member.upsert.mockResolvedValue(mockMember);

      const result = await service.refreshMember(options);

      expect(result).toEqual(mockMember);
    });
  });

  describe("getGuildMembers", () => {
    it("should return active members for a guild", async () => {
      const members = [mockMember, { ...mockMember, id: "member-456" }];
      prismaService.member.findMany.mockResolvedValue(members);

      const result = await service.getGuildMembers("guild-123");

      expect(result).toEqual(members);
      expect(prismaService.member.findMany).toHaveBeenCalledWith({
        where: {
          guildId: "guild-123",
          active: true,
          globalUserId: { not: null },
        },
        include: {
          roles: {
            orderBy: { position: "desc" },
          },
        },
        orderBy: { name: "asc" },
      });
    });

    it("should return empty array when no members found", async () => {
      prismaService.member.findMany.mockResolvedValue([]);

      const result = await service.getGuildMembers("guild-123");

      expect(result).toEqual([]);
    });
  });

  describe("getGuildMembersSummary", () => {
    it("should return lightweight active members for a guild", async () => {
      prismaService.guild.findFirst.mockResolvedValue({
        ownerId: "owner-123",
      });
      prismaService.member.findMany.mockResolvedValue([
        {
          id: 123,
          userId: "discord-123",
          name: "Alpha",
          avatar: "avatar.png",
          roles: [{ color: 123456 }],
        },
        {
          id: 456,
          userId: "discord-456",
          name: "Beta",
          avatar: null,
          roles: [],
        },
      ]);

      const result = await service.getGuildMembersSummary("guild-123");

      expect(result).toEqual([
        {
          id: 123,
          userId: "discord-123",
          name: "Alpha",
          avatar: "avatar.png",
          color: 123456,
        },
        {
          id: 456,
          userId: "discord-456",
          name: "Beta",
          avatar: null,
          color: null,
        },
      ]);
      expect(prismaService.member.findMany).toHaveBeenCalledWith({
        where: {
          guildId: "guild-123",
          active: true,
          globalUserId: { not: null },
          OR: [
            {
              userId: "owner-123",
            },
            {
              roles: {
                some: {
                  permissions: {
                    hasSome: [
                      Permission.OWNER,
                      Permission.ADMIN,
                      Permission.LOOTLOG_ACCESS,
                    ],
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          userId: true,
          name: true,
          avatar: true,
          roles: {
            select: {
              color: true,
            },
            orderBy: {
              position: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          name: "asc",
        },
      });
    });

    it("should return empty array when guild does not exist", async () => {
      prismaService.guild.findFirst.mockResolvedValue(null);

      const result = await service.getGuildMembersSummary("guild-123");

      expect(result).toEqual([]);
      expect(prismaService.member.findMany).not.toHaveBeenCalled();
    });

    it("should return empty array when no lightweight members found", async () => {
      prismaService.guild.findFirst.mockResolvedValue({
        ownerId: "owner-123",
      });
      prismaService.member.findMany.mockResolvedValue([]);

      const result = await service.getGuildMembersSummary("guild-123");

      expect(result).toEqual([]);
    });
  });

  describe("createOrUpdateMember", () => {
    const memberData = {
      ...mockDiscordMember,
      guildId: "guild-123",
      globalUserId: "user-123",
    };

    it("should create new member when not exists", async () => {
      prismaService.role.findMany.mockResolvedValue([]);
      prismaService.member.upsert.mockResolvedValue(mockMember);

      const result = await service.createOrUpdateMember(memberData);

      expect(result).toEqual(mockMember);
      expect(prismaService.member.upsert).toHaveBeenCalled();
    });

    it("should update existing member", async () => {
      const updatedMember = { ...mockMember, name: "Updated Name" };
      prismaService.role.findMany.mockResolvedValue([]);
      prismaService.member.upsert.mockResolvedValue(updatedMember);

      const result = await service.createOrUpdateMember(memberData);

      expect(result).toEqual(updatedMember);
    });

    it("should use nick as member name if present", async () => {
      const memberWithNick = { ...memberData, nick: "Custom Nick" };
      prismaService.role.findMany.mockResolvedValue([]);
      prismaService.member.upsert.mockResolvedValue(mockMember);

      await service.createOrUpdateMember(memberWithNick);

      const upsertCall = prismaService.member.upsert.mock.calls[0][0];
      expect(upsertCall.update.name).toBe("Custom Nick");
      expect(upsertCall.create.name).toBe("Custom Nick");
    });

    it("should use global_name if nick not present", async () => {
      prismaService.role.findMany.mockResolvedValue([]);
      prismaService.member.upsert.mockResolvedValue(mockMember);

      await service.createOrUpdateMember(memberData);

      const upsertCall = prismaService.member.upsert.mock.calls[0][0];
      expect(upsertCall.update.name).toBe("Test User");
      expect(upsertCall.create.name).toBe("Test User");
    });

    it("should connect only existing roles", async () => {
      const memberWithRoles = {
        ...memberData,
        roles: ["role-1", "role-2", "role-3"],
      };
      prismaService.role.findMany.mockResolvedValue([
        { id: "role-1" },
        { id: "role-2" },
      ]);
      prismaService.member.upsert.mockResolvedValue(mockMember);

      await service.createOrUpdateMember(memberWithRoles);

      const upsertCall = prismaService.member.upsert.mock.calls[0][0];
      expect(upsertCall.update.roles.set).toEqual([
        { id: "role-1" },
        { id: "role-2" },
      ]);
      expect(upsertCall.create.roles.connect).toEqual([
        { id: "role-1" },
        { id: "role-2" },
      ]);
    });

    it("should log error and rethrow on failure", async () => {
      const error = new Error("Database error");
      prismaService.role.findMany.mockResolvedValue([]);
      prismaService.member.upsert.mockRejectedValue(error);

      await expect(service.createOrUpdateMember(memberData)).rejects.toThrow(
        error,
      );
      expect(service["logger"].log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          message: expect.stringContaining("Failed to create/update member"),
        }),
      );
    });
  });

  describe("deactivateMember", () => {
    const options = { discordId: "discord-123", guildId: "guild-123" };

    it("should throw NotFoundException when member not found", async () => {
      prismaService.member.findUnique.mockResolvedValue(null);

      await expect(service.deactivateMember(options)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deactivateMember(options)).rejects.toThrow(
        "Member not found",
      );
    });

    it("should throw BadRequestException when member already deactivated", async () => {
      const inactiveMember = { ...mockMember, active: false };
      prismaService.member.findUnique.mockResolvedValue(inactiveMember);

      await expect(service.deactivateMember(options)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deactivateMember(options)).rejects.toThrow(
        ErrorKey.MEMBER_ALREADY_DEACTIVATED,
      );
    });

    it("should successfully deactivate active member", async () => {
      const deactivatedMember = { ...mockMember, active: false };
      prismaService.member.findUnique.mockResolvedValue(mockMember);
      prismaService.member.update.mockResolvedValue(deactivatedMember);

      const result = await service.deactivateMember(options);

      expect(result).toEqual(deactivatedMember);
      expect(prismaService.member.update).toHaveBeenCalledWith({
        where: {
          memberId: { userId: options.discordId, guildId: options.guildId },
        },
        data: expect.objectContaining({
          active: false,
          lastDiscordStatus: "MANUALLY_DEACTIVATED",
          roles: { set: [] },
        }),
        include: { roles: true },
      });
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_MEMBERS_REMOVE,
        {
          id: options.discordId,
          discordId: options.discordId,
          userId: mockMember.globalUserId,
          guildId: options.guildId,
        },
      );
    });
  });

  describe("deleteMembersByGuildId", () => {
    it("should deactivate all members for a guild", async () => {
      prismaService.member.findMany.mockResolvedValue([
        {
          userId: "discord-123",
          guildId: "guild-123",
          globalUserId: "user-123",
        },
        {
          userId: "discord-456",
          guildId: "guild-123",
          globalUserId: null,
        },
      ]);
      prismaService.member.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.deleteMembersByGuildId("guild-123");

      expect(result).toEqual({
        count: 5,
        affectedMembers: [
          {
            discordId: "discord-123",
            guildId: "guild-123",
            globalUserId: "user-123",
          },
          {
            discordId: "discord-456",
            guildId: "guild-123",
            globalUserId: null,
          },
        ],
      });
      expect(prismaService.member.findMany).toHaveBeenCalledWith({
        where: {
          guildId: "guild-123",
          active: true,
        },
        select: {
          userId: true,
          guildId: true,
          globalUserId: true,
        },
      });
      expect(prismaService.member.updateMany).toHaveBeenCalledWith({
        where: {
          guildId: "guild-123",
          active: true,
        },
        data: expect.objectContaining({
          active: false,
          lastDiscordStatus: "GUILD_DEACTIVATED",
        }),
      });
      expect(service["logger"].log).toHaveBeenCalledWith({
        level: "info",
        message: "Deactivated 5 members from guild guild-123",
      });
    });

    it("should log error and rethrow on failure", async () => {
      const error = new Error("Database error");
      prismaService.member.updateMany.mockRejectedValue(error);

      await expect(service.deleteMembersByGuildId("guild-123")).rejects.toThrow(
        error,
      );
      expect(service["logger"].log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          message: expect.stringContaining("Failed to deactivate members"),
        }),
      );
    });
  });

  describe("createBulkRefreshJob", () => {
    const guildId = "guild-123";
    const requestedBy = "discord-123";

    it("should create bulk refresh job successfully", async () => {
      prismaService.memberRefreshJob.findFirst.mockResolvedValue(null);
      prismaService.member.findMany.mockResolvedValue([
        mockMember,
        { ...mockMember, id: "member-456", userId: "discord-456" },
      ]);
      const mockJob = {
        id: 1,
        guildId,
        requestedBy,
        status: "PENDING",
        totalMembers: 2,
        processedMembers: 0,
        failedMembers: 0,
        createdAt: new Date(),
      };
      prismaService.memberRefreshJob.create.mockResolvedValue(mockJob);

      const result = await service.createBulkRefreshJob(guildId, requestedBy);

      expect(result).toEqual(mockJob);
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        {
          jobId: mockJob.id,
          guildId,
          memberIds: ["discord-123", "discord-456"],
        },
      );
    });

    it("should throw BadRequestException when rate limit active", async () => {
      const recentJob = {
        id: 1,
        createdAt: new Date(),
      };
      prismaService.memberRefreshJob.findFirst.mockResolvedValue(recentJob);

      await expect(
        service.createBulkRefreshJob(guildId, requestedBy),
      ).rejects.toThrow(BadRequestException);

      const error = await service
        .createBulkRefreshJob(guildId, requestedBy)
        .catch((error) => error);
      expect(error.getResponse()).toMatchObject({
        message: ErrorKey.BULK_REFRESH_RATE_LIMIT_ACTIVE,
        nextAvailableAt: expect.any(Date),
      });
    });
  });

  describe("getLatestRefreshJob", () => {
    it("should return latest refresh job for guild", async () => {
      const mockJob = {
        id: 1,
        guildId: "guild-123",
        status: "COMPLETED",
        createdAt: new Date(),
      };
      prismaService.memberRefreshJob.findFirst.mockResolvedValue(mockJob);

      const result = await service.getLatestRefreshJob("guild-123");

      expect(result).toEqual(mockJob);
      expect(prismaService.memberRefreshJob.findFirst).toHaveBeenCalledWith({
        where: { guildId: "guild-123" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return null when no jobs found", async () => {
      prismaService.memberRefreshJob.findFirst.mockResolvedValue(null);

      const result = await service.getLatestRefreshJob("guild-123");

      expect(result).toBeNull();
    });
  });

  describe("getRefreshJobStatus", () => {
    it("should return job status", async () => {
      const mockJob = {
        id: 1,
        guildId: "guild-123",
        status: "PROCESSING",
        processedMembers: 5,
        totalMembers: 10,
      };
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(mockJob);

      const result = await service.getRefreshJobStatus(1);

      expect(result).toEqual(mockJob);
      expect(prismaService.memberRefreshJob.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("should throw NotFoundException when job not found", async () => {
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(null);

      await expect(service.getRefreshJobStatus(999)).rejects.toThrow(
        NotFoundException,
      );

      const error = await service
        .getRefreshJobStatus(999)
        .catch((error) => error);
      expect(error.getResponse()).toMatchObject({
        message: ErrorKey.REFRESH_JOB_NOT_FOUND,
      });
    });
  });
});
