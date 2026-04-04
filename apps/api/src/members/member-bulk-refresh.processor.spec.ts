import type { Mock } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Job } from "bullmq";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MemberBulkRefreshProcessor } from "./member-bulk-refresh.processor";
import { MembersService } from "./members.service";
import { PrismaService } from "src/db/prisma.service";

describe("MemberBulkRefreshProcessor", () => {
  let processor: MemberBulkRefreshProcessor;
  let membersService: {
    refreshMember: Mock;
  };
  let prismaService: {
    memberRefreshJob: {
      update: Mock;
      findUnique: Mock;
    };
  };
  let amqpConnection: {
    publish: Mock;
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
      refreshMember: vi.fn(),
    };

    const mockPrismaService = {
      memberRefreshJob: {
        update: vi.fn(),
        findUnique: vi.fn().mockResolvedValue(mockJobRecord),
      },
    };

    const mockAmqpConnection = {
      publish: vi.fn(),
    };

    const mockLogger = {
      log: vi.fn(),
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
          useValue: mockPrismaService,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
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
    prismaService = module.get(PrismaService);
    amqpConnection = module.get(AmqpConnection);
    logger = module.get(WINSTON_MODULE_PROVIDER);
  });

  it("should classify null and queued refreshes as skipped", async () => {
    membersService.refreshMember
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ refreshQueued: true } as any)
      .mockResolvedValueOnce({ refreshQueued: false } as any);

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

    expect(prismaService.memberRefreshJob.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: "COMPLETED",
        processedMembers: 3,
        completedAt: expect.any(Date),
      },
    });

    expect(amqpConnection.publish).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        jobId: 1,
        guildId: "guild-123",
        refreshedIds: ["discord-3"],
        skippedIds: ["discord-1", "discord-2"],
        failedIds: [],
      }),
    );

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
