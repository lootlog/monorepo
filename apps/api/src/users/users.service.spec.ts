import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { HttpService } from "@nestjs/axios";
import { RedisService } from "@lootlog/nest-shared";
import { of } from "rxjs";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { AuthService } from "src/auth/auth.service";
import { PrismaService } from "src/db/prisma.service";
import { MembersService } from "src/members/members.service";
import { getUserLootlogConfigCachePattern } from "src/shared/constants/cache.constant";
import { UsersService } from "./users.service";

vi.mock("src/config/battlelog.config", () => ({
  battlelogConfig: { serviceUrl: "http://battlelog-service:4000" },
}));

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
      findMany: mockFn(),
      update: mockFn(),
    },
    npcKillStats: {
      deleteMany: mockFn(),
    },
    userKillStats: {
      deleteMany: mockFn(),
    },
    userSettings: {
      deleteMany: mockFn(),
    },
    userGameAccountSettings: {
      deleteMany: mockFn(),
    },
    userTimerSettings: {
      deleteMany: mockFn(),
    },
    userSoundSettings: {
      deleteMany: mockFn(),
    },
    userCharactersLootlogSettings: {
      deleteMany: mockFn(),
    },
    userGuildTimerSettings: {
      deleteMany: mockFn(),
    },
    userGuildEventSettings: {
      deleteMany: mockFn(),
    },
  };

  const mockPrismaService = {
    $transaction: mockFn(),
    userSettings: {
      findUnique: mockFn(),
      upsert: mockFn(),
    },
    userGameAccountSettings: {
      findUnique: mockFn(),
      upsert: mockFn(),
    },
  };
  const mockLogger = { warn: mockFn() };
  const mockAuthService = { invalidateIdpTokenCache: mockFn() };
  const mockMembersService = { notifyMembersRemoved: mockFn() };
  const mockRedisService = { deleteByPattern: mockFn() };
  const mockHttpService = { post: mockFn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPrismaService.$transaction.mockImplementation(
      (callback: (tx: typeof mockTx) => Promise<unknown>) => callback(mockTx),
    );

    mockTx.member.findMany.mockResolvedValue(mockMemberRows);
    mockTx.member.update.mockResolvedValue(undefined);
    mockTx.npcKillStats.deleteMany.mockResolvedValue({ count: 2 });
    mockTx.userKillStats.deleteMany.mockResolvedValue({ count: 3 });
    mockTx.userSettings.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.userGameAccountSettings.deleteMany.mockResolvedValue({ count: 2 });
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
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("returns default game account preferences when no account-scoped settings exist", async () => {
    mockPrismaService.userGameAccountSettings.findUnique.mockResolvedValue(
      null,
    );

    const result = await service.getUserGameAccountPreferences(
      "auth-user-current",
      "12345",
    );

    expect(
      mockPrismaService.userGameAccountSettings.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        userId_accountId: {
          userId: "auth-user-current",
          accountId: "12345",
        },
      },
    });
    expect(result).toEqual({
      accountId: "12345",
      hasStoredPreferences: false,
      notifications: {
        ELITE2: {
          autoHideTimeout: 0,
          guildIds: [],
          highlight: false,
          ignoreOtherWorlds: false,
          show: false,
          sound: false,
        },
        HERO: {
          autoHideTimeout: 0,
          guildIds: [],
          highlight: true,
          ignoreOtherWorlds: false,
          show: true,
          sound: false,
        },
        COLOSSUS: {
          autoHideTimeout: 0,
          guildIds: [],
          highlight: true,
          ignoreOtherWorlds: false,
          show: true,
          sound: false,
        },
        TITAN: {
          autoHideTimeout: 0,
          guildIds: [],
          highlight: true,
          ignoreOtherWorlds: false,
          show: true,
          sound: false,
        },
        message: {
          autoHideTimeout: 0,
          guildIds: [],
          highlight: true,
          ignoreOtherWorlds: false,
          show: true,
          sound: false,
        },
        "party-gathering": {
          autoHideTimeout: 0,
          guildIds: [],
          highlight: true,
          ignoreOtherWorlds: false,
          show: true,
          sound: false,
        },
      },
    });
  });

  it("updates one account bucket without overwriting top-level preferences or other accounts", async () => {
    mockPrismaService.userGameAccountSettings.findUnique.mockResolvedValue({
      id: 7,
      userId: "auth-user-current",
      accountId: "111",
      settings: {
        notifications: {
          ELITE2: {
            show: false,
            highlight: false,
            ignoreOtherWorlds: false,
            autoHideTimeout: 0,
            guildIds: [],
            sound: false,
          },
          HERO: {
            show: true,
            highlight: true,
            ignoreOtherWorlds: false,
            autoHideTimeout: 0,
            guildIds: ["guild-1"],
            sound: false,
          },
          COLOSSUS: {
            show: true,
            highlight: true,
            ignoreOtherWorlds: false,
            autoHideTimeout: 0,
            guildIds: ["guild-1"],
            sound: false,
          },
          TITAN: {
            show: true,
            highlight: true,
            ignoreOtherWorlds: false,
            autoHideTimeout: 0,
            guildIds: ["guild-1"],
            sound: false,
          },
          message: {
            show: true,
            highlight: true,
            ignoreOtherWorlds: false,
            autoHideTimeout: 0,
            guildIds: ["guild-1"],
            sound: false,
          },
          "party-gathering": {
            show: true,
            highlight: true,
            ignoreOtherWorlds: false,
            autoHideTimeout: 0,
            guildIds: ["guild-1"],
            sound: false,
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrismaService.userGameAccountSettings.upsert.mockResolvedValue({
      id: 7,
      userId: "auth-user-current",
      accountId: "111",
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.updateUserGameAccountPreferences(
      "auth-user-current",
      "111",
      {
        notifications: {
          HERO: {
            sound: true,
            guildIds: ["guild-3"],
          },
        },
      },
    );

    expect(
      mockPrismaService.userGameAccountSettings.upsert,
    ).toHaveBeenCalledWith({
      where: {
        userId_accountId: {
          userId: "auth-user-current",
          accountId: "111",
        },
      },
      update: {
        settings: {
          notifications: expect.objectContaining({
            HERO: expect.objectContaining({
              sound: true,
              guildIds: ["guild-3"],
            }),
          }),
        },
        updatedAt: expect.any(Date),
      },
      create: expect.objectContaining({
        userId: "auth-user-current",
        accountId: "111",
      }),
    });
    expect(result).toEqual({
      accountId: "111",
      hasStoredPreferences: true,
      notifications: expect.objectContaining({
        HERO: expect.objectContaining({
          sound: true,
          guildIds: ["guild-3"],
        }),
      }),
    });
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
    expect(mockTx.userGameAccountSettings.deleteMany).toHaveBeenCalledWith({
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
