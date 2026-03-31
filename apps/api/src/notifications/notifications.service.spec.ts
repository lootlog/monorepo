import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { getQueueToken } from "@nestjs/bullmq";
import { Test, type TestingModule } from "@nestjs/testing";
import { DiscordGuildSyncStatus } from "@lootlog/types";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "src/notifications/constants/notifications-dispatch-queue.constant";
import { ChannelsService } from "src/channels/channels.service";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  let service: NotificationsService;

  const mockPrisma = {
    notificationTarget: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    notificationJob: {
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
    mockPrisma.notificationJob.findMany
      .mockResolvedValueOnce([{ id: "job-1" }])
      .mockResolvedValueOnce([{ id: "job-2" }]);
    mockPrisma.notificationJob.findUnique.mockResolvedValue(null);
    mockPrisma.notificationJob.update.mockResolvedValue(undefined);
    mockPrisma.notificationJob.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.notificationTarget.deleteMany.mockResolvedValue({ count: 2 });
    mockGuildsService.hasRequiredGuildPermissions.mockResolvedValue(true);

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
});
