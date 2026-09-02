import type { Mock } from "vitest";
import { mockFn } from "#src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Job } from "bullmq";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import { MemberBulkRefreshProcessor } from "./member-bulk-refresh.processor.js";
import { MemberRefreshJobEventsService } from "./member-refresh-job-events.service.js";
import { MemberRefreshJobRepository } from "./member-refresh-job.repository.js";
import { MembersService } from "./members.service.js";

describe("MemberBulkRefreshProcessor", () => {
  let processor: MemberBulkRefreshProcessor;
  let membersService: {
    refreshMember: Mock;
  };
  let refreshJobStorage: {
    memberRefreshJob: {
      update: Mock;
      findUnique: Mock;
    };
  };
  let memberRefreshJobEventsService: {
    emitJobUpdate: Mock;
  };
  let logger: {
    log: Mock;
  };

  const mockJobRecord = {
    id: 1,
    guildId: "guild-123",
    requestedBy: "discord-999",
    status: "PROCESSING",
    totalMembers: 3,
    processedMembers: 0,
    failedMembers: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
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

    const mockRefreshJobStorage = {
      memberRefreshJob: {
        update: mockFn(),
        findUnique: mockFn().mockResolvedValue(mockJobRecord),
      },
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
          provide: MemberRefreshJobRepository,
          useValue: {
            update: (id: number, data: unknown) =>
              mockRefreshJobStorage.memberRefreshJob.update({
                where: { id },
                data,
              }),
            incrementFailed: (id: number) =>
              mockRefreshJobStorage.memberRefreshJob.update({
                where: { id },
                data: { failedMembers: { increment: 1 } },
              }),
          },
        },
        {
          provide: MemberRefreshJobEventsService,
          useValue: mockMemberRefreshJobEventsService,
        },
        {
          provide: APPLICATION_LOGGER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    processor = module.get<MemberBulkRefreshProcessor>(
      MemberBulkRefreshProcessor,
    );
    membersService = module.get(MembersService);
    refreshJobStorage = mockRefreshJobStorage as never;
    memberRefreshJobEventsService = module.get(MemberRefreshJobEventsService);
    logger = module.get(APPLICATION_LOGGER);
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

    expect(refreshJobStorage.memberRefreshJob.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: "COMPLETED",
        processedMembers: 3,
        completedAt: expect.any(Date),
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
