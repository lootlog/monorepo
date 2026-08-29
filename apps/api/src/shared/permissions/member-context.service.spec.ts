import { NotFoundException } from "@nestjs/common";
import { Permission } from "#src/generated/prisma/client";
import { RedisService } from "@lootlog/nest-shared/redis";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "#src/db/prisma.service";
import { MembersService } from "#src/members/members.service";
import {
  getGuildCacheKey,
  getPermissionsCacheKey,
} from "#src/shared/constants/cache.constant";
import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { MemberContextService } from "./member-context.service.js";

describe("MemberContextService", () => {
  let service: MemberContextService;

  const mockLogger = {
    warn: mockFn(),
  };

  const mockPrismaService = {
    guild: {
      findFirst: mockFn(),
    },
  };

  const mockRedisService = {
    get: mockFn(),
    set: mockFn(),
    del: mockFn(),
  };

  const mockMembersService = {
    getGuildMemberById: mockFn(),
    isMemberSoftStale: mockFn(),
  };

  const guild = {
    id: "guild-1",
    vanityUrl: "guild-one",
    ownerId: "discord-owner",
    active: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberContextService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
      ],
    }).compile();

    service = module.get(MemberContextService);
    vi.clearAllMocks();
    mockMembersService.isMemberSoftStale.mockReturnValue(false);
  });

  it("returns cached member context when permissions cache is valid", async () => {
    const cacheKey = getPermissionsCacheKey("user-1", guild.id);
    const cachedContext = {
      guild,
      member: {
        id: 1,
        active: true,
        lastDiscordSyncAt: new Date().toISOString(),
      },
      roles: [],
      permissions: [Permission.LOOTLOG_ACCESS],
    };

    mockRedisService.get
      .mockResolvedValueOnce(JSON.stringify(guild))
      .mockResolvedValueOnce(JSON.stringify(cachedContext));

    await expect(
      service.getMemberContext({
        discordId: "discord-1",
        userId: "user-1",
        guildId: guild.id,
      }),
    ).resolves.toEqual(cachedContext);

    expect(mockRedisService.get).toHaveBeenCalledWith(cacheKey);
    expect(mockMembersService.getGuildMemberById).not.toHaveBeenCalled();
  });

  it("deletes malformed cached permissions and falls back to member lookup", async () => {
    mockRedisService.get
      .mockResolvedValueOnce(JSON.stringify(guild))
      .mockResolvedValueOnce("{bad json");
    mockMembersService.getGuildMemberById.mockResolvedValue({
      id: 1,
      active: true,
      isStale: false,
      refreshQueued: false,
      roles: [
        {
          permissions: [Permission.LOOTLOG_ACCESS, Permission.LOOTLOG_ACCESS],
        },
      ],
    });

    const result = await service.getMemberContext({
      discordId: "discord-1",
      userId: "user-1",
      guildId: guild.id,
    });

    expect(mockRedisService.del).toHaveBeenCalledWith(
      getPermissionsCacheKey("user-1", guild.id),
    );
    expect(result?.permissions).toEqual([Permission.LOOTLOG_ACCESS]);
  });

  it("deletes stale cached permissions and refreshes member context", async () => {
    const cachedContext = {
      guild,
      member: {
        id: 1,
        active: true,
        lastDiscordSyncAt: new Date(0).toISOString(),
      },
      roles: [],
      permissions: [Permission.LOOTLOG_ACCESS],
    };
    mockRedisService.get
      .mockResolvedValueOnce(JSON.stringify(guild))
      .mockResolvedValueOnce(JSON.stringify(cachedContext));
    mockMembersService.isMemberSoftStale.mockReturnValue(true);
    mockMembersService.getGuildMemberById.mockResolvedValue({
      id: 1,
      active: true,
      isStale: false,
      refreshQueued: false,
      roles: [
        {
          permissions: [Permission.LOOTLOG_ACCESS],
        },
      ],
    });

    const result = await service.getMemberContext({
      discordId: "discord-1",
      userId: "user-1",
      guildId: guild.id,
    });

    expect(mockRedisService.del).toHaveBeenCalledWith(
      getPermissionsCacheKey("user-1", guild.id),
    );
    expect(mockMembersService.getGuildMemberById).toHaveBeenCalled();
    expect(result?.permissions).toEqual([Permission.LOOTLOG_ACCESS]);
  });

  it("falls back to the database when redis read fails", async () => {
    mockRedisService.get
      .mockRejectedValueOnce(new Error("redis guild fail"))
      .mockRejectedValueOnce(new Error("redis perms fail"));
    mockPrismaService.guild.findFirst.mockResolvedValue(guild);
    mockMembersService.getGuildMemberById.mockResolvedValue({
      id: 1,
      active: true,
      isStale: false,
      refreshQueued: false,
      roles: [
        {
          permissions: [Permission.LOOTLOG_ACCESS],
        },
      ],
    });

    const result = await service.getMemberContext({
      discordId: "discord-1",
      userId: "user-1",
      guildId: guild.id,
    });

    expect(result?.permissions).toEqual([Permission.LOOTLOG_ACCESS]);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it("returns null for inactive members", async () => {
    mockRedisService.get
      .mockResolvedValueOnce(JSON.stringify(guild))
      .mockResolvedValueOnce(null);
    mockMembersService.getGuildMemberById.mockResolvedValue({
      id: 1,
      active: false,
      roles: [],
    });

    await expect(
      service.getMemberContext({
        discordId: "discord-1",
        userId: "user-1",
        guildId: guild.id,
      }),
    ).resolves.toBeNull();
  });

  it("grants all permissions to guild owners", async () => {
    mockRedisService.get
      .mockResolvedValueOnce(JSON.stringify(guild))
      .mockResolvedValueOnce(null);
    mockMembersService.getGuildMemberById.mockResolvedValue({
      id: 1,
      active: true,
      isStale: false,
      refreshQueued: false,
      roles: [],
    });

    const result = await service.getMemberContext({
      discordId: "discord-owner",
      userId: "user-1",
      guildId: guild.id,
    });

    expect(result?.permissions).toEqual(Object.values(Permission));
    expect(mockRedisService.set).toHaveBeenCalledWith(
      getPermissionsCacheKey("user-1", guild.id),
      JSON.stringify(result),
      900,
    );
  });

  it("does not cache member context when the member is stale or refresh is queued", async () => {
    mockRedisService.get
      .mockResolvedValueOnce(JSON.stringify(guild))
      .mockResolvedValueOnce(null);
    mockMembersService.getGuildMemberById.mockResolvedValue({
      id: 1,
      active: true,
      isStale: true,
      refreshQueued: false,
      roles: [
        {
          permissions: [Permission.LOOTLOG_ACCESS],
        },
      ],
    });

    await service.getMemberContext({
      discordId: "discord-1",
      userId: "user-1",
      guildId: guild.id,
    });

    expect(mockRedisService.set).not.toHaveBeenCalled();
  });

  it("loads guild from the database and caches it under id and vanity url", async () => {
    mockRedisService.get.mockResolvedValue(null);
    mockPrismaService.guild.findFirst.mockResolvedValue(guild);
    mockMembersService.getGuildMemberById.mockResolvedValue({
      id: 1,
      active: true,
      isStale: false,
      refreshQueued: false,
      roles: [
        {
          permissions: [Permission.LOOTLOG_ACCESS],
        },
      ],
    });

    await service.getMemberContext({
      discordId: "discord-1",
      userId: "user-1",
      guildId: guild.id,
    });

    expect(mockPrismaService.guild.findFirst).toHaveBeenCalledWith({
      where: {
        active: true,
        OR: [{ id: guild.id }, { vanityUrl: guild.id }],
      },
    });
    expect(mockRedisService.set).toHaveBeenCalledWith(
      getGuildCacheKey(guild.id),
      JSON.stringify(guild),
      3600,
    );
    expect(mockRedisService.set).toHaveBeenCalledWith(
      getGuildCacheKey(guild.vanityUrl),
      JSON.stringify(guild),
      3600,
    );
  });

  it("throws not found when the guild does not exist", async () => {
    mockRedisService.get.mockResolvedValue(null);
    mockPrismaService.guild.findFirst.mockResolvedValue(null);

    await expect(
      service.getMemberContext({
        discordId: "discord-1",
        userId: "user-1",
        guildId: "missing",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
