import type { Mock } from "vitest";
import { mockFn } from "src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MemberSyncInterceptor } from "./member-sync.interceptor";
import { PrismaService } from "src/db/prisma.service";
import { MembersService } from "src/members/members.service";
import { RedisService } from "@lootlog/nest-shared";
import { MEMBER_REFRESH_PRIORITY } from "src/members/constants/member-refresh-queue.constant";

describe("MemberSyncInterceptor", () => {
  let interceptor: MemberSyncInterceptor;
  let prismaService: {
    member: {
      findMany: Mock;
    };
  };
  let membersService: {
    getMemberSoftStaleThreshold: Mock;
    queueMemberRefresh: Mock;
  };
  let redisService: {
    get: Mock;
    set: Mock;
  };

  beforeEach(async () => {
    const mockPrismaService = {
      member: {
        findMany: mockFn(),
      },
    };

    const mockMembersService = {
      getMemberSoftStaleThreshold: mockFn(),
      queueMemberRefresh: mockFn(),
    };

    const mockRedisService = {
      get: mockFn(),
      set: mockFn(),
    };

    const mockLogger = {
      log: mockFn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberSyncInterceptor,
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MembersService, useValue: mockMembersService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    interceptor = module.get(MemberSyncInterceptor);
    prismaService = module.get(PrismaService);
    membersService = module.get(MembersService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("queueStaleMemberRefreshes", () => {
    it("should use the threshold from MembersService", async () => {
      const testInterceptor = interceptor as unknown as {
        queueStaleMemberRefreshes(
          discordId: string,
          userId: string,
          guilds: Array<{ id: string }>,
        ): Promise<void>;
      };
      const threshold = new Date("2026-03-10T10:00:00.000Z");
      redisService.get.mockResolvedValue(null);
      membersService.getMemberSoftStaleThreshold.mockReturnValue(threshold);
      prismaService.member.findMany.mockResolvedValue([]);

      await testInterceptor.queueStaleMemberRefreshes(
        "discord-123",
        "user-123",
        [{ id: "guild-123" }],
      );

      expect(membersService.getMemberSoftStaleThreshold).toHaveBeenCalled();
      expect(prismaService.member.findMany).toHaveBeenCalledWith({
        where: {
          userId: "discord-123",
          guildId: { in: ["guild-123"] },
          globalUserId: { not: null },
          active: true,
          OR: [
            { lastDiscordSyncAt: null },
            { lastDiscordSyncAt: { lt: threshold } },
          ],
        },
        select: {
          userId: true,
          guildId: true,
          globalUserId: true,
        },
      });
    });

    it("should skip querying and queueing when throttled", async () => {
      const testInterceptor = interceptor as unknown as {
        queueStaleMemberRefreshes(
          discordId: string,
          userId: string,
          guilds: Array<{ id: string }>,
        ): Promise<void>;
      };
      redisService.get.mockResolvedValue("1");

      await testInterceptor.queueStaleMemberRefreshes(
        "discord-123",
        "user-123",
        [{ id: "guild-123" }],
      );

      expect(prismaService.member.findMany).not.toHaveBeenCalled();
      expect(membersService.getMemberSoftStaleThreshold).not.toHaveBeenCalled();
      expect(membersService.queueMemberRefresh).not.toHaveBeenCalled();
    });

    it("should queue stale members and set throttle", async () => {
      const testInterceptor = interceptor as unknown as {
        queueStaleMemberRefreshes(
          discordId: string,
          userId: string,
          guilds: Array<{ id: string }>,
        ): Promise<void>;
      };
      redisService.get.mockResolvedValue(null);
      membersService.getMemberSoftStaleThreshold.mockReturnValue(
        new Date("2026-03-10T10:00:00.000Z"),
      );
      prismaService.member.findMany.mockResolvedValue([
        {
          userId: "discord-123",
          guildId: "guild-123",
          globalUserId: "user-123",
        },
      ]);
      membersService.queueMemberRefresh.mockResolvedValue({
        queued: true,
        nextRefreshAt: null,
      });

      await testInterceptor.queueStaleMemberRefreshes(
        "discord-123",
        "user-123",
        [{ id: "guild-123" }],
      );

      expect(redisService.set).toHaveBeenCalledWith(
        "member:sync:throttle:discord-123",
        "1",
        600,
      );
      expect(membersService.queueMemberRefresh).toHaveBeenCalledWith({
        discordId: "discord-123",
        guildId: "guild-123",
        userId: "user-123",
        priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
        reason: "guild-list-sync",
      });
    });
  });
});
