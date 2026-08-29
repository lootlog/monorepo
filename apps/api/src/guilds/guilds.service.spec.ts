import { Test, type TestingModule } from "@nestjs/testing";
import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from "@nestjs/common";
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
import { UserGuildAccessResolver } from "./user-guild-access-resolver.service";

vi.mock("src/config/discord-bot.config", () => ({
  discordBotConfig: { channelSnapshotStaleSeconds: 300 },
}));

describe("GuildsService", () => {
  let service: GuildsService;
  let userGuildAccessResolver: UserGuildAccessResolver;

  const mockLogger = {
    log: mockFn(),
    error: mockFn(),
    warn: mockFn(),
    debug: mockFn(),
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
    deactivateMembersMissingFromDiscordGuilds: mockFn(),
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
    getFreshCompleteUserGuilds: mockFn(),
    clearUserGuildIdsCache: mockFn(),
  };

  const mockRedisService = {
    get: mockFn(),
    getJson: mockFn(),
    set: mockFn(),
    setJson: mockFn(),
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
        UserGuildAccessResolver,
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
    userGuildAccessResolver = module.get(UserGuildAccessResolver);
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
    mockMembersService.deactivateMembersMissingFromDiscordGuilds.mockResolvedValue(
      0,
    );
    mockPrismaService.member.findMany.mockResolvedValue([]);
    mockRedisService.get.mockResolvedValue(null);
    mockRedisService.getJson.mockResolvedValue(null);
    mockRedisService.set.mockResolvedValue(undefined);
    mockRedisService.setJson.mockResolvedValue(undefined);
    mockRedisService.del.mockResolvedValue(undefined);
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
    publicStatsCardEnabled: false,
    reservationMaxDurationMinutes: 180,
    reservationMinDurationMinutes: 30,
    reservationTimeGranularityMinutes: 15,
    reservationMaxAdvanceDays: 7,
    reservationActiveLimitPerSpot: 3,
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
      const ownerGuild = createGuild({ id: "guild-owner" });
      const adminGuild = createGuild({ id: "guild-admin" });
      mockDiscordService.getFreshCompleteUserGuilds.mockResolvedValue({
        guilds: [
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
        ],
        fresh: true,
        complete: true,
      });
      mockPrismaService.guild.findMany.mockResolvedValue([
        ownerGuild,
        adminGuild,
      ]);

      const result = await userGuildAccessResolver.getCandidateGuildsForUser(
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

    it("should propagate Discord guild lookup failures without DB fallback", async () => {
      const error = new Error("boom");
      mockDiscordService.getFreshCompleteUserGuilds.mockRejectedValue(error);

      await expect(
        userGuildAccessResolver.getCandidateGuildsForUser(
          "discord-123",
          "user-123",
        ),
      ).rejects.toBe(error);
      expect(mockDiscordService.getUserGuilds).not.toHaveBeenCalled();
      expect(
        mockMembersService.deactivateMembersMissingFromDiscordGuilds,
      ).not.toHaveBeenCalled();
    });

    it("should reconcile active members only after a successful Discord guild lookup", async () => {
      mockDiscordService.getFreshCompleteUserGuilds.mockResolvedValue({
        guilds: [
          {
            id: "guild-present",
            permissions: "0",
            owner: false,
            owner_id: "owner-1",
          },
        ],
        fresh: true,
        complete: true,
      });
      mockPrismaService.guild.findMany.mockResolvedValue([
        createGuild({ id: "guild-present", ownerId: "owner-1" }),
      ]);

      await userGuildAccessResolver.getCandidateGuildsForUser(
        "discord-123",
        "user-123",
      );

      expect(
        mockDiscordService.getFreshCompleteUserGuilds,
      ).toHaveBeenCalledWith("user-123", "discord-123");
      expect(mockDiscordService.getUserGuilds).not.toHaveBeenCalled();
      expect(
        mockMembersService.deactivateMembersMissingFromDiscordGuilds,
      ).toHaveBeenCalledWith({
        discordId: "discord-123",
        userId: "user-123",
        activeDiscordGuildIds: ["guild-present"],
        status: "GUILD_NOT_IN_DISCORD_LIST",
      });
    });
  });

  describe("getCurrentUserGuildAccessSummaries", () => {
    it("returns no guilds when Discord successfully returns an empty guild list", async () => {
      mockDiscordService.getFreshCompleteUserGuilds.mockResolvedValue({
        guilds: [],
        fresh: true,
        complete: true,
      });

      const result = await service.getCurrentUserGuildAccessSummaries(
        "discord-123",
        "user-123",
      );

      expect(result).toEqual([]);
      expect(
        mockMembersService.deactivateMembersMissingFromDiscordGuilds,
      ).toHaveBeenCalledWith({
        discordId: "discord-123",
        userId: "user-123",
        activeDiscordGuildIds: [],
        status: "GUILD_NOT_IN_DISCORD_LIST",
      });
    });

    it("returns guild access metadata and keeps stale entries when refresh stays queued", async () => {
      mockDiscordService.getFreshCompleteUserGuilds.mockResolvedValue({
        guilds: [
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
        ],
        fresh: true,
        complete: true,
      });
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
          publicStatsCardEnabled: false,
          hasLootlogAccess: false,
          isAccessDataStale: true,
        },
        {
          id: "guild-access",
          name: "Access",
          icon: null,
          vanityUrl: null,
          ownerId: "owner-1",
          publicStatsCardEnabled: false,
          hasLootlogAccess: true,
          isAccessDataStale: false,
        },
      ]);
    });

    it("falls back to stale local accessible guilds when Discord guild list is rate limited", async () => {
      mockDiscordService.getFreshCompleteUserGuilds.mockRejectedValue(
        new HttpException(
          {
            message: "DISCORD_RATE_LIMITED",
            retryAfter: 5,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
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

      const result = await service.getCurrentUserGuildAccessSummaries(
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
          publicStatsCardEnabled: false,
          hasLootlogAccess: true,
          isAccessDataStale: true,
        },
      ]);
      expect(
        mockMembersService.deactivateMembersMissingFromDiscordGuilds,
      ).not.toHaveBeenCalled();
      expect(
        mockMembersService.refreshGuildMemberWithinBudget,
      ).not.toHaveBeenCalled();
      expect(mockMembersService.queueMemberRefresh).not.toHaveBeenCalled();
    });

    it("falls back to stale local accessible guilds when Discord guild list is temporarily unavailable", async () => {
      mockDiscordService.getFreshCompleteUserGuilds.mockRejectedValue(
        new ServiceUnavailableException({
          message: "DISCORD_GUILDS_SINGLE_FLIGHT_LOCK_UNAVAILABLE",
        }),
      );
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

      const result = await service.getCurrentUserGuildAccessSummaries(
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
          publicStatsCardEnabled: false,
          hasLootlogAccess: true,
          isAccessDataStale: true,
        },
      ]);
      expect(
        mockMembersService.deactivateMembersMissingFromDiscordGuilds,
      ).not.toHaveBeenCalled();
      expect(
        mockMembersService.refreshGuildMemberWithinBudget,
      ).not.toHaveBeenCalled();
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
        mockDiscordService.getFreshCompleteUserGuilds,
      ).not.toHaveBeenCalled();
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
          publicStatsCardEnabled: false,
          hasLootlogAccess: true,
          isAccessDataStale: false,
        },
      ]);
      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        "user:user-123:discord:discord-123:accessible-guilds",
        result,
        30,
      );
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
          publicStatsCardEnabled: false,
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

    it("returns cached accessible guilds and refreshes stale entries in the background", async () => {
      const cachedGuilds = [
        {
          id: "guild-stale",
          name: "Stale",
          icon: null,
          vanityUrl: null,
          ownerId: "owner-1",
          publicStatsCardEnabled: false,
          hasLootlogAccess: true,
          isAccessDataStale: true,
        },
      ];
      mockRedisService.getJson.mockResolvedValueOnce(cachedGuilds);

      const result = await service.getCurrentUserAccessibleGuilds(
        "discord-123",
        "user-123",
      );
      await Promise.resolve();

      expect(result).toEqual(cachedGuilds);
      expect(mockPrismaService.guild.findMany).not.toHaveBeenCalled();
      expect(mockPrismaService.member.findMany).not.toHaveBeenCalled();
      expect(mockMembersService.queueMemberRefresh).toHaveBeenCalledWith({
        discordId: "discord-123",
        guildId: "guild-stale",
        userId: "user-123",
        priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
        reason: "guild-access-cache-background",
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
          publicStatsCardEnabled: false,
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
            publicStatsCardEnabled: false,
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
          publicStatsCardEnabled: false,
        },
      ]);
    });

    it("returns an empty list for the legacy default path when Discord returns no guilds", async () => {
      mockDiscordService.getFreshCompleteUserGuilds.mockResolvedValue({
        guilds: [],
        fresh: true,
        complete: true,
      });

      const result = await service.getUserGuilds("discord-123", "user-123");

      expect(result).toEqual([]);
      expect(
        mockMembersService.deactivateMembersMissingFromDiscordGuilds,
      ).toHaveBeenCalledWith({
        discordId: "discord-123",
        userId: "user-123",
        activeDiscordGuildIds: [],
        status: "GUILD_NOT_IN_DISCORD_LIST",
      });
    });

    it("returns sorted plain guilds for the legacy default path", async () => {
      mockDiscordService.getFreshCompleteUserGuilds.mockResolvedValue({
        guilds: [
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
        ],
        fresh: true,
        complete: true,
      });
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

  describe("getUserGuildsWithPermissions", () => {
    it("uses cached database permissions without calling Discord", async () => {
      mockRedisService.getJson.mockReset();
      mockPrismaService.guild.findMany.mockReset();
      mockPrismaService.member.findMany.mockReset();
      mockRedisService.getJson.mockResolvedValue(null);
      mockPrismaService.guild.findMany.mockResolvedValue([
        createGuild({
          id: "guild-access",
          name: "Access",
          ownerId: "owner-1",
        }),
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

      const result = await service.getUserGuildsWithPermissions(
        "discord-123",
        "user-123",
      );

      expect(mockDiscordService.getUserGuilds).not.toHaveBeenCalled();
      expect(
        mockDiscordService.getFreshCompleteUserGuilds,
      ).not.toHaveBeenCalled();
      expect(
        mockMembersService.refreshGuildMemberWithinBudget,
      ).not.toHaveBeenCalled();
      expect(result).toEqual([
        {
          guild: { id: "guild-access", ownerId: "owner-1" },
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
      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        "user:user-123:discord:discord-123:guild-permissions",
        result,
        60,
      );
    });

    it("returns cached guild permissions when available", async () => {
      const cachedPermissions = [
        {
          guild: { id: "guild-cached", ownerId: "owner-1" },
          roles: [],
        },
      ];
      mockRedisService.getJson.mockResolvedValue(cachedPermissions);

      const result = await service.getUserGuildsWithPermissions(
        "discord-123",
        "user-123",
      );

      expect(result).toEqual(cachedPermissions);
      expect(mockPrismaService.guild.findMany).not.toHaveBeenCalled();
      expect(mockDiscordService.getUserGuilds).not.toHaveBeenCalled();
      expect(
        mockDiscordService.getFreshCompleteUserGuilds,
      ).not.toHaveBeenCalled();
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

  describe("updateGuildConfig", () => {
    it("updates reservation settings and clears guild cache", async () => {
      const updatedGuild = createGuild({
        reservationMaxDurationMinutes: 240,
        reservationMinDurationMinutes: 15,
        reservationTimeGranularityMinutes: 5,
        reservationMaxAdvanceDays: 14,
        reservationActiveLimitPerSpot: 4,
      });

      mockPrismaService.guild.findUnique.mockResolvedValue({
        vanityUrl: "guild-vanity",
        reservationMinDurationMinutes: 30,
        reservationMaxDurationMinutes: 180,
      });
      mockPrismaService.guild.update.mockResolvedValue(updatedGuild);

      await expect(
        service.updateGuildConfig("guild-123", {
          reservationMaxDurationMinutes: 240,
          reservationMinDurationMinutes: 15,
          reservationTimeGranularityMinutes: 5,
          reservationMaxAdvanceDays: 14,
          reservationActiveLimitPerSpot: 4,
        }),
      ).resolves.toEqual(updatedGuild);

      expect(mockPrismaService.guild.update).toHaveBeenCalledWith({
        where: { id: "guild-123" },
        data: {
          reservationMaxDurationMinutes: 240,
          reservationMinDurationMinutes: 15,
          reservationTimeGranularityMinutes: 5,
          reservationMaxAdvanceDays: 14,
          reservationActiveLimitPerSpot: 4,
        },
      });
      expect(mockRedisService.del).toHaveBeenCalledWith("guild:guild-123");
      expect(mockRedisService.del).toHaveBeenCalledWith("guild:guild-vanity");
    });

    it("rejects reservation minimum duration greater than maximum duration", async () => {
      await expect(
        service.updateGuildConfig("guild-123", {
          reservationMinDurationMinutes: 90,
          reservationMaxDurationMinutes: 60,
        }),
      ).rejects.toMatchObject({
        response: {
          message: "errors.guilds.reservations.durationRangeInvalid",
        },
        status: 400,
      });

      expect(mockPrismaService.guild.update).not.toHaveBeenCalled();
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
