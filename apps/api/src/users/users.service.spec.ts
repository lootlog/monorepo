import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { HttpService } from "@nestjs/axios";
import { RedisService } from "@lootlog/nest-shared/redis";
import { of } from "rxjs";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { AuthService } from "src/auth/auth.service";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { MembersService } from "src/members/members.service";
import { getUserLootlogConfigCachePattern } from "src/shared/constants/cache.constant";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  defaultDetectorSettings,
  defaultNotificationsSettings,
} from "@lootlog/types";
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
    userSettingDocument: {
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
    userSettingDocument: {
      findUnique: mockFn(),
      upsert: mockFn(),
    },
  };
  const mockLogger = { warn: mockFn() };
  const mockAuthService = { invalidateIdpTokenCache: mockFn() };
  const mockMembersService = { notifyMembersRemoved: mockFn() };
  const mockRedisService = { deleteByPattern: mockFn() };
  const mockHttpService = { post: mockFn() };
  const mockGuildsService = {
    getCurrentUserGuildAccessSummaries: mockFn(),
    getCurrentUserAccessibleGuilds: mockFn(),
  };

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
    mockTx.userSettingDocument.deleteMany.mockResolvedValue({ count: 2 });
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
    mockPrismaService.userSettingDocument.findUnique.mockResolvedValue(null);
    mockPrismaService.userSettingDocument.upsert.mockResolvedValue(null);

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
          provide: GuildsService,
          useValue: mockGuildsService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("returns default user preferences with empty notification mutes", async () => {
    mockPrismaService.userSettings.findUnique.mockResolvedValue(null);
    mockPrismaService.userGameAccountSettings.findUnique.mockResolvedValue(
      null,
    );
    mockPrismaService.userSettingDocument.findUnique.mockResolvedValue(null);

    const result = await service.getUserPreferences("auth-user-current");

    expect(mockPrismaService.userSettings.findUnique).toHaveBeenCalledWith({
      where: { userId: "auth-user-current" },
    });
    expect(result).toEqual({
      userId: "auth-user-current",
      guildsOrder: [],
      theme: "default",
      colorMode: "dark",
      chatAppearance: {
        npcLayout: "tile",
        fontScalePercent: 100,
        messageGapPx: 4,
        showTimestamp: true,
        showGuildLabel: true,
        showNpcAvatar: true,
        showNpcLevel: true,
        showNpcLocation: true,
        showNpcCoordinates: true,
      },
      mutes: {
        players: [],
        npcs: [],
      },
    });
  });

  it("normalizes a malformed stored chat appearance value", async () => {
    mockPrismaService.userSettings.findUnique.mockResolvedValue({
      userId: "auth-user-current",
      guildsOrder: ["guild-1"],
      theme: "default",
      colorMode: "dark",
    });
    mockPrismaService.userSettingDocument.findUnique.mockResolvedValue({
      overrides: "broken-json-shape",
    });
    mockPrismaService.userGameAccountSettings.findUnique.mockResolvedValue(
      null,
    );

    const result = await service.getUserPreferences("auth-user-current");

    expect(result.chatAppearance).toEqual(CHAT_APPEARANCE_READABLE_PRESET);
    expect(result.guildsOrder).toEqual(["guild-1"]);
  });

  it("merges and clamps a chat appearance patch without overwriting other preferences", async () => {
    const currentSettings = {
      id: 7,
      userId: "auth-user-current",
      guildsOrder: ["guild-1"],
      theme: "fantasy",
      colorMode: "dark",
      chatAppearance: {
        ...CHAT_APPEARANCE_READABLE_PRESET,
        showNpcAvatar: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrismaService.userSettings.findUnique.mockResolvedValue(
      currentSettings,
    );
    mockPrismaService.userGameAccountSettings.findUnique.mockResolvedValue(
      null,
    );
    mockPrismaService.userSettingDocument.findUnique.mockResolvedValue({
      overrides: {
        chat: {
          ...CHAT_APPEARANCE_READABLE_PRESET,
          showNpcAvatar: false,
        },
      },
    });
    mockPrismaService.userSettingDocument.upsert.mockResolvedValue({
      overrides: {
        chat: {
          ...CHAT_APPEARANCE_READABLE_PRESET,
          showNpcAvatar: false,
          fontScalePercent: 150,
          messageGapPx: 0,
        },
      },
    });

    const result = await service.updateUserPreferences("auth-user-current", {
      chatAppearance: {
        fontScalePercent: 250,
        messageGapPx: -4,
      },
    });

    expect(mockPrismaService.userSettings.upsert).not.toHaveBeenCalled();
    expect(mockPrismaService.userSettingDocument.upsert).toHaveBeenCalledWith({
      where: {
        userId_domain_scopeType_scopeId: {
          userId: "auth-user-current",
          domain: "appearance",
          scopeType: "USER",
          scopeId: "auth-user-current",
        },
      },
      update: {
        overrides: {
          chat: {
            ...CHAT_APPEARANCE_READABLE_PRESET,
            showNpcAvatar: false,
            fontScalePercent: 150,
            messageGapPx: 0,
          },
        },
        schemaVersion: 1,
      },
      create: {
        userId: "auth-user-current",
        domain: "appearance",
        scopeType: "USER",
        scopeId: "auth-user-current",
        overrides: {
          chat: {
            ...CHAT_APPEARANCE_READABLE_PRESET,
            showNpcAvatar: false,
            fontScalePercent: 150,
            messageGapPx: 0,
          },
        },
        schemaVersion: 1,
      },
    });
    expect(result).toMatchObject({
      guildsOrder: ["guild-1"],
      theme: "fantasy",
      chatAppearance: {
        ...currentSettings.chatAppearance,
        fontScalePercent: 150,
        messageGapPx: 0,
      },
    });
  });

  it("delegates current-user guild lookup to GuildsService", async () => {
    mockGuildsService.getCurrentUserGuildAccessSummaries.mockResolvedValue([
      {
        id: "guild-1",
        name: "Alpha",
        icon: null,
        vanityUrl: null,
        ownerId: "owner-1",
        publicStatsCardEnabled: false,
        hasLootlogAccess: true,
        isAccessDataStale: false,
      },
    ]);

    const result = await service.getCurrentUserGuilds(
      "discord-user-current",
      "auth-user-current",
    );

    expect(
      mockGuildsService.getCurrentUserGuildAccessSummaries,
    ).toHaveBeenCalledWith("discord-user-current", "auth-user-current");
    expect(result).toEqual([
      {
        id: "guild-1",
        name: "Alpha",
        icon: null,
        vanityUrl: null,
        ownerId: "owner-1",
        publicStatsCardEnabled: false,
        hasLootlogAccess: true,
        isAccessDataStale: false,
      },
    ]);
  });

  it("delegates accessible current-user guild lookup to GuildsService", async () => {
    mockGuildsService.getCurrentUserAccessibleGuilds.mockResolvedValue([
      {
        id: "guild-1",
        name: "Alpha",
        icon: null,
        vanityUrl: null,
        ownerId: "owner-1",
        publicStatsCardEnabled: false,
        hasLootlogAccess: true,
        isAccessDataStale: false,
      },
    ]);

    const result = await service.getCurrentUserAccessibleGuilds(
      "discord-user-current",
      "auth-user-current",
    );

    expect(
      mockGuildsService.getCurrentUserAccessibleGuilds,
    ).toHaveBeenCalledWith("discord-user-current", "auth-user-current");
    expect(result).toEqual([
      {
        id: "guild-1",
        name: "Alpha",
        icon: null,
        vanityUrl: null,
        ownerId: "owner-1",
        publicStatsCardEnabled: false,
        hasLootlogAccess: true,
        isAccessDataStale: false,
      },
    ]);
  });

  it("updates global notification mutes without requiring account-scoped preferences", async () => {
    mockPrismaService.userGameAccountSettings.findUnique.mockResolvedValue(
      null,
    );
    mockPrismaService.userSettings.findUnique.mockResolvedValue(null);
    mockPrismaService.userGameAccountSettings.upsert.mockResolvedValue({
      id: 10,
      userId: "auth-user-current",
      accountId: "__global-notification-mutes__",
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.updateUserPreferences("auth-user-current", {
      mutes: {
        players: [
          {
            discordId: "discord-1",
            displayName: "Kamil",
          },
          {
            discordId: "discord-1",
            displayName: "Kamil 2",
          },
        ],
        npcs: [
          {
            npcKey: "npc:123",
            npcId: 123,
            name: "Mushita",
            npcType: "HERO",
            lvl: 23,
            prof: "m",
            icon: "mushita.png",
          },
          {
            npcKey: "npc:123",
            npcId: 123,
            name: "Mushita 2",
            npcType: "HERO",
            lvl: 24,
            prof: null,
            icon: null,
          },
        ],
      },
    });

    expect(
      mockPrismaService.userGameAccountSettings.upsert,
    ).toHaveBeenCalledWith({
      where: {
        userId_accountId: {
          userId: "auth-user-current",
          accountId: "__global-notification-mutes__",
        },
      },
      update: {
        settings: {
          mutes: {
            players: [
              {
                discordId: "discord-1",
                displayName: "Kamil 2",
              },
            ],
            npcs: [
              {
                npcKey: "npc:123",
                npcId: 123,
                name: "Mushita 2",
                npcType: "HERO",
                lvl: 24,
                prof: null,
                icon: null,
              },
            ],
          },
        },
        updatedAt: expect.any(Date),
      },
      create: {
        userId: "auth-user-current",
        accountId: "__global-notification-mutes__",
        settings: {
          mutes: {
            players: [
              {
                discordId: "discord-1",
                displayName: "Kamil 2",
              },
            ],
            npcs: [
              {
                npcKey: "npc:123",
                npcId: 123,
                name: "Mushita 2",
                npcType: "HERO",
                lvl: 24,
                prof: null,
                icon: null,
              },
            ],
          },
        },
      },
    });
    expect(result).toEqual({
      userId: "auth-user-current",
      guildsOrder: [],
      theme: "default",
      colorMode: "dark",
      chatAppearance: CHAT_APPEARANCE_READABLE_PRESET,
      mutes: {
        players: [
          {
            discordId: "discord-1",
            displayName: "Kamil 2",
          },
        ],
        npcs: [
          {
            npcKey: "npc:123",
            npcId: 123,
            name: "Mushita 2",
            npcType: "HERO",
            lvl: 24,
            prof: null,
            icon: null,
          },
        ],
      },
    });
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
      airTags: { enabled: false },
      detector: defaultDetectorSettings,
      hasStoredAirTags: false,
      hasStoredDetector: false,
      hasStoredNotifications: false,
      hasStoredPings: false,
      hasStoredPreferences: false,
      notifications: defaultNotificationsSettings,
      pings: { enabled: false },
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
      airTags: { enabled: false },
      detector: defaultDetectorSettings,
      hasStoredAirTags: false,
      hasStoredDetector: false,
      hasStoredNotifications: true,
      hasStoredPings: false,
      hasStoredPreferences: true,
      notifications: expect.objectContaining({
        HERO: expect.objectContaining({
          sound: true,
          guildIds: ["guild-3"],
        }),
      }),
      pings: { enabled: false },
    });
  });

  it("updates detector settings without overwriting stored notifications", async () => {
    mockPrismaService.userGameAccountSettings.findUnique.mockResolvedValue({
      id: 8,
      userId: "auth-user-current",
      accountId: "222",
      settings: {
        notifications: defaultNotificationsSettings,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrismaService.userGameAccountSettings.upsert.mockResolvedValue({
      id: 8,
      userId: "auth-user-current",
      accountId: "222",
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.updateUserGameAccountPreferences(
      "auth-user-current",
      "222",
      {
        detector: {
          routingRules: [
            {
              id: "hero-range-1",
              name: "Hero route",
              minLevel: 100,
              maxLevel: 200,
              world: "pandora",
              guildIds: ["guild-2"],
            },
          ],
        },
      },
    );

    expect(
      mockPrismaService.userGameAccountSettings.upsert,
    ).toHaveBeenCalledWith({
      where: {
        userId_accountId: {
          userId: "auth-user-current",
          accountId: "222",
        },
      },
      update: {
        settings: {
          notifications: defaultNotificationsSettings,
          detector: expect.objectContaining({
            routingRules: [
              {
                id: "hero-range-1",
                name: "Hero route",
                minLevel: 100,
                maxLevel: 200,
                world: "pandora",
                guildIds: ["guild-2"],
              },
            ],
          }),
        },
        updatedAt: expect.any(Date),
      },
      create: expect.objectContaining({
        userId: "auth-user-current",
        accountId: "222",
      }),
    });
    expect(result).toEqual({
      accountId: "222",
      airTags: { enabled: false },
      detector: expect.objectContaining({
        routingRules: [
          {
            id: "hero-range-1",
            name: "Hero route",
            minLevel: 100,
            maxLevel: 200,
            world: "pandora",
            guildIds: ["guild-2"],
          },
        ],
      }),
      hasStoredAirTags: false,
      hasStoredDetector: true,
      hasStoredNotifications: true,
      hasStoredPings: false,
      hasStoredPreferences: true,
      notifications: defaultNotificationsSettings,
      pings: { enabled: false },
    });
  });

  it("updates map pings without overwriting stored notification and detector settings", async () => {
    mockPrismaService.userGameAccountSettings.findUnique.mockResolvedValue({
      id: 9,
      userId: "auth-user-current",
      accountId: "333",
      settings: {
        notifications: defaultNotificationsSettings,
        detector: defaultDetectorSettings,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrismaService.userGameAccountSettings.upsert.mockResolvedValue({});

    const result = await service.updateUserGameAccountPreferences(
      "auth-user-current",
      "333",
      { pings: { enabled: true } },
    );

    expect(
      mockPrismaService.userGameAccountSettings.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          settings: {
            notifications: defaultNotificationsSettings,
            detector: defaultDetectorSettings,
            pings: { enabled: true },
          },
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        pings: { enabled: true },
        notifications: defaultNotificationsSettings,
        detector: defaultDetectorSettings,
        hasStoredPings: true,
      }),
    );
  });

  it("updates AirTags without overwriting stored notification and detector settings", async () => {
    mockPrismaService.userGameAccountSettings.findUnique.mockResolvedValue({
      id: 9,
      userId: "auth-user-current",
      accountId: "333",
      settings: {
        notifications: defaultNotificationsSettings,
        detector: defaultDetectorSettings,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrismaService.userGameAccountSettings.upsert.mockResolvedValue({});

    const result = await service.updateUserGameAccountPreferences(
      "auth-user-current",
      "333",
      { airTags: { enabled: true } },
    );

    expect(
      mockPrismaService.userGameAccountSettings.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          settings: {
            notifications: defaultNotificationsSettings,
            detector: defaultDetectorSettings,
            airTags: { enabled: true },
          },
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        airTags: { enabled: true },
        notifications: defaultNotificationsSettings,
        detector: defaultDetectorSettings,
        hasStoredAirTags: true,
      }),
    );
  });

  it("normalizes detector routing rules when reading stored account settings", async () => {
    mockPrismaService.userGameAccountSettings.findUnique.mockResolvedValue({
      id: 9,
      userId: "auth-user-current",
      accountId: "333",
      settings: {
        detector: {
          HERO: {
            detect: true,
            notifyWindow: true,
            highlight: true,
            notifySound: false,
          },
          routingRules: [
            {
              id: "",
              minLevel: 220,
              maxLevel: 120,
              world: "  Pandora  ",
              guildIds: ["guild-1", 123, "guild-2"],
            },
          ],
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getUserGameAccountPreferences(
      "auth-user-current",
      "333",
    );

    expect(result).toEqual({
      accountId: "333",
      airTags: { enabled: false },
      detector: expect.objectContaining({
        routingRules: [
          {
            id: "rule-1",
            minLevel: 120,
            maxLevel: 220,
            world: "Pandora",
            guildIds: ["guild-1", "guild-2"],
          },
        ],
      }),
      hasStoredAirTags: false,
      hasStoredDetector: true,
      hasStoredNotifications: false,
      hasStoredPings: false,
      hasStoredPreferences: true,
      notifications: defaultNotificationsSettings,
      pings: { enabled: false },
    });
  });

  it("trims detector routing rule names and keeps old rules without name", async () => {
    mockPrismaService.userGameAccountSettings.findUnique.mockResolvedValue({
      id: 10,
      userId: "auth-user-current",
      accountId: "444",
      settings: {
        detector: {
          HERO: {
            detect: true,
            notifyWindow: true,
            highlight: true,
            notifySound: false,
          },
          routingRules: [
            {
              id: "rule-with-name",
              name: "  Bossy hero  ",
              minLevel: 100,
              maxLevel: 200,
              guildIds: ["guild-1"],
            },
            {
              id: "rule-without-name",
              minLevel: 210,
              maxLevel: 300,
              guildIds: ["guild-2"],
            },
          ],
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getUserGameAccountPreferences(
      "auth-user-current",
      "444",
    );

    expect(result).toEqual({
      accountId: "444",
      airTags: { enabled: false },
      detector: expect.objectContaining({
        routingRules: [
          {
            id: "rule-with-name",
            name: "Bossy hero",
            minLevel: 100,
            maxLevel: 200,
            guildIds: ["guild-1"],
          },
          {
            id: "rule-without-name",
            minLevel: 210,
            maxLevel: 300,
            guildIds: ["guild-2"],
          },
        ],
      }),
      hasStoredAirTags: false,
      hasStoredDetector: true,
      hasStoredNotifications: false,
      hasStoredPings: false,
      hasStoredPreferences: true,
      notifications: defaultNotificationsSettings,
      pings: { enabled: false },
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
