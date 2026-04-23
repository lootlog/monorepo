import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { GuildsService } from "./guilds.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "src/db/prisma.service";
import { ChannelsService } from "src/channels/channels.service";
import { MembersService } from "src/members/members.service";
import { RolesService } from "src/roles/roles.service";
import { DiscordService } from "src/discord/discord.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { DiscordGuildSyncStatus } from "@lootlog/types";
import { type Guild, Permission } from "src/generated/prisma/client";
import { MEMBER_REFRESH_PRIORITY } from "src/members/constants/member-refresh-queue.constant";

vi.mock("src/config/discord-bot.config", () => ({
  discordBotConfig: { channelSnapshotStaleSeconds: 300 },
}));

describe("GuildsService", () => {
  let service: GuildsService;

  const mockLogger = {
    log: mockFn(),
    error: mockFn(),
    warn: mockFn(),
  };

  const mockPrismaService = {
    guild: {
      findMany: mockFn(),
      findFirst: mockFn(),
      findUnique: mockFn(),
      update: mockFn(),
      upsert: mockFn(),
    },
    discordGuildSyncState: {
      findUnique: mockFn(),
    },
    member: {
      findMany: mockFn(),
    },
    timer: {
      findMany: mockFn(),
    },
    lootlogConfigNpc: {
      deleteMany: mockFn(),
    },
    lootlogConfig: {
      deleteMany: mockFn(),
      upsert: mockFn(),
    },
    userSettings: {
      findUnique: mockFn(),
    },
    $transaction: mockFn(),
  };

  const mockTransactionClient = {
    lootlogConfigNpc: {
      deleteMany: mockFn(),
    },
    lootlogConfig: {
      deleteMany: mockFn(),
    },
    guild: {
      update: mockFn(),
    },
  };

  const mockMembersService = {
    getGuildMemberById: mockFn(),
    deleteMembersByGuildId: mockFn(),
    notifyMembersRemoved: mockFn(),
    isMemberSoftStale: mockFn(),
    refreshGuildMemberWithinBudget: mockFn(),
    queueMemberRefresh: mockFn(),
  };

  const mockRolesService = {
    bulkCreateRoles: mockFn(),
    deleteRolesByGuildId: mockFn(),
  };

  const mockChannelsService = {
    markGuildSyncStale: mockFn(),
    refreshGuildDiscordChannels: mockFn(),
  };

  const mockDiscordService = {
    getUserGuilds: mockFn(),
    clearUserGuildIdsCache: mockFn(),
  };

  const mockRedisService = {
    get: mockFn(),
    set: mockFn(),
    del: mockFn(),
    deleteByPattern: mockFn(),
  };

  const mockAmqpConnection = {
    publish: mockFn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildsService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
        {
          provide: ChannelsService,
          useValue: mockChannelsService,
        },
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
        {
          provide: DiscordService,
          useValue: mockDiscordService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    service = module.get<GuildsService>(GuildsService);
    mockPrismaService.$transaction.mockImplementation(
      (
        callback: (
          tx: typeof mockTransactionClient,
        ) => Promise<unknown> | unknown,
      ) => callback(mockTransactionClient),
    );
    mockMembersService.isMemberSoftStale.mockReturnValue(true);
    mockMembersService.refreshGuildMemberWithinBudget.mockResolvedValue({
      member: null,
      refreshQueued: false,
      nextRefreshAt: null,
    });
    mockMembersService.queueMemberRefresh.mockResolvedValue({
      queued: true,
      nextRefreshAt: null,
    });
    mockChannelsService.markGuildSyncStale.mockResolvedValue(undefined);
    mockMembersService.notifyMembersRemoved.mockResolvedValue(undefined);
    mockPrismaService.member.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createGuild = (overrides: Partial<Guild> = {}): Guild => ({
    id: "guild-123",
    name: "Guild",
    vanityUrl: null,
    icon: null,
    ownerId: "owner-123",
    active: true,
    notificationRuleLimit: 20,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("marks discord sync as stale after creating a guild", async () => {
    mockPrismaService.guild.upsert.mockResolvedValue(
      createGuild({ id: "guild-sync" }),
    );
    mockPrismaService.guild.findUnique.mockResolvedValue(
      createGuild({ id: "guild-sync" }),
    );
    mockRolesService.bulkCreateRoles.mockResolvedValue(undefined);
    mockPrismaService.lootlogConfig.upsert.mockResolvedValue(undefined);

    await service.createGuild({
      guildId: "guild-sync",
      name: "Guild Sync",
      icon: null,
      ownerId: "owner-sync",
      roles: [],
    });

    expect(mockChannelsService.markGuildSyncStale).toHaveBeenCalledWith(
      "guild-sync",
    );
  });

  it("bootstraps discord sync status when the cached state is missing", async () => {
    const syncState = {
      guildId: "guild-sync",
      status: DiscordGuildSyncStatus.NOT_FOUND,
      hasRequiredPermissions: false,
      requiredPermissions: ["ViewChannel", "SendMessages"],
      grantedPermissions: [],
      missingPermissions: ["ViewChannel", "SendMessages"],
      channelCount: 0,
      selectableChannelCount: 0,
      lastAttemptAt: "2026-03-31T12:00:00.000Z",
      lastSuccessAt: null,
      lastError: "Guild not found by Discord bot",
      updatedAt: "2026-03-31T12:00:00.000Z",
    };

    mockPrismaService.discordGuildSyncState.findUnique.mockResolvedValue(null);
    mockChannelsService.refreshGuildDiscordChannels.mockResolvedValue({
      channels: [],
      syncState,
    });

    await expect(
      service.getGuildDiscordSyncStatus("guild-sync"),
    ).resolves.toEqual(syncState);
    expect(
      mockChannelsService.refreshGuildDiscordChannels,
    ).toHaveBeenCalledWith("guild-sync");
  });

  describe("getCandidateGuildsForUser", () => {
    it("should map Discord owner/admin metadata onto refresh candidates", async () => {
      const testService = service as unknown as {
        getCandidateGuildsForUser(
          discordId: string,
          userId: string,
        ): Promise<
          Array<{
            guild: Guild;
            isDiscordOwner: boolean;
            hasDiscordAdmin: boolean;
          }>
        >;
      };
      const ownerGuild = createGuild({ id: "guild-owner" });
      const adminGuild = createGuild({ id: "guild-admin" });
      mockDiscordService.getUserGuilds.mockResolvedValue([
        {
          id: "guild-owner",
          permissions: "0",
          owner: true,
          owner_id: "discord-123",
        },
        {
          id: "guild-admin",
          permissions: "8",
          owner: false,
          owner_id: "someone-else",
        },
      ]);
      mockPrismaService.guild.findMany.mockResolvedValue([
        ownerGuild,
        adminGuild,
      ]);

      const result = await testService.getCandidateGuildsForUser(
        "discord-123",
        "user-123",
      );

      expect(result).toEqual([
        {
          guild: ownerGuild,
          isDiscordOwner: true,
          hasDiscordAdmin: false,
        },
        {
          guild: adminGuild,
          isDiscordOwner: false,
          hasDiscordAdmin: true,
        },
      ]);
    });

    it("should fall back to metadata-free candidates when Discord guild lookup fails", async () => {
      const testService = service as unknown as {
        getCandidateGuildsForUser(
          discordId: string,
          userId: string,
        ): Promise<
          Array<{
            guild: Guild;
            isDiscordOwner: boolean;
            hasDiscordAdmin: boolean;
          }>
        >;
      };
      const guild = createGuild({ id: "guild-fallback" });
      mockDiscordService.getUserGuilds.mockRejectedValue(new Error("boom"));
      mockPrismaService.guild.findMany.mockResolvedValue([guild]);

      const result = await testService.getCandidateGuildsForUser(
        "discord-123",
        "user-123",
      );

      expect(result).toEqual([
        {
          guild,
          isDiscordOwner: false,
          hasDiscordAdmin: false,
        },
      ]);
    });
  });

  describe("getCurrentUserGuildAccessSummaries", () => {
    it("falls back to cached accessible guilds when Discord returns no guilds", async () => {
      mockDiscordService.getUserGuilds.mockResolvedValue([]);
      mockPrismaService.guild.findMany.mockResolvedValue([
        createGuild({
          id: "guild-cached",
          name: "Cached",
          ownerId: "owner-cached",
        }),
      ]);
      mockPrismaService.userSettings.findUnique.mockResolvedValue(null);
      mockPrismaService.member.findMany
        .mockResolvedValueOnce([
          {
            guildId: "guild-cached",
            active: true,
            globalUserId: "user-123",
            lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            roles: [
              {
                id: "role-access",
                lvlRangeFrom: null,
                lvlRangeTo: null,
                permissions: [Permission.LOOTLOG_ACCESS],
              },
            ],
          },
        ])
        .mockResolvedValueOnce([
          {
            guildId: "guild-cached",
            active: true,
            globalUserId: "user-123",
            lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            roles: [
              {
                id: "role-access",
                lvlRangeFrom: null,
                lvlRangeTo: null,
                permissions: [Permission.LOOTLOG_ACCESS],
              },
            ],
          },
        ]);
      mockMembersService.isMemberSoftStale.mockReturnValue(false);

      const result = await service.getCurrentUserGuildAccessSummaries(
        "discord-123",
        "user-123",
      );

      expect(result).toEqual([
        {
          id: "guild-cached",
          name: "Cached",
          icon: null,
          vanityUrl: null,
          ownerId: "owner-cached",
          hasLootlogAccess: true,
          isAccessDataStale: false,
        },
      ]);
    });

    it("returns guild access metadata and keeps stale entries when refresh stays queued", async () => {
      mockDiscordService.getUserGuilds.mockResolvedValue([
        {
          id: "guild-access",
          permissions: "0",
          owner: false,
          owner_id: "owner-1",
        },
        {
          id: "guild-stale",
          permissions: "0",
          owner: false,
          owner_id: "owner-2",
        },
      ]);
      mockPrismaService.guild.findMany.mockResolvedValue([
        createGuild({ id: "guild-access", ownerId: "owner-1", name: "Access" }),
        createGuild({ id: "guild-stale", ownerId: "owner-2", name: "Stale" }),
      ]);
      mockPrismaService.member.findMany
        .mockResolvedValueOnce([
          {
            guildId: "guild-access",
            active: true,
            globalUserId: "user-123",
            lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            roles: [
              {
                id: "role-access",
                lvlRangeFrom: null,
                lvlRangeTo: null,
                permissions: [Permission.LOOTLOG_ACCESS],
              },
            ],
          },
        ])
        .mockResolvedValueOnce([
          {
            guildId: "guild-access",
            active: true,
            globalUserId: "user-123",
            lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            roles: [
              {
                id: "role-access",
                lvlRangeFrom: null,
                lvlRangeTo: null,
                permissions: [Permission.LOOTLOG_ACCESS],
              },
            ],
          },
        ]);
      mockPrismaService.userSettings.findUnique.mockResolvedValue({
        guildsOrder: ["guild-stale", "guild-access"],
      });
      mockMembersService.refreshGuildMemberWithinBudget.mockResolvedValue({
        member: null,
        refreshQueued: true,
        nextRefreshAt: null,
      });
      mockMembersService.isMemberSoftStale.mockImplementation((member) => {
        return member?.guildId === "guild-stale";
      });

      const result = await service.getCurrentUserGuildAccessSummaries(
        "discord-123",
        "user-123",
      );

      expect(result).toEqual([
        {
          id: "guild-stale",
          name: "Stale",
          icon: null,
          vanityUrl: null,
          ownerId: "owner-2",
          hasLootlogAccess: false,
          isAccessDataStale: true,
        },
        {
          id: "guild-access",
          name: "Access",
          icon: null,
          vanityUrl: null,
          ownerId: "owner-1",
          hasLootlogAccess: true,
          isAccessDataStale: false,
        },
      ]);
    });

    it("returns accessible guilds with access metadata without waiting on Discord", async () => {
      mockPrismaService.guild.findMany.mockResolvedValue([
        createGuild({ id: "guild-access", ownerId: "owner-1", name: "Access" }),
      ]);
      mockPrismaService.member.findMany.mockResolvedValue([
        {
          guildId: "guild-access",
          active: true,
          globalUserId: "user-123",
          lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          roles: [
            {
              id: "role-access",
              lvlRangeFrom: null,
              lvlRangeTo: null,
              permissions: [Permission.LOOTLOG_ACCESS],
            },
          ],
        },
      ]);
      mockPrismaService.userSettings.findUnique.mockResolvedValue(null);
      mockMembersService.isMemberSoftStale.mockReturnValue(false);

      const result = await service.getCurrentUserAccessibleGuilds(
        "discord-123",
        "user-123",
      );

      expect(mockDiscordService.getUserGuilds).not.toHaveBeenCalled();
      expect(
        mockMembersService.refreshGuildMemberWithinBudget,
      ).not.toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: "guild-access",
          name: "Access",
          icon: null,
          vanityUrl: null,
          ownerId: "owner-1",
          hasLootlogAccess: true,
          isAccessDataStale: false,
        },
      ]);
    });

    it("marks stale accessible guild data and queues a background refresh", async () => {
      mockPrismaService.guild.findMany.mockResolvedValue([
        createGuild({ id: "guild-stale", ownerId: "owner-1", name: "Stale" }),
      ]);
      mockPrismaService.member.findMany.mockResolvedValue([
        {
          guildId: "guild-stale",
          active: true,
          globalUserId: "user-123",
          lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          roles: [
            {
              id: "role-access",
              lvlRangeFrom: null,
              lvlRangeTo: null,
              permissions: [Permission.LOOTLOG_ACCESS],
            },
          ],
        },
      ]);
      mockPrismaService.userSettings.findUnique.mockResolvedValue(null);
      mockMembersService.isMemberSoftStale.mockReturnValue(true);

      const result = await service.getCurrentUserAccessibleGuilds(
        "discord-123",
        "user-123",
      );
      await Promise.resolve();

      expect(result).toEqual([
        {
          id: "guild-stale",
          name: "Stale",
          icon: null,
          vanityUrl: null,
          ownerId: "owner-1",
          hasLootlogAccess: true,
          isAccessDataStale: true,
        },
      ]);
      expect(mockMembersService.queueMemberRefresh).toHaveBeenCalledWith({
        discordId: "discord-123",
        guildId: "guild-stale",
        userId: "user-123",
        priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
        reason: "guild-access-background",
      });
    });
  });

  describe("getUserGuilds", () => {
    it("restores cached accessible guilds for the legacy game source when Discord returns no guilds", async () => {
      mockDiscordService.getUserGuilds.mockResolvedValue([]);
      mockPrismaService.guild.findMany.mockResolvedValue([
        createGuild({
          id: "guild-cached",
          name: "Cached",
          ownerId: "owner-cached",
        }),
      ]);
      mockPrismaService.userSettings.findUnique.mockResolvedValue(null);
      mockPrismaService.member.findMany
        .mockResolvedValueOnce([
          {
            guildId: "guild-cached",
            active: true,
            globalUserId: "user-123",
            lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            roles: [
              {
                id: "role-access",
                lvlRangeFrom: null,
                lvlRangeTo: null,
                permissions: [Permission.LOOTLOG_ACCESS],
              },
            ],
          },
        ])
        .mockResolvedValueOnce([
          {
            guildId: "guild-cached",
            active: true,
            globalUserId: "user-123",
            lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            roles: [
              {
                id: "role-access",
                lvlRangeFrom: null,
                lvlRangeTo: null,
                permissions: [Permission.LOOTLOG_ACCESS],
              },
            ],
          },
        ]);
      mockMembersService.isMemberSoftStale.mockReturnValue(false);

      const result = await service.getUserGuilds(
        "discord-123",
        "user-123",
        "game",
      );

      expect(result).toEqual([
        {
          id: "guild-cached",
          name: "Cached",
          icon: null,
          vanityUrl: null,
          ownerId: "owner-cached",
        },
      ]);
    });

    it("keeps the legacy game source on plain guild output by delegating to accessible guilds", async () => {
      const getCurrentUserAccessibleGuildsSpy = vi
        .spyOn(service, "getCurrentUserAccessibleGuilds")
        .mockResolvedValue([
          {
            id: "guild-access",
            name: "Access",
            icon: null,
            vanityUrl: null,
            ownerId: "owner-1",
            hasLootlogAccess: true,
            isAccessDataStale: false,
          },
        ]);

      const result = await service.getUserGuilds(
        "discord-123",
        "user-123",
        "game",
      );

      expect(getCurrentUserAccessibleGuildsSpy).toHaveBeenCalledWith(
        "discord-123",
        "user-123",
      );
      expect(result).toEqual([
        {
          id: "guild-access",
          name: "Access",
          icon: null,
          vanityUrl: null,
          ownerId: "owner-1",
        },
      ]);
    });

    it("falls back to cached accessible guilds for the legacy default path when Discord returns no guilds", async () => {
      mockDiscordService.getUserGuilds.mockResolvedValue([]);
      mockPrismaService.guild.findMany.mockResolvedValue([
        createGuild({
          id: "guild-cached",
          name: "Cached",
          ownerId: "owner-cached",
        }),
      ]);
      mockPrismaService.member.findMany.mockResolvedValue([
        {
          guildId: "guild-cached",
          active: true,
          globalUserId: "user-123",
          lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          roles: [
            {
              id: "role-access",
              lvlRangeFrom: null,
              lvlRangeTo: null,
              permissions: [Permission.LOOTLOG_ACCESS],
            },
          ],
        },
      ]);
      mockPrismaService.userSettings.findUnique.mockResolvedValue(null);
      mockMembersService.isMemberSoftStale.mockReturnValue(false);

      const result = await service.getUserGuilds("discord-123", "user-123");

      expect(result).toEqual([
        {
          id: "guild-cached",
          name: "Cached",
          icon: null,
          vanityUrl: null,
          ownerId: "owner-cached",
        },
      ]);
    });

    it("returns sorted plain guilds for the legacy default path", async () => {
      mockDiscordService.getUserGuilds.mockResolvedValue([
        {
          id: "guild-a",
          permissions: "0",
          owner: false,
          owner_id: "owner-a",
        },
        {
          id: "guild-b",
          permissions: "0",
          owner: false,
          owner_id: "owner-b",
        },
      ]);
      mockPrismaService.guild.findMany.mockResolvedValue([
        createGuild({ id: "guild-a", name: "Alpha", ownerId: "owner-a" }),
        createGuild({ id: "guild-b", name: "Beta", ownerId: "owner-b" }),
      ]);
      mockPrismaService.userSettings.findUnique.mockResolvedValue({
        guildsOrder: ["guild-b", "guild-a"],
      });

      const result = await service.getUserGuilds("discord-123", "user-123");

      expect(result).toEqual([
        createGuild({ id: "guild-b", name: "Beta", ownerId: "owner-b" }),
        createGuild({ id: "guild-a", name: "Alpha", ownerId: "owner-a" }),
      ]);
    });
  });

  describe("refreshGuildCandidatesWithinBudget", () => {
    it("should prioritize repair cases before Discord admin guilds", async () => {
      const testService = service as unknown as {
        refreshGuildCandidatesWithinBudget(options: {
          discordId: string;
          userId: string;
          guildCandidates: typeof guildCandidates;
          members: typeof members;
          requiredPermissions: Permission[];
          maxImmediateRefreshes: number;
        }): Promise<Guild[]>;
      };
      const guildCandidates = [
        {
          guild: createGuild({ id: "guild-missing" }),
          isDiscordOwner: false,
          hasDiscordAdmin: false,
        },
        {
          guild: createGuild({ id: "guild-no-access" }),
          isDiscordOwner: false,
          hasDiscordAdmin: false,
        },
        {
          guild: createGuild({ id: "guild-admin" }),
          isDiscordOwner: false,
          hasDiscordAdmin: true,
        },
        {
          guild: createGuild({ id: "guild-ordinary" }),
          isDiscordOwner: false,
          hasDiscordAdmin: false,
        },
      ];
      const members = [
        {
          guildId: "guild-no-access",
          active: true,
          globalUserId: "user-123",
          lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          roles: [],
        },
        {
          guildId: "guild-admin",
          active: true,
          globalUserId: "user-123",
          lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          roles: [
            {
              id: "role-admin",
              lvlRangeFrom: null,
              lvlRangeTo: null,
              permissions: [Permission.LOOTLOG_ACCESS],
            },
          ],
        },
        {
          guildId: "guild-ordinary",
          active: true,
          globalUserId: "user-123",
          lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          roles: [
            {
              id: "role-ordinary",
              lvlRangeFrom: null,
              lvlRangeTo: null,
              permissions: [Permission.LOOTLOG_ACCESS],
            },
          ],
        },
      ];
      mockPrismaService.member.findMany.mockResolvedValue(members);

      await testService.refreshGuildCandidatesWithinBudget({
        discordId: "discord-123",
        userId: "user-123",
        guildCandidates,
        members,
        requiredPermissions: [Permission.LOOTLOG_ACCESS],
        maxImmediateRefreshes: 3,
      });

      expect(
        mockMembersService.refreshGuildMemberWithinBudget.mock.calls.map(
          ([call]) => call.guildId,
        ),
      ).toEqual(["guild-missing", "guild-no-access", "guild-admin"]);
      expect(mockMembersService.queueMemberRefresh).toHaveBeenCalledWith({
        discordId: "discord-123",
        guildId: "guild-ordinary",
        userId: "user-123",
        priority: expect.any(Number),
        reason: "guild-connect-background",
      });
    });

    it("should prioritize Discord owner guilds ahead of ordinary stale guilds", async () => {
      const testService = service as unknown as {
        refreshGuildCandidatesWithinBudget(options: {
          discordId: string;
          userId: string;
          guildCandidates: typeof guildCandidates;
          members: typeof members;
          requiredPermissions: Permission[];
          maxImmediateRefreshes: number;
        }): Promise<Guild[]>;
      };
      const guildCandidates = [
        {
          guild: createGuild({ id: "guild-owner", ownerId: "discord-123" }),
          isDiscordOwner: true,
          hasDiscordAdmin: false,
        },
        {
          guild: createGuild({ id: "guild-ordinary" }),
          isDiscordOwner: false,
          hasDiscordAdmin: false,
        },
      ];
      const members = [
        {
          guildId: "guild-owner",
          active: true,
          globalUserId: "user-123",
          lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          roles: [
            {
              id: "role-owner",
              lvlRangeFrom: null,
              lvlRangeTo: null,
              permissions: [Permission.LOOTLOG_ACCESS],
            },
          ],
        },
        {
          guildId: "guild-ordinary",
          active: true,
          globalUserId: "user-123",
          lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          roles: [
            {
              id: "role-ordinary",
              lvlRangeFrom: null,
              lvlRangeTo: null,
              permissions: [Permission.LOOTLOG_ACCESS],
            },
          ],
        },
      ];
      mockPrismaService.member.findMany.mockResolvedValue(members);

      await testService.refreshGuildCandidatesWithinBudget({
        discordId: "discord-123",
        userId: "user-123",
        guildCandidates,
        members,
        requiredPermissions: [Permission.LOOTLOG_ACCESS],
        maxImmediateRefreshes: 1,
      });

      expect(
        mockMembersService.refreshGuildMemberWithinBudget,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockMembersService.refreshGuildMemberWithinBudget,
      ).toHaveBeenCalledWith({
        discordId: "discord-123",
        guildId: "guild-owner",
        userId: "user-123",
        priority: expect.any(Number),
        reason: "guild-connect",
      });
      expect(mockMembersService.queueMemberRefresh).toHaveBeenCalledWith({
        discordId: "discord-123",
        guildId: "guild-ordinary",
        userId: "user-123",
        priority: expect.any(Number),
        reason: "guild-connect-background",
      });
    });
  });

  describe("deleteGuild", () => {
    it("should notify affected members after deleting the guild", async () => {
      const affectedMembers = [
        {
          discordId: "discord-123",
          guildId: "guild-123",
          globalUserId: "user-123",
        },
        {
          discordId: "discord-456",
          guildId: "guild-123",
          globalUserId: "user-456",
        },
      ];
      mockPrismaService.guild.findUnique.mockResolvedValue({
        vanityUrl: "guild-vanity",
      });
      mockMembersService.deleteMembersByGuildId.mockResolvedValue({
        count: 2,
        affectedMembers,
      });
      mockRolesService.deleteRolesByGuildId.mockResolvedValue(undefined);
      mockTransactionClient.lootlogConfigNpc.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockTransactionClient.lootlogConfig.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockTransactionClient.guild.update.mockResolvedValue(
        createGuild({ active: false }),
      );

      await service.deleteGuild({ guildId: "guild-123" });

      expect(mockMembersService.deleteMembersByGuildId).toHaveBeenCalledWith(
        "guild-123",
        { tx: mockTransactionClient },
      );
      expect(mockMembersService.notifyMembersRemoved).toHaveBeenCalledWith(
        affectedMembers,
      );
    });

    it("should not notify affected members when guild deletion fails", async () => {
      const error = new Error("guild delete failed");
      mockPrismaService.guild.findUnique.mockResolvedValue({
        vanityUrl: null,
      });
      mockPrismaService.$transaction.mockRejectedValue(error);

      await expect(
        service.deleteGuild({ guildId: "guild-123" }),
      ).rejects.toThrow(error);

      expect(mockMembersService.notifyMembersRemoved).not.toHaveBeenCalled();
    });
  });
});
