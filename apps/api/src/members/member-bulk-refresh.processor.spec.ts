import type { Mock } from "vitest";
import { mockFn } from "#src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Job } from "bullmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MemberBulkRefreshProcessor } from "./member-bulk-refresh.processor.js";
import { MemberRefreshJobEventsService } from "./member-refresh-job-events.service.js";
import { MembersService } from "./members.service.js";
import { PrismaService } from "#src/db/prisma.service";

describe("MemberBulkRefreshProcessor", () => {
  let processor: MemberBulkRefreshProcessor;
  let membersService: {
    refreshMember: Mock;
  };
  let jobUpdate: Mock;
  let memberRefreshJobEventsService: {
    emitJobUpdate: Mock;
  };
  let logger: {
    log: Mock;
  };

  const createJob = (): Job<{
    jobId: number;
    guildId: string;
    memberIds: string[];
  }> =>
    ({
      data: {
        jobId: 1,
        guildId: "guild-123",
        memberIds: ["discord-1", "discord-2", "discord-3"],
      },
      id: "job-1",
      attemptsMade: 0,
    }) as Job<{
      jobId: number;
      guildId: string;
      memberIds: string[];
    }>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mockMembersService = {
      refreshMember: mockFn(),
    };

    const mockJobUpdate = mockFn();
    const mockPrisma = {
      orm: {
        public: {
          MemberRefreshJob: {
            where: mockFn((where: Record<string, unknown>) => ({
              update: (data: Record<string, unknown>) =>
                mockJobUpdate({ where, data }),
            })),
          },
        },
      },
      raw: { sql: mockFn() },
      runtime: mockFn(),
    };

    const mockMemberRefreshJobEventsService = {
      emitJobUpdate: mockFn().mockResolvedValue(undefined),
    };

    const mockLogger = {
      log: mockFn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberBulkRefreshProcessor,
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
        {
          provide: PrismaService,
          useValue: { db: mockPrisma },
        },
        {
          provide: MemberRefreshJobEventsService,
          useValue: mockMemberRefreshJobEventsService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    processor = module.get<MemberBulkRefreshProcessor>(
      MemberBulkRefreshProcessor,
    );
    membersService = module.get(MembersService);
    jobUpdate = mockJobUpdate;
    memberRefreshJobEventsService = module.get(MemberRefreshJobEventsService);
    logger = module.get(WINSTON_MODULE_PROVIDER);
  });

  it("should classify null and queued refreshes as skipped", async () => {
    membersService.refreshMember
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ refreshQueued: true } as never)
      .mockResolvedValueOnce({ refreshQueued: false } as never);

    await processor.process(createJob());

    expect(membersService.refreshMember).toHaveBeenNthCalledWith(1, {
      discordId: "discord-1",
      guildId: "guild-123",
      skipTtlCheck: true,
    });
    expect(membersService.refreshMember).toHaveBeenNthCalledWith(2, {
      discordId: "discord-2",
      guildId: "guild-123",
      skipTtlCheck: true,
    });
    expect(membersService.refreshMember).toHaveBeenNthCalledWith(3, {
      discordId: "discord-3",
      guildId: "guild-123",
      skipTtlCheck: true,
    });

    expect(jobUpdate).toHaveBeenLastCalledWith({
      where: expect.any(Function),
      data: {
        status: "COMPLETED",
        processedMembers: 3,
        completedAt: expect.any(Temporal.PlainDateTime),
        updatedAt: expect.any(Temporal.PlainDateTime),
      },
    });

    expect(
      memberRefreshJobEventsService.emitJobUpdate,
    ).toHaveBeenLastCalledWith(1, {
      refreshedIds: ["discord-3"],
      skippedIds: ["discord-1", "discord-2"],
      failedIds: [],
    });

    expect(logger.log).toHaveBeenCalledWith({
      level: "debug",
      message:
        "Skipped member discord-1 in job 1 because no member data was returned",
    });
    expect(logger.log).toHaveBeenCalledWith({
      level: "debug",
      message: "Skipped member discord-2 in job 1 because refresh is queued",
    });
    expect(logger.log).toHaveBeenCalledWith({
      level: "debug",
      message: "Successfully refreshed member discord-3 in job 1",
    });
  });
});
