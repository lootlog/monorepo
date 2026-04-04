import { Test, type TestingModule } from "@nestjs/testing";
import { GuildsService } from "./guilds.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "src/db/prisma.service";
import { ChannelsService } from "src/channels/channels.service";
import { ConfigService } from "@nestjs/config";
import { MembersService } from "src/members/members.service";
import { RolesService } from "src/roles/roles.service";
import { DiscordService } from "src/discord/discord.service";
import { RedisService } from "@lootlog/nest-shared";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { DiscordGuildSyncStatus } from "@lootlog/types";
import { type Guild, Permission } from "src/generated/prisma/client";

describe("GuildsService", () => {
  let service: GuildsService;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockPrismaService = {
    guild: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    discordGuildSyncState: {
      findUnique: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
    },
    timer: {
      findMany: jest.fn(),
    },
    lootlogConfigNpc: {
      deleteMany: jest.fn(),
    },
    lootlogConfig: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockTransactionClient = {
    lootlogConfigNpc: {
      deleteMany: jest.fn(),
    },
    lootlogConfig: {
      deleteMany: jest.fn(),
    },
    guild: {
      update: jest.fn(),
    },
  };

  const mockMembersService = {
    getGuildMemberById: jest.fn(),
    deleteMembersByGuildId: jest.fn(),
    notifyMembersRemoved: jest.fn(),
    isMemberSoftStale: jest.fn(),
    refreshGuildMemberWithinBudget: jest.fn(),
    queueMemberRefresh: jest.fn(),
  };

  const mockRolesService = {
    bulkCreateRoles: jest.fn(),
    deleteRolesByGuildId: jest.fn(),
  };

  const mockChannelsService = {
    markGuildSyncStale: jest.fn(),
    refreshGuildDiscordChannels: jest.fn(),
  };

  const mockDiscordService = {
    getUserGuilds: jest.fn(),
    clearUserGuildIdsCache: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    deleteByPattern: jest.fn(),
  };

  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      channelSnapshotStaleSeconds: 300,
    }),
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
          provide: ConfigService,
          useValue: mockConfigService,
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
      async (
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
    jest.clearAllMocks();
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

      const result = await (service as any).getCandidateGuildsForUser(
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
      const guild = createGuild({ id: "guild-fallback" });
      mockDiscordService.getUserGuilds.mockRejectedValue(new Error("boom"));
      mockPrismaService.guild.findMany.mockResolvedValue([guild]);

      const result = await (service as any).getCandidateGuildsForUser(
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

  describe("refreshGuildCandidatesWithinBudget", () => {
    it("should prioritize repair cases before Discord admin guilds", async () => {
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

      await (service as any).refreshGuildCandidatesWithinBudget({
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

      await (service as any).refreshGuildCandidatesWithinBudget({
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
