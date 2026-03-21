import { Test, type TestingModule } from "@nestjs/testing";
import { plainToInstance } from "class-transformer";
import { MembersController } from "./members.controller";
import { MembersService } from "./members.service";
import { type Guild, type Member, MemberType } from "prisma/generated/client";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { MemberEntity } from "src/shared/entities/member.entity";
import { MemberRefreshJobEntity } from "src/shared/entities/member-refresh-job.entity";

describe("MembersController", () => {
  let controller: MembersController;
  let membersService: {
    getGuildMemberById: jest.Mock;
    refreshMember: jest.Mock;
    getGuildMembers: jest.Mock;
    createBulkRefreshJob: jest.Mock;
    getLatestRefreshJob: jest.Mock;
    getRefreshJobStatus: jest.Mock;
  };

  const mockGuild: Guild = {
    id: "guild-123",
    name: "Test Guild",
    vanityUrl: null,
    icon: "icon.png",
    ownerId: "owner-123",
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
    updatedAt: new Date(),
    completedAt: null,
  };

  beforeEach(async () => {
    const mockMembersService = {
      getGuildMemberById: jest.fn(),
      refreshMember: jest.fn(),
      getGuildMembers: jest.fn(),
      createBulkRefreshJob: jest.fn(),
      getLatestRefreshJob: jest.fn(),
      getRefreshJobStatus: jest.fn(),
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
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<MembersController>(MembersController);
    membersService = module.get(MembersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      const expectedResult = plainToInstance(MemberEntity, mockMember);
      expect(result).toEqual(expectedResult);
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

      expect(result).toEqual(plainToInstance(MemberEntity, null));
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

      const expectedResult = plainToInstance(MemberEntity, refreshedMember);
      expect(result).toEqual(expectedResult);
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

      const expectedResult = plainToInstance(MemberEntity, refreshedMember);
      expect(result).toEqual(expectedResult);
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

      const result = await controller.getGuildMembers(mockGuild);

      const expectedResult = plainToInstance(MemberEntity, members);
      expect(result).toEqual(expectedResult);
      expect(membersService.getGuildMembers).toHaveBeenCalledWith(
        mockGuild.id,
        false,
      );
    });

    it("should return empty array when no members found", async () => {
      membersService.getGuildMembers.mockResolvedValue([]);

      const result = await controller.getGuildMembers(mockGuild);

      expect(result).toEqual(plainToInstance(MemberEntity, []));
    });
  });

  describe("refreshAllMembers", () => {
    it("should create bulk refresh job", async () => {
      membersService.createBulkRefreshJob.mockResolvedValue(mockRefreshJob);

      const result = await controller.refreshAllMembers(
        mockGuild,
        "discord-123",
      );

      const expectedResult = plainToInstance(
        MemberRefreshJobEntity,
        mockRefreshJob,
      );
      expect(result).toEqual(expectedResult);
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

      const expectedResult = plainToInstance(
        MemberRefreshJobEntity,
        completedJob,
      );
      expect(result).toEqual(expectedResult);
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

      const result = await controller.getRefreshJobStatus("1");

      const expectedResult = plainToInstance(
        MemberRefreshJobEntity,
        processingJob,
      );
      expect(result).toEqual(expectedResult);
      expect(membersService.getRefreshJobStatus).toHaveBeenCalledWith(1);
    });

    it("should parse jobId string to number", async () => {
      membersService.getRefreshJobStatus.mockResolvedValue(mockRefreshJob);

      await controller.getRefreshJobStatus("123");

      expect(membersService.getRefreshJobStatus).toHaveBeenCalledWith(123);
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

      const result = await controller.getRefreshJobStatus("1");

      const expectedResult = plainToInstance(MemberRefreshJobEntity, failedJob);
      expect(result).toEqual(expectedResult);
      expect(result.status).toBe("FAILED");
      expect(result.failedMembers).toBe(7);
    });
  });
});
