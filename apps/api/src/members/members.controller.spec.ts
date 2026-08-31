import { ForbiddenException } from "@nestjs/common";
import type { Mock } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  type Guild,
  type Member,
  MemberType,
  Permission,
} from "#src/db/domain";
import { AuthGuard } from "@lootlog/nest-shared";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";
import { mockFn } from "#src/test/mock-fn";
import { MembersController } from "./members.controller.js";
import { MembersService } from "./members.service.js";

describe("MembersController", () => {
  let controller: MembersController;
  let membersService: {
    getGuildMemberById: Mock;
    refreshMember: Mock;
    deactivateMember: Mock;
    getGuildMembers: Mock;
    getGuildMemberReferences: Mock;
    getGuildMembersSummary: Mock;
    getMemberLootlogConfigSummary: Mock;
    createBulkRefreshJob: Mock;
    getLatestRefreshJob: Mock;
    getRefreshJobStatus: Mock;
  };

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

  const mockRefreshJob = {
    id: 1,
    guildId: "guild-123",
    requestedBy: "discord-123",
    status: "PENDING" as const,
    totalMembers: 10,
    processedMembers: 0,
    failedMembers: 0,
    createdAt: new Date(),
    nextAvailableAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  };

  beforeEach(async () => {
    const mockMembersService = {
      getGuildMemberById: mockFn(),
      refreshMember: mockFn(),
      deactivateMember: mockFn(),
      getGuildMembers: mockFn(),
      getGuildMemberReferences: mockFn(),
      getGuildMembersSummary: mockFn(),
      getMemberLootlogConfigSummary: mockFn(),
      createBulkRefreshJob: mockFn(),
      getLatestRefreshJob: mockFn(),
      getRefreshJobStatus: mockFn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: mockFn().mockReturnValue(true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: mockFn().mockReturnValue(true) })
      .compile();

    controller = module.get<MembersController>(MembersController);
    membersService = module.get(MembersService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should be defined", () => {
      expect(controller).toBeDefined();
    });
  });

  describe("getMe", () => {
    it("should return current member", async () => {
      membersService.getGuildMemberById.mockResolvedValue(mockMember);

      const result = await controller.getMe(
        "discord-123",
        "user-123",
        "guild-123",
      );

      expect(result).toEqual(mockMember);
      expect(membersService.getGuildMemberById).toHaveBeenCalledWith({
        discordId: "discord-123",
        guildId: "guild-123",
        userId: "user-123",
        standalone: true,
      });
    });

    it("should return null when member not found", async () => {
      membersService.getGuildMemberById.mockResolvedValue(null);

      const result = await controller.getMe(
        "discord-123",
        "user-123",
        "guild-123",
      );

      expect(result).toBeNull();
    });
  });

  describe("refreshMe", () => {
    it("should refresh current member", async () => {
      const refreshedMember = { ...mockMember, name: "Updated Name" };
      membersService.getGuildMemberById.mockResolvedValue(refreshedMember);

      const result = await controller.refreshMe(
        "discord-123",
        "user-123",
        "guild-123",
      );

      expect(result).toEqual(refreshedMember);
      expect(membersService.getGuildMemberById).toHaveBeenCalledWith({
        discordId: "discord-123",
        guildId: "guild-123",
        userId: "user-123",
        refresh: true,
        standalone: true,
      });
    });
  });

  describe("refreshMember", () => {
    it("should refresh specific member (admin only)", async () => {
      const refreshedMember = { ...mockMember, userId: "discord-456" };
      membersService.refreshMember.mockResolvedValue(refreshedMember);

      const result = await controller.refreshMember("discord-456", mockGuild);

      expect(result).toEqual(refreshedMember);
      expect(membersService.refreshMember).toHaveBeenCalledWith({
        discordId: "discord-456",
        guildId: mockGuild.id,
      });
    });

    it("should return null when Discord confirms that member is gone", async () => {
      membersService.refreshMember.mockResolvedValue(null);

      const result = await controller.refreshMember("discord-456", mockGuild);

      expect(result).toBeNull();
      expect(membersService.refreshMember).toHaveBeenCalledWith({
        discordId: "discord-456",
        guildId: mockGuild.id,
      });
    });
  });

  describe("getGuildMembers", () => {
    it("should return all guild members", async () => {
      const members = [
        mockMember,
        { ...mockMember, id: 456, userId: "discord-456" },
        { ...mockMember, id: 789, userId: "discord-789" },
      ];
      membersService.getGuildMembers.mockResolvedValue(members);

      const result = await controller.getGuildMembers(mockGuild, [
        Permission.LOOTLOG_ACCESS,
      ]);

      expect(result).toEqual(members);
      expect(membersService.getGuildMembers).toHaveBeenCalledWith(
        mockGuild.id,
        false,
      );
    });

    it("should return empty array when no members found", async () => {
      membersService.getGuildMembers.mockResolvedValue([]);

      const result = await controller.getGuildMembers(mockGuild, [
        Permission.LOOTLOG_ACCESS,
      ]);

      expect(result).toEqual([]);
    });

    it("should allow admins to include inactive full member details", async () => {
      const members = [mockMember, { ...mockMember, id: 456, active: false }];
      membersService.getGuildMembers.mockResolvedValue(members);

      const result = await controller.getGuildMembers(
        mockGuild,
        [Permission.ADMIN],
        "true",
      );

      expect(result).toEqual(members);
      expect(membersService.getGuildMembers).toHaveBeenCalledWith(
        mockGuild.id,
        true,
      );
    });

    it("should reject inactive full member details for non-admins", () => {
      expect(() =>
        controller.getGuildMembers(
          mockGuild,
          [Permission.LOOTLOG_ACCESS],
          "true",
        ),
      ).toThrow(ForbiddenException);

      expect(membersService.getGuildMembers).not.toHaveBeenCalled();
    });
  });

  describe("getGuildMemberReferences", () => {
    it("should return limited inactive member references", async () => {
      const members = [
        {
          id: 123,
          userId: "discord-123",
          name: "Test User",
          avatar: "avatar.png",
          color: 123456,
          active: false,
        },
      ];
      membersService.getGuildMemberReferences.mockResolvedValue(members);

      const result = await controller.getGuildMemberReferences(
        mockGuild,
        "true",
      );

      expect(result).toEqual(members);
      expect(membersService.getGuildMemberReferences).toHaveBeenCalledWith(
        mockGuild.id,
        true,
      );
    });
  });

  describe("deactivateMember", () => {
    it("should deactivate member", async () => {
      const deactivatedMember = { ...mockMember, active: false };
      membersService.deactivateMember.mockResolvedValue(deactivatedMember);

      const result = await controller.deactivateMember(
        "discord-456",
        mockGuild,
      );

      expect(result).toEqual(deactivatedMember);
      expect(membersService.deactivateMember).toHaveBeenCalledWith({
        discordId: "discord-456",
        guildId: mockGuild.id,
      });
    });
  });

  describe("getMemberLootlogConfigSummary", () => {
    it("should return guild-scoped lootlog config summary", async () => {
      const summary = {
        memberUserId: "discord-123",
        guildId: "guild-123",
        isActive: true,
        configuredCharacterCount: 1,
        enabledCharacterCount: 1,
        characters: [
          {
            accountId: "123",
            characterId: "456",
            enabledForGuild: true,
            characterName: "Rhay",
            world: "Berufs",
            icon: "icon.png",
            metadataStatus: "resolved" as const,
          },
        ],
      };
      membersService.getMemberLootlogConfigSummary.mockResolvedValue(summary);

      const result = await controller.getMemberLootlogConfigSummary(
        "discord-123",
        mockGuild,
      );

      expect(result).toEqual(summary);
      expect(membersService.getMemberLootlogConfigSummary).toHaveBeenCalledWith(
        {
          discordId: "discord-123",
          guildId: mockGuild.id,
        },
      );
    });
  });

  describe("getGuildMembersSummary", () => {
    it("should return lightweight guild members", async () => {
      const members = [
        {
          id: 123,
          userId: "discord-123",
          name: "Test User",
          avatar: "avatar.png",
          color: 123456,
        },
      ];
      membersService.getGuildMembersSummary.mockResolvedValue(members);

      const result = await controller.getGuildMembersSummary(mockGuild);

      expect(result).toEqual(members);
      expect(membersService.getGuildMembersSummary).toHaveBeenCalledWith(
        mockGuild.id,
      );
    });
  });

  describe("refreshAllMembers", () => {
    it("should create bulk refresh job", async () => {
      membersService.createBulkRefreshJob.mockResolvedValue(mockRefreshJob);

      const result = await controller.refreshAllMembers(
        mockGuild,
        "discord-123",
      );

      expect(result).toEqual(mockRefreshJob);
      expect(membersService.createBulkRefreshJob).toHaveBeenCalledWith(
        mockGuild.id,
        "discord-123",
      );
    });
  });

  describe("getLatestRefreshJob", () => {
    it("should return latest refresh job for guild", async () => {
      const completedJob = {
        ...mockRefreshJob,
        status: "COMPLETED" as const,
        processedMembers: 10,
        completedAt: new Date(),
      };
      membersService.getLatestRefreshJob.mockResolvedValue(completedJob);

      const result = await controller.getLatestRefreshJob(mockGuild);

      expect(result).toEqual(completedJob);
      expect(membersService.getLatestRefreshJob).toHaveBeenCalledWith(
        mockGuild.id,
      );
    });

    it("should return null when no jobs found", async () => {
      membersService.getLatestRefreshJob.mockResolvedValue(null);

      const result = await controller.getLatestRefreshJob(mockGuild);

      expect(result).toBeNull();
    });
  });

  describe("getRefreshJobStatus", () => {
    it("should return job status by ID", async () => {
      const processingJob = {
        ...mockRefreshJob,
        status: "PROCESSING" as const,
        processedMembers: 5,
      };
      membersService.getRefreshJobStatus.mockResolvedValue(processingJob);

      const result = await controller.getRefreshJobStatus(mockGuild, 1);

      expect(result).toEqual(processingJob);
      expect(membersService.getRefreshJobStatus).toHaveBeenCalledWith({
        guildId: mockGuild.id,
        jobId: 1,
      });
    });

    it("should handle failed job status", async () => {
      const failedJob = {
        ...mockRefreshJob,
        status: "FAILED" as const,
        processedMembers: 3,
        failedMembers: 7,
        completedAt: new Date(),
      };
      membersService.getRefreshJobStatus.mockResolvedValue(failedJob);

      const result = await controller.getRefreshJobStatus(mockGuild, 1);

      expect(result).toEqual(failedJob);
      expect(result.status).toBe("FAILED");
      expect(result.failedMembers).toBe(7);
    });
  });
});
