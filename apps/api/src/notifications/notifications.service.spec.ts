import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { getQueueToken } from "@nestjs/bullmq";
import { Test, type TestingModule } from "@nestjs/testing";
import { DiscordGuildSyncStatus } from "@lootlog/types";
import { Prisma } from "prisma/generated/client";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "src/notifications/constants/notifications-dispatch-queue.constant";
import { ChannelsService } from "src/channels/channels.service";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  let service: NotificationsService;

  const mockPrisma = {
    $transaction: jest.fn(),
    guild: {
      findUnique: jest.fn(),
    },
    notificationRule: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    timer: {
      findMany: jest.fn(),
    },
    notificationTarget: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    notificationJob: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const removedJobs = [
    {
      remove: jest.fn(),
    },
    {
      remove: jest.fn(),
    },
  ];

  const mockQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
  };

  const mockChannelsService = {};
  const mockGuildsService = {
    hasRequiredGuildPermissions: jest.fn(),
    getGuildDiscordSyncStatus: jest.fn(),
  };
  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockQueue.getJob
      .mockResolvedValueOnce(removedJobs[0])
      .mockResolvedValueOnce(removedJobs[1]);
    mockPrisma.notificationTarget.findMany.mockResolvedValue([
      { id: 11 },
      { id: 22 },
    ]);
    mockPrisma.guild.findUnique.mockResolvedValue({
      notificationRuleLimit: 20,
    });
    mockPrisma.notificationRule.count.mockResolvedValue(0);
    mockPrisma.timer.findMany.mockResolvedValue([]);
    mockPrisma.notificationRule.findFirst.mockResolvedValue({
      id: 77,
      ownerType: "GUILD",
      ownerId: "guild-1",
    });
    mockPrisma.notificationJob.findFirst.mockResolvedValue({
      id: "job-1",
      ownerType: "GUILD",
      ownerId: "guild-1",
      status: "PENDING",
    });
    mockPrisma.notificationJob.findMany
      .mockResolvedValueOnce([{ id: "job-1" }])
      .mockResolvedValueOnce([{ id: "job-2" }]);
    mockPrisma.notificationJob.create.mockResolvedValue({
      id: "job-created",
      status: "PENDING",
    });
    mockPrisma.notificationJob.findUnique.mockResolvedValue(null);
    mockPrisma.notificationJob.update.mockResolvedValue(undefined);
    mockPrisma.notificationJob.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.notificationTarget.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        notificationJob: {
          update: mockPrisma.notificationJob.update,
          create: mockPrisma.notificationJob.create,
        },
      }),
    );
    mockGuildsService.hasRequiredGuildPermissions.mockResolvedValue(true);
    mockGuildsService.getGuildDiscordSyncStatus.mockResolvedValue({
      hasRequiredPermissions: true,
      missingPermissions: [],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ChannelsService,
          useValue: mockChannelsService,
        },
        {
          provide: GuildsService,
          useValue: mockGuildsService,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
        {
          provide: getQueueToken(NOTIFICATIONS_DISPATCH_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it("removes guild notification targets and cancels their queued jobs after channel deletion", async () => {
    await service.handleGuildChannelDeleted({
      guildId: "guild-1",
      channelId: "channel-1",
      syncState: {
        guildId: "guild-1",
        status: DiscordGuildSyncStatus.SYNCED,
        hasRequiredPermissions: true,
        requiredPermissions: [],
        grantedPermissions: [],
        missingPermissions: [],
        channelCount: 0,
        selectableChannelCount: 0,
        lastAttemptAt: "2026-03-31T12:00:00.000Z",
        lastSuccessAt: "2026-03-31T12:00:00.000Z",
        lastError: null,
        updatedAt: "2026-03-31T12:00:00.000Z",
      },
    });

    expect(mockQueue.getJob).toHaveBeenNthCalledWith(1, "job-1");
    expect(mockQueue.getJob).toHaveBeenNthCalledWith(2, "job-2");
    expect(removedJobs[0].remove).toHaveBeenCalled();
    expect(removedJobs[1].remove).toHaveBeenCalled();
    expect(mockPrisma.notificationJob.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: {
          in: ["job-1"],
        },
      },
      data: {
        status: "CANCELED",
        processedAt: expect.any(Date),
      },
    });
    expect(mockPrisma.notificationJob.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: {
          in: ["job-2"],
        },
      },
      data: {
        status: "CANCELED",
        processedAt: expect.any(Date),
      },
    });
    expect(mockPrisma.notificationTarget.deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [11, 22],
        },
      },
    });
  });

  it("blocks dispatch when the target lost channel permissions", async () => {
    mockPrisma.notificationJob.findUnique.mockResolvedValueOnce({
      id: "job-disabled",
      status: "PENDING",
      ownerType: "GUILD",
      ownerId: "guild-1",
      payloadSnapshot: {},
      rule: {
        guildId: "guild-1",
      },
      target: {
        active: true,
        canSend: false,
        metadata: {
          missingPermissions: ["SendMessages", "EmbedLinks"],
        },
      },
    });

    await service.dispatchNotificationJob("job-disabled");

    expect(mockPrisma.notificationJob.update).toHaveBeenCalledWith({
      where: { id: "job-disabled" },
      data: {
        status: "BLOCKED",
        blockedReason:
          "Discord channel is missing required permissions: SendMessages, EmbedLinks",
        lastError:
          "Discord channel is missing required permissions: SendMessages, EmbedLinks",
      },
    });
    expect(mockAmqpConnection.publish).not.toHaveBeenCalled();
  });

  it("cancels a single guild job and removes it from the queue", async () => {
    mockQueue.getJob.mockResolvedValueOnce(removedJobs[0]);
    mockPrisma.notificationJob.findMany.mockResolvedValueOnce([{ id: "job-1" }]);

    await service.cancelGuildJob("guild-1", "job-1");

    expect(mockPrisma.notificationJob.findFirst).toHaveBeenCalledWith({
      where: {
        id: "job-1",
        ownerType: "GUILD",
        ownerId: "guild-1",
      },
    });
    expect(mockPrisma.notificationJob.findMany).toHaveBeenCalledWith({
      where: {
        id: "job-1",
        status: {
          in: ["PENDING", "BLOCKED", "PROCESSING"],
        },
      },
      select: { id: true },
    });
    expect(mockQueue.getJob).toHaveBeenCalledWith("job-1");
    expect(removedJobs[0].remove).toHaveBeenCalled();
    expect(mockPrisma.notificationJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["job-1"],
        },
      },
      data: {
        status: "CANCELED",
        processedAt: expect.any(Date),
      },
    });
  });

  it("rebuilds guild rule jobs after confirming rule ownership", async () => {
    const rebuildJobsForRuleSpy = jest
      .spyOn(service as unknown as { rebuildJobsForRule: () => Promise<void> }, "rebuildJobsForRule")
      .mockImplementation(async () => undefined);

    await service.rebuildGuildRuleJobs("guild-1", 77);

    expect(mockPrisma.notificationRule.findFirst).toHaveBeenCalledWith({
      where: {
        id: 77,
        ownerType: "GUILD",
        ownerId: "guild-1",
      },
    });
    expect(rebuildJobsForRuleSpy).toHaveBeenCalledWith(77);
  });

  it("blocks test trigger when the rule has already used the test limit in the sliding window", async () => {
    const currentTime = Date.now();
    mockPrisma.notificationJob.findMany.mockReset();
    mockPrisma.notificationRule.findFirst.mockResolvedValueOnce({
      id: 77,
      ownerType: "GUILD",
      ownerId: "guild-1",
      enabled: true,
      name: "Rule",
      contentTemplate: null,
      world: "berufs",
      filters: {},
      triggerType: "TIMER_BEFORE_SPAWN",
      scheduleStrategy: "SPAWN_WINDOW_RELATIVE",
      scheduleAnchor: "MIN_SPAWN",
      scheduleOffsetMinutes: 0,
      targets: [
        {
          target: {
            id: 11,
            externalId: "channel-1",
            targetType: "CHANNEL",
            active: true,
            canSend: true,
          },
        },
      ],
    });
    mockPrisma.notificationJob.findMany.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, index) => ({
        ruleId: 77,
        createdAt: new Date(currentTime - index * 60_000),
      })),
    );

    await expect(service.triggerGuildRuleTest("guild-1", 77)).rejects.toMatchObject({
      response: {
        message: "Test trigger limit reached for this rule",
      },
    });
  });

  it("creates immediate test jobs for every active sendable target", async () => {
    mockPrisma.notificationJob.findMany.mockReset();
    mockPrisma.notificationRule.findFirst.mockResolvedValueOnce({
      id: 77,
      ownerType: "GUILD",
      ownerId: "guild-1",
      enabled: true,
      name: "Rule",
      contentTemplate: null,
      world: "berufs",
      filters: {},
      triggerType: "TIMER_BEFORE_SPAWN",
      scheduleStrategy: "SPAWN_WINDOW_RELATIVE",
      scheduleAnchor: "MIN_SPAWN",
      scheduleOffsetMinutes: 0,
      targets: [
        {
          target: {
            id: 11,
            externalId: "channel-1",
            targetType: "CHANNEL",
            active: true,
            canSend: true,
          },
        },
      ],
    });
    mockPrisma.notificationJob.findMany.mockResolvedValueOnce([]);

    await service.triggerGuildRuleTest("guild-1", 77);

    expect(mockPrisma.notificationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ruleId: 77,
        targetId: 11,
        jobKind: "TEST",
        sourceEntityType: "rule-test",
        sourceEntityId: "77",
      }),
    });
    expect(mockQueue.add).toHaveBeenCalledWith(
      "job-created",
      { notificationJobId: "job-created" },
      expect.objectContaining({
        delay: 0,
        jobId: "job-created",
      }),
    );
  });

  it("recreates a canceled job when idempotency key already exists", async () => {
    const uniqueConstraintError = new Error("P2002") as Error & { code: string };
    uniqueConstraintError.code = "P2002";
    Object.setPrototypeOf(
      uniqueConstraintError,
      Prisma.PrismaClientKnownRequestError.prototype,
    );

    mockPrisma.notificationJob.create.mockRejectedValueOnce(uniqueConstraintError);
    mockPrisma.notificationJob.findUnique.mockResolvedValueOnce({
      id: "job-canceled",
      status: "CANCELED",
    });

    const createdJob = await (
      service as unknown as {
        createNotificationJob: (options: {
          notificationRule: {
            id: number;
            ownerType: "GUILD";
            ownerId: string;
            guildId: string | null;
            triggerType: "TIMER_BEFORE_SPAWN";
          };
          target: {
            id: number;
            externalId: string;
            targetType: "CHANNEL";
            active: boolean;
            canSend: boolean;
          };
          jobKind: "SCHEDULED";
          scheduledFor: Date;
          sourceEntityType: string;
          sourceEntityId: string;
          payloadSnapshot: Record<string, unknown>;
          forceBlocked?: boolean;
        }) => Promise<{ id: string; status: string }>;
      }
    ).createNotificationJob({
      notificationRule: {
        id: 77,
        ownerType: "GUILD",
        ownerId: "guild-1",
        guildId: "guild-1",
        triggerType: "TIMER_BEFORE_SPAWN",
      },
      target: {
        id: 11,
        externalId: "channel-1",
        targetType: "CHANNEL",
        active: true,
        canSend: true,
      },
      jobKind: "SCHEDULED",
      scheduledFor: new Date("2026-03-31T18:00:00.000Z"),
      sourceEntityType: "timer",
      sourceEntityId: "guild-1:berufs:timer-1",
      payloadSnapshot: {
        title: "Nadchodzący spawn",
      },
    });

    expect(mockPrisma.notificationJob.findUnique).toHaveBeenCalledWith({
      where: {
        idempotencyKey:
          "scheduled:77:11:timer:guild-1:berufs:timer-1:2026-03-31T18:00:00.000Z",
      },
    });
    expect(mockPrisma.notificationJob.update).toHaveBeenCalledWith({
      where: { id: "job-canceled" },
      data: {
        idempotencyKey: expect.stringMatching(
          /^scheduled:77:11:timer:guild-1:berufs:timer-1:2026-03-31T18:00:00.000Z:canceled:/,
        ),
      },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(createdJob).toEqual({
      id: "job-created",
      status: "PENDING",
    });
  });
});
