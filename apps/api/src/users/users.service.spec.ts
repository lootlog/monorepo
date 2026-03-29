import { Test, type TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "@lootlog/nest-shared";
import { of } from "rxjs";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { AuthService } from "src/auth/auth.service";
import { PrismaService } from "src/db/prisma.service";
import { MembersService } from "src/members/members.service";
import { getUserLootlogConfigCachePattern } from "src/shared/constants/cache.constant";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  let service: UsersService;

  const mockMemberRows = [
    {
      id: 101,
      guildId: "guild-1",
      globalUserId: "auth-user-legacy",
      userId: "discord-123",
    },
    {
      id: 202,
      guildId: "guild-2",
      globalUserId: "auth-user-legacy",
      userId: "discord-123",
    },
  ];

  const mockTx = {
    member: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    npcKillStats: {
      deleteMany: jest.fn(),
    },
    userKillStats: {
      deleteMany: jest.fn(),
    },
    userSettings: {
      deleteMany: jest.fn(),
    },
    userTimerSettings: {
      deleteMany: jest.fn(),
    },
    userSoundSettings: {
      deleteMany: jest.fn(),
    },
    userCharactersLootlogSettings: {
      deleteMany: jest.fn(),
    },
    userGuildTimerSettings: {
      deleteMany: jest.fn(),
    },
    userGuildEventSettings: {
      deleteMany: jest.fn(),
    },
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    userSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };
  const mockLogger = { warn: jest.fn() };
  const mockAuthService = { invalidateIdpTokenCache: jest.fn() };
  const mockMembersService = { notifyMembersRemoved: jest.fn() };
  const mockRedisService = { deleteByPattern: jest.fn() };
  const mockHttpService = { post: jest.fn() };
  const mockConfigService = {
    get: jest
      .fn()
      .mockReturnValue({ serviceUrl: "http://battlelog-service:4000" }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaService.$transaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>) =>
        callback(mockTx),
    );

    mockTx.member.findMany.mockResolvedValue(mockMemberRows);
    mockTx.member.update.mockResolvedValue(undefined);
    mockTx.npcKillStats.deleteMany.mockResolvedValue({ count: 2 });
    mockTx.userKillStats.deleteMany.mockResolvedValue({ count: 3 });
    mockTx.userSettings.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.userTimerSettings.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.userSoundSettings.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.userCharactersLootlogSettings.deleteMany.mockResolvedValue({
      count: 2,
    });
    mockTx.userGuildTimerSettings.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.userGuildEventSettings.deleteMany.mockResolvedValue({ count: 1 });

    mockAuthService.invalidateIdpTokenCache.mockResolvedValue(undefined);
    mockMembersService.notifyMembersRemoved.mockResolvedValue(undefined);
    mockRedisService.deleteByPattern.mockResolvedValue(1);
    mockHttpService.post.mockReturnValue(of({ data: { status: "ACCEPTED" } }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("deletes auth-owned and discord-owned records with the correct identifiers", async () => {
    await service.deleteAccount({
      authUserId: "auth-user-current",
      discordId: "discord-123",
    });

    expect(mockHttpService.post).toHaveBeenCalledWith(
      "http://battlelog-service:4000/internal/delete-user-data",
      { userId: "auth-user-current" },
      { timeout: 5000 },
    );

    expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.member.findMany).toHaveBeenCalledWith({
      where: { userId: "discord-123" },
      select: {
        id: true,
        guildId: true,
        globalUserId: true,
        userId: true,
      },
    });
    expect(mockTx.npcKillStats.deleteMany).toHaveBeenCalledWith({
      where: { memberId: { in: [101, 202] } },
    });
    expect(mockTx.userKillStats.deleteMany).toHaveBeenCalledWith({
      where: { userId: "discord-123" },
    });
    expect(
      mockTx.userCharactersLootlogSettings.deleteMany,
    ).toHaveBeenCalledWith({
      where: { userId: "discord-123" },
    });

    expect(mockTx.userSettings.deleteMany).toHaveBeenCalledWith({
      where: { userId: "auth-user-current" },
    });
    expect(mockTx.userTimerSettings.deleteMany).toHaveBeenCalledWith({
      where: { userId: "auth-user-current" },
    });
    expect(mockTx.userSoundSettings.deleteMany).toHaveBeenCalledWith({
      where: { userId: "auth-user-current" },
    });
    expect(mockTx.userGuildTimerSettings.deleteMany).toHaveBeenCalledWith({
      where: { userId: "auth-user-current" },
    });
    expect(mockTx.userGuildEventSettings.deleteMany).toHaveBeenCalledWith({
      where: { userId: "auth-user-current" },
    });

    expect(mockTx.member.update).toHaveBeenNthCalledWith(1, {
      where: { id: 101 },
      data: {
        active: false,
        lastDiscordAttemptAt: expect.any(Date),
        lastDiscordStatus: "ACCOUNT_DELETED",
        roles: { set: [] },
      },
    });
    expect(mockTx.member.update).toHaveBeenNthCalledWith(2, {
      where: { id: 202 },
      data: {
        active: false,
        lastDiscordAttemptAt: expect.any(Date),
        lastDiscordStatus: "ACCOUNT_DELETED",
        roles: { set: [] },
      },
    });

    expect(mockMembersService.notifyMembersRemoved).toHaveBeenCalledWith([
      {
        discordId: "discord-123",
        guildId: "guild-1",
        globalUserId: "auth-user-legacy",
      },
      {
        discordId: "discord-123",
        guildId: "guild-2",
        globalUserId: "auth-user-legacy",
      },
    ]);
    expect(mockAuthService.invalidateIdpTokenCache).toHaveBeenCalledWith(
      "auth-user-current",
    );
    expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(
      getUserLootlogConfigCachePattern("discord-123"),
    );
  });
});
