import type { Mock } from "vitest";
import { mockFn } from "#src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MemberSyncInterceptor } from "./member-sync.interceptor.js";
import { PRISMA_DB } from "#src/db/prisma.provider";
import { MembersService } from "#src/members/members.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/constants/member-refresh-queue.constant";

describe("MemberSyncInterceptor", () => {
  let interceptor: MemberSyncInterceptor;
  let memberAll: Mock;
  let membersService: {
    getMemberSoftStaleThreshold: Mock;
    queueMemberRefresh: Mock;
  };
  let redisService: {
    get: Mock;
    set: Mock;
  };

  beforeEach(async () => {
    const mockMemberAll = mockFn();
    const query = {
      where: mockFn(() => query),
      select: mockFn(() => query),
      all: mockMemberAll,
    };
    const mockPrisma = {
      orm: {
        public: {
          Member: { where: mockFn(() => query) },
        },
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
        { provide: PRISMA_DB, useValue: mockPrisma },
        { provide: MembersService, useValue: mockMembersService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    interceptor = module.get(MemberSyncInterceptor);
    memberAll = mockMemberAll;
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
      memberAll.mockResolvedValue([]);

      await testInterceptor.queueStaleMemberRefreshes(
        "discord-123",
        "user-123",
        [{ id: "guild-123" }],
      );

      expect(membersService.getMemberSoftStaleThreshold).toHaveBeenCalled();
      expect(memberAll).toHaveBeenCalledTimes(2);
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

      expect(memberAll).not.toHaveBeenCalled();
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
      memberAll.mockResolvedValue([
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
