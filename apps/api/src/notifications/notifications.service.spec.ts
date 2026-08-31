import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../prisma/contract.js";
import type { JsonValue as DatabaseJsonValue } from "@prisma/orm-postgres/target/codec-types";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { mockFn } from "#src/test/mock-fn";
import { getQueueToken } from "@nestjs/bullmq";
import { Test, type TestingModule } from "@nestjs/testing";
import { NotificationTargetType } from "@lootlog/types";
import { PrismaService } from "#src/db/prisma.service";
import { attachPrismaOrmMock } from "#src/test/prisma-orm.mock";
import { POSTGRES_POOL } from "#src/db/postgres.provider";
import { GuildsService } from "#src/guilds/guilds.service";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/constants/notifications-dispatch-queue.constant";
import { Error as NotificationError } from "#src/notifications/enum/error.enum";
import { ChannelsService } from "#src/channels/channels.service";
import { WatchedItemResponseDto } from "#src/notifications/dto/notification-response.dto";
import { NotificationContentService } from "./notification-content.service.js";
import { NotificationJobService } from "./notification-job.service.js";
import { NotificationMatchingService } from "./notification-matching.service.js";
import { NotificationRuleService } from "./notification-rule.service.js";
import { NotificationTargetService } from "./notification-target.service.js";
import { NotificationsEventsHandler } from "./notifications-events.handler.js";
import { WatchedItemService } from "./watched-item.service.js";

const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["NpcType"]["values"][number];
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];
type JsonValue = DatabaseJsonValue;

describe("Notification Services", () => {
  let targetService: NotificationTargetService;
  let ruleService: NotificationRuleService;
  let jobService: NotificationJobService;
  let eventsHandler: NotificationsEventsHandler;
  let watchedItemService: WatchedItemService;

  const watchedItemTimestamp = new Date("2026-04-21T10:00:00.000Z");
  const createMockNotificationRule = (
    filters: JsonValue = {
      itemId: 123,
      guildIds: ["guild-1"],
    },
    overrides: Record<string, unknown> = {},
  ) => ({
    id: 91,
    ownerType: "USER",
    ownerId: "user-1",
    triggerType: "WATCHED_ITEM_DROPPED",
    guildId: null,
    world: "berufs",
    name: null,
    filters,
    contentTemplate: null,
    scheduleStrategy: null,
    scheduleAnchor: null,
    scheduleOffsetMinutes: null,
    scheduledAt: null,
    scheduleIntervalType: null,
    scheduleIntervalValue: null,
    scheduleWeekday: null,
    scheduleTimeOfDay: null,
    scheduledUntil: null,
    scheduleTimezone: null,
    enabled: true,
    dedupeWindowSeconds: 0,
    createdAt: watchedItemTimestamp,
    updatedAt: watchedItemTimestamp,
    targets: [],
    ...overrides,
  });
  const createMockWatchedItem = (
    notificationRule: ReturnType<
      typeof createMockNotificationRule
    > | null = createMockNotificationRule(),
    overrides: Record<string, unknown> = {},
  ) => ({
    id: 1,
    userId: "user-1",
    itemId: 123,
    itemName: "Legendarny Miecz",
    world: "berufs",
    enabled: true,
    notificationRuleId: notificationRule ? 91 : null,
    createdAt: watchedItemTimestamp,
    updatedAt: watchedItemTimestamp,
    notificationRule,
    ...overrides,
  });

  const mockPrisma = {
    $transaction: mockFn(),
    guild: {
      findUnique: mockFn(),
    },
    member: {
      findMany: mockFn(),
    },
    notificationRule: {
      count: mockFn(),
      findFirst: mockFn(),
      findMany: mockFn(),
      create: mockFn(),
      update: mockFn(),
      delete: mockFn(),
      deleteMany: mockFn(),
    },
    notificationRuleTarget: {
      createMany: mockFn(),
      findMany: mockFn(),
    },
    timer: {
      findMany: mockFn(),
    },
    watchedItem: {
      count: mockFn(),
      findMany: mockFn(),
      findUnique: mockFn(),
      update: mockFn(),
      upsert: mockFn(),
    },
    notificationTarget: {
      findMany: mockFn(),
      delete: mockFn(),
      deleteMany: mockFn(),
      upsert: mockFn(),
      findFirst: mockFn(),
      update: mockFn(),
    },
    notificationJob: {
      create: mockFn(),
      findFirst: mockFn(),
      findMany: mockFn(),
      findUnique: mockFn(),
      update: mockFn(),
      updateMany: mockFn(),
    },
  };

  const removedJobs = [
    {
      remove: mockFn(),
    },
    {
      remove: mockFn(),
    },
  ];

  const mockQueue = {
    add: mockFn(),
    getJob: mockFn(),
  };

  const mockChannelsService = {};
  const mockGuildsService = {
    hasRequiredGuildPermissions: mockFn(),
    getGuildDiscordSyncStatus: mockFn(),
    getUserGuilds: mockFn(),
    getMultipleGuildsByIds: mockFn(),
  };
  const mockAmqpConnection = {
    publish: mockFn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockQueue.getJob
      .mockResolvedValueOnce(removedJobs[0])
      .mockResolvedValueOnce(removedJobs[1]);
    mockPrisma.notificationTarget.findMany.mockResolvedValue([
      { id: 11 },
      { id: 22 },
    ]);
    mockPrisma.notificationTarget.upsert.mockResolvedValue({
      id: 11,
      externalId: "discord-user-1",
      targetType: "DM",
      active: true,
      canSend: true,
    });
    mockPrisma.notificationTarget.findFirst.mockResolvedValue({
      id: 11,
      ownerType: "USER",
      ownerId: "user-1",
      targetType: "DM",
      active: true,
      canSend: true,
    });
    mockPrisma.notificationTarget.update.mockImplementation(({ data }) => ({
      id: 11,
      ownerType: "USER",
      ownerId: "user-1",
      targetType: "DM",
      active: data.active ?? true,
      canSend: true,
      displayName: "Discord DM",
    }));
    mockPrisma.guild.findUnique.mockResolvedValue({
      notificationRuleLimit: 20,
    });
    mockPrisma.member.findMany.mockResolvedValue([]);
    mockPrisma.watchedItem.count.mockResolvedValue(0);
    mockPrisma.watchedItem.findMany.mockResolvedValue([]);
    mockPrisma.watchedItem.findUnique.mockResolvedValue(null);
    mockPrisma.watchedItem.update.mockResolvedValue(undefined);
    mockPrisma.watchedItem.upsert.mockResolvedValue(createMockWatchedItem());
    mockPrisma.notificationRuleTarget.createMany.mockResolvedValue({
      count: 0,
    });
    mockPrisma.notificationRule.count.mockResolvedValue(0);
    mockPrisma.notificationRule.create.mockResolvedValue({
      id: 91,
    });
    mockPrisma.notificationRule.update.mockResolvedValue(undefined);
    mockPrisma.timer.findMany.mockResolvedValue([]);
    mockPrisma.notificationRule.findFirst.mockResolvedValue({
      id: 77,
      ownerType: "GUILD",
      ownerId: "guild-1",
    });
    mockPrisma.notificationRule.findMany.mockResolvedValue([]);
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
    mockPrisma.notificationTarget.delete.mockResolvedValue(undefined);
    mockPrisma.notificationTarget.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.notificationRuleTarget.findMany.mockResolvedValue([]);
    mockPrisma.notificationRule.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.notificationRule.delete.mockResolvedValue(undefined);
    mockPrisma.$transaction.mockImplementation((callback) =>
      callback({
        watchedItem: {
          update: mockPrisma.watchedItem.update,
          upsert: mockPrisma.watchedItem.upsert,
          delete: mockFn(),
        },
        notificationRule: {
          create: mockPrisma.notificationRule.create,
          update: mockPrisma.notificationRule.update,
          delete: mockPrisma.notificationRule.delete,
        },
        notificationRuleTarget: {
          createMany: mockPrisma.notificationRuleTarget.createMany,
        },
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
    mockGuildsService.getMultipleGuildsByIds.mockResolvedValue([
      { id: "guild-1", name: "Guild 1" },
      { id: "guild-2", name: "Guild 2" },
    ]);
    mockGuildsService.getUserGuilds.mockResolvedValue([
      { id: "guild-1", name: "Guild 1" },
      { id: "guild-2", name: "Guild 2" },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationContentService,
        NotificationJobService,
        NotificationMatchingService,
        NotificationRuleService,
        NotificationTargetService,
        NotificationsEventsHandler,
        WatchedItemService,
        {
          provide: PrismaService,
          useValue: attachPrismaOrmMock(mockPrisma),
        },
        {
          provide: POSTGRES_POOL,
          useValue: {
            query: mockFn(async () => {
              const memberships = await mockPrisma.orm.public.Member.where({
                userId: { in: ["user-1"] },
                guildId: { in: ["guild-1"] },
                active: true,
              })
                .select("userId", "guildId")
                .include("guild", (row) => row.select("ownerId"))
                .include("roles", (row) =>
                  row.select("id", "permissions", "lvlRangeFrom", "lvlRangeTo"),
                )
                .all();
              return {
                rows: memberships.map((membership) => ({
                  userId: membership.userId,
                  guildId: membership.guildId,
                  ownerId: membership.guild.ownerId,
                  roles: membership.roles,
                })),
              };
            }),
          },
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

    targetService = module.get<NotificationTargetService>(
      NotificationTargetService,
    );
    ruleService = module.get<NotificationRuleService>(NotificationRuleService);
    jobService = module.get<NotificationJobService>(NotificationJobService);
    eventsHandler = module.get<NotificationsEventsHandler>(
      NotificationsEventsHandler,
    );
    watchedItemService = module.get<WatchedItemService>(WatchedItemService);
  });

  it("removes guild notification targets, orphaned rules, and cancels their queued jobs after channel deletion", async () => {
    mockPrisma.notificationJob.findMany.mockReset();
    mockQueue.getJob.mockReset();
    mockPrisma.notificationRuleTarget.findMany
      .mockResolvedValueOnce([{ ruleId: 77, rule: { targets: 1 } }])
      .mockResolvedValueOnce([]);
    mockPrisma.notificationJob.findMany
      .mockResolvedValueOnce([{ id: "job-1" }])
      .mockResolvedValueOnce([{ id: "job-r77" }])
      .mockResolvedValueOnce([{ id: "job-2" }]);
    mockQueue.getJob
      .mockResolvedValueOnce(removedJobs[0])
      .mockResolvedValueOnce({ remove: mockFn() })
      .mockResolvedValueOnce(removedJobs[1]);

    await targetService.handleGuildChannelDeleted({
      guildId: "guild-1",
      channelId: "channel-1",
    });

    expect(mockPrisma.notificationTarget.delete).toHaveBeenCalledWith({
      where: { id: 11 },
    });
    expect(mockPrisma.notificationTarget.delete).toHaveBeenCalledWith({
      where: { id: 22 },
    });
    expect(mockPrisma.notificationRule.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [77] } },
    });
  });

  it("blocks dispatch when the target lost channel permissions", async () => {
    mockPrisma.notificationJob.findFirst.mockResolvedValueOnce({
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

    await jobService.dispatchNotificationJob("job-disabled");

    expect(mockPrisma.notificationJob.update).toHaveBeenCalledWith({
      where: { id: "job-disabled" },
      data: {
        status: "BLOCKED",
        blockedReason:
          "Discord channel is missing required permissions: SendMessages, EmbedLinks",
        lastError:
          "Discord channel is missing required permissions: SendMessages, EmbedLinks",
        updatedAt: expect.any(Date),
      },
    });
    expect(mockAmqpConnection.publish).not.toHaveBeenCalled();
  });

  it("cancels a single guild job and removes it from the queue", async () => {
    mockQueue.getJob.mockResolvedValueOnce(removedJobs[0]);
    mockPrisma.notificationJob.findMany.mockReset();
    mockPrisma.notificationJob.findMany.mockResolvedValueOnce([
      { id: "job-1" },
    ]);

    await jobService.cancelGuildJob("guild-1", "job-1");

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
          in: ["PENDING", "BLOCKED"],
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
        status: {
          in: ["PENDING", "BLOCKED"],
        },
      },
      data: {
        status: "CANCELED",
        processedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
  });

  it("rebuilds guild rule jobs after confirming rule ownership", async () => {
    const rebuildJobsForRuleSpy = vi
      .spyOn(jobService, "rebuildJobsForRule")
      .mockImplementation(() => undefined);

    await ruleService.rebuildGuildRuleJobs("guild-1", 77);

    expect(mockPrisma.notificationRule.findFirst).toHaveBeenCalledWith({
      where: {
        id: 77,
        ownerType: "GUILD",
        ownerId: "guild-1",
      },
    });
    expect(rebuildJobsForRuleSpy).toHaveBeenCalledWith(77);
  });

  it("rejects creating user dm targets for another discord account", async () => {
    await expect(
      targetService.createUserTarget("discord-user-1", {
        targetType: NotificationTargetType.DM,
        externalId: "discord-user-2",
        displayName: "Discord DM",
      }),
    ).rejects.toMatchObject({
      response: {
        message:
          NotificationError.USER_DM_TARGET_MUST_USE_AUTHENTICATED_DISCORD_ACCOUNT,
      },
    });

    expect(mockPrisma.notificationTarget.upsert).not.toHaveBeenCalled();
  });

  it("deactivates user dm targets", async () => {
    await expect(
      targetService.updateUserTarget("user-1", 11, {
        active: false,
      }),
    ).resolves.toMatchObject({
      id: 11,
      ownerType: "USER",
      ownerId: "user-1",
      targetType: "DM",
      active: false,
      canSend: true,
      displayName: "Discord DM",
    });

    expect(mockPrisma.notificationTarget.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: {
        active: false,
        updatedAt: expect.any(Date),
      },
    });
  });

  it("creates an immediate test job for an active user dm target", async () => {
    mockPrisma.notificationRule.findFirst.mockResolvedValueOnce(null);
    mockPrisma.notificationRule.create.mockResolvedValueOnce({
      id: 191,
      ownerType: "USER",
      ownerId: "user-1",
      guildId: null,
      triggerType: "SCHEDULED_MESSAGE",
    });

    await expect(
      targetService.triggerUserTargetTest("user-1", 11),
    ).resolves.toEqual({
      success: true,
    });

    expect(mockPrisma.notificationRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerType: "USER",
        ownerId: "user-1",
        triggerType: "SCHEDULED_MESSAGE",
        guildId: null,
        world: null,
        name: "__system:user-dm-test__",
        filters: null,
        contentTemplate: null,
        scheduleStrategy: "FIXED_DATETIME",
        scheduleAnchor: null,
        scheduleOffsetMinutes: null,
        scheduledAt: null,
        scheduleIntervalType: "ONCE",
        scheduleIntervalValue: null,
        scheduleWeekday: null,
        scheduleTimeOfDay: null,
        scheduledUntil: null,
        scheduleTimezone: null,
        enabled: false,
        dedupeWindowSeconds: 0,
      }),
    });
    expect(mockPrisma.notificationRuleTarget.createMany).toHaveBeenCalledWith({
      data: [{ ruleId: 191, targetId: 11 }],
    });
    expect(mockPrisma.notificationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ruleId: 191,
        targetId: 11,
        ownerType: "USER",
        ownerId: "user-1",
        jobKind: "TEST",
        sourceEntityType: "user-dm-test",
        sourceEntityId: "11",
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

  it("requires an active dm target before creating a watched item", async () => {
    mockPrisma.notificationTarget.findMany.mockResolvedValueOnce([]);

    await expect(
      watchedItemService.createWatchedItem("discord-user-1", "user-1", {
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        guildIds: ["guild-1"],
      }),
    ).rejects.toMatchObject({
      response: {
        message: NotificationError.ACTIVE_DISCORD_DM_TARGET_REQUIRED,
      },
    });

    expect(mockPrisma.notificationRule.create).not.toHaveBeenCalled();
    expect(mockPrisma.watchedItem.upsert).not.toHaveBeenCalled();
  });

  it("rejects creating a new watched item when the watched item limit is reached", async () => {
    mockPrisma.watchedItem.count.mockResolvedValueOnce(20);

    await expect(
      watchedItemService.createWatchedItem("discord-user-1", "user-1", {
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        guildIds: ["guild-1"],
      }),
    ).rejects.toMatchObject({
      response: {
        message: NotificationError.USER_WATCHED_ITEM_LIMIT_REACHED,
      },
    });

    expect(mockPrisma.notificationRule.create).not.toHaveBeenCalled();
    expect(mockPrisma.watchedItem.upsert).not.toHaveBeenCalled();
  });

  it("returns a valid watched item response when creating a watched item", async () => {
    const result = await watchedItemService.createWatchedItem(
      "discord-user-1",
      "user-1",
      {
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        guildIds: ["guild-1"],
      },
    );

    expect(WatchedItemResponseDto.schema.encode(result)).toMatchObject({
      itemSnapshot: null,
      notificationRule: {
        filters: {
          itemId: 123,
          guildIds: ["guild-1"],
        },
      },
    });
  });

  it("quick add merges the current guild into an existing watched item scope", async () => {
    mockPrisma.watchedItem.findUnique
      .mockResolvedValueOnce(createMockWatchedItem())
      .mockResolvedValueOnce(
        createMockWatchedItem(
          createMockNotificationRule({
            itemId: 123,
            guildIds: ["guild-1", "guild-2"],
          }),
        ),
      );

    const result = await watchedItemService.quickAddWatchedItem(
      "discord-user-1",
      "user-1",
      {
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        guildId: "guild-2",
      },
    );

    expect(WatchedItemResponseDto.schema.encode(result)).toMatchObject({
      itemSnapshot: null,
      notificationRule: {
        filters: {
          guildIds: ["guild-1", "guild-2"],
        },
      },
    });

    expect(mockPrisma.notificationRule.update).toHaveBeenCalledWith({
      where: { id: 91 },
      data: {
        enabled: true,
        world: "berufs",
        filters: {
          itemId: 123,
          guildIds: ["guild-1", "guild-2"],
        },
        updatedAt: expect.any(Date),
      },
    });
  });

  it("returns a valid watched item response when quick add creates a new watched item", async () => {
    const result = await watchedItemService.quickAddWatchedItem(
      "discord-user-1",
      "user-1",
      {
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        guildId: "guild-1",
      },
    );

    expect(WatchedItemResponseDto.schema.encode(result)).toMatchObject({
      itemSnapshot: null,
      notificationRule: {
        filters: {
          itemId: 123,
          guildIds: ["guild-1"],
        },
      },
    });
    expect(mockGuildsService.getUserGuilds).toHaveBeenCalledWith(
      "discord-user-1",
      "user-1",
      "game",
    );
  });

  it("accepts watched-item guild ids resolved from the game-scope guild list", async () => {
    mockGuildsService.getUserGuilds.mockResolvedValueOnce([
      { id: "guild-1", vanityUrl: "cached-guild", name: "Guild 1" },
    ]);

    const result = await watchedItemService.quickAddWatchedItem(
      "discord-user-1",
      "user-1",
      {
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        guildId: "cached-guild",
      },
    );

    expect(WatchedItemResponseDto.schema.encode(result)).toMatchObject({
      notificationRule: {
        filters: {
          guildIds: ["guild-1"],
        },
      },
    });
    expect(mockGuildsService.getUserGuilds).toHaveBeenCalledWith(
      "discord-user-1",
      "user-1",
      "game",
    );
  });

  it("quick add stays idempotent when the current guild is already watched", async () => {
    mockPrisma.watchedItem.findUnique
      .mockResolvedValueOnce({
        id: 1,
        userId: "user-1",
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        enabled: true,
        notificationRuleId: 91,
        notificationRule: {
          id: 91,
          ownerType: "USER",
          ownerId: "user-1",
          world: "berufs",
          enabled: true,
          filters: {
            itemId: 123,
            guildIds: ["guild-1"],
          },
        },
      })
      .mockResolvedValueOnce({
        id: 1,
        userId: "user-1",
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        enabled: true,
        notificationRuleId: 91,
        notificationRule: {
          id: 91,
          ownerType: "USER",
          ownerId: "user-1",
          world: "berufs",
          enabled: true,
          filters: {
            itemId: 123,
            guildIds: ["guild-1"],
          },
          targets: [],
        },
      });

    await expect(
      watchedItemService.quickAddWatchedItem("discord-user-1", "user-1", {
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        guildId: "guild-1",
      }),
    ).resolves.toMatchObject({
      notificationRule: {
        filters: {
          guildIds: ["guild-1"],
        },
      },
    });

    expect(mockPrisma.notificationRule.update).toHaveBeenCalledWith({
      where: { id: 91 },
      data: {
        enabled: true,
        world: "berufs",
        filters: {
          itemId: 123,
          guildIds: ["guild-1"],
        },
        updatedAt: expect.any(Date),
      },
    });
  });

  it("requires an active dm target before quick adding a watched item", async () => {
    mockPrisma.notificationTarget.findMany.mockResolvedValueOnce([]);

    await expect(
      watchedItemService.quickAddWatchedItem("discord-user-1", "user-1", {
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        guildId: "guild-1",
      }),
    ).rejects.toMatchObject({
      response: {
        message: NotificationError.ACTIVE_DISCORD_DM_TARGET_REQUIRED,
      },
    });
  });

  it("rejects quick add when it would create a new watched item above the limit", async () => {
    mockPrisma.watchedItem.count.mockResolvedValueOnce(20);

    await expect(
      watchedItemService.quickAddWatchedItem("discord-user-1", "user-1", {
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        guildId: "guild-1",
      }),
    ).rejects.toMatchObject({
      response: {
        message: NotificationError.USER_WATCHED_ITEM_LIMIT_REACHED,
      },
    });

    expect(mockPrisma.notificationRule.create).not.toHaveBeenCalled();
    expect(mockPrisma.watchedItem.upsert).not.toHaveBeenCalled();
  });

  it("rejects quick add for a guild outside the authenticated user scope", async () => {
    await expect(
      watchedItemService.quickAddWatchedItem("discord-user-1", "user-1", {
        itemId: 123,
        itemName: "Legendarny Miecz",
        world: "berufs",
        guildId: "guild-999",
      }),
    ).rejects.toMatchObject({
      response: {
        message:
          NotificationError.SELECTED_GUILDS_NOT_AVAILABLE_FOR_AUTHENTICATED_USER,
      },
    });
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
        targetId: 11,
        createdAt: new Date(currentTime - index * 60_000),
      })),
    );

    await expect(
      ruleService.triggerGuildRuleTest("guild-1", 77),
    ).rejects.toMatchObject({
      response: {
        message: NotificationError.TEST_TRIGGER_LIMIT_REACHED_FOR_RULE,
      },
    });
  });

  it("counts test trigger usage once per trigger event across multiple targets", async () => {
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
        {
          target: {
            id: 22,
            externalId: "channel-2",
            targetType: "CHANNEL",
            active: true,
            canSend: true,
          },
        },
      ],
    });
    mockPrisma.notificationJob.findMany.mockResolvedValueOnce(
      Array.from({ length: 9 }, (_, index) => {
        const createdAt = new Date(currentTime - index * 60_000);
        const sourceEventId = `test:77:event-${index}`;

        return [
          {
            ruleId: 77,
            createdAt,
            sourceEventId,
          },
          {
            ruleId: 77,
            createdAt,
            sourceEventId,
          },
        ];
      }).flat(),
    );
    mockPrisma.notificationJob.create
      .mockResolvedValueOnce({
        id: "job-created-1",
        status: "PENDING",
      })
      .mockResolvedValueOnce({
        id: "job-created-2",
        status: "PENDING",
      });

    await expect(
      ruleService.triggerGuildRuleTest("guild-1", 77),
    ).resolves.toEqual({
      success: true,
    });

    expect(mockPrisma.notificationJob.create).toHaveBeenCalledTimes(2);
    expect(mockQueue.add).toHaveBeenNthCalledWith(
      1,
      "job-created-1",
      { notificationJobId: "job-created-1" },
      expect.objectContaining({
        delay: 0,
        jobId: "job-created-1",
      }),
    );
    expect(mockQueue.add).toHaveBeenNthCalledWith(
      2,
      "job-created-2",
      { notificationJobId: "job-created-2" },
      expect.objectContaining({
        delay: 0,
        jobId: "job-created-2",
      }),
    );
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

    await ruleService.triggerGuildRuleTest("guild-1", 77);

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

  it("loads watched-item notification rules by dropped item ids", async () => {
    mockPrisma.member.findMany.mockResolvedValueOnce([
      {
        guildId: "guild-1",
        userId: "user-1",
        guild: { ownerId: "owner-1" },
        roles: [
          {
            id: "loot-reader",
            permissions: [Permission.LOOTLOG_LOOTS_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 500,
          },
        ],
      },
    ]);
    mockPrisma.watchedItem.findMany.mockResolvedValueOnce([
      {
        notificationRuleId: 91,
        world: "berufs",
        notificationRule: {
          id: 91,
          ownerType: "USER",
          ownerId: "user-1",
          guildId: null,
          world: "berufs",
          triggerType: "WATCHED_ITEM_DROPPED",
          enabled: true,
          filters: {
            itemIds: [123],
            guildIds: ["guild-1"],
          },
          targets: [
            {
              target: {
                id: 51,
                externalId: "dm-user-1",
                targetType: "DM",
                active: true,
                canSend: true,
              },
            },
          ],
        },
      },
    ]);

    await eventsHandler.handleLootCreated({
      version: 2,
      lootId: 999,
      world: "berufs",
      itemIds: [123, 456],
      itemNames: ["Legendarny Miecz"],
      guildIds: ["guild-1"],
      npcs: [{ type: NpcType.ELITE, lvl: 100 }],
    });

    expect(mockPrisma.watchedItem.findMany).toHaveBeenCalledWith({
      where: {
        enabled: true,
        itemId: {
          in: [123, 456],
        },
        world: "berufs",
      },
      include: { notificationRule: true },
    });
    expect(mockPrisma.member.findMany).toHaveBeenCalledWith({
      where: {
        userId: {
          in: ["user-1"],
        },
        guildId: {
          in: ["guild-1"],
        },
        active: true,
      },
      select: {
        userId: true,
        guildId: true,
      },
      include: { guild: true, roles: true },
    });
    expect(mockPrisma.notificationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ruleId: 91,
        targetId: 51,
        jobKind: "INSTANT",
        sourceEntityType: "loot",
        sourceEntityId: "999",
        sourceEventId: "loot:999",
      }),
    });
  });

  it("does not notify when one NPC in mixed-tier loot is outside the owner's visibility", async () => {
    mockPrisma.member.findMany.mockResolvedValueOnce([
      {
        userId: "user-1",
        guildId: "guild-1",
        guild: { ownerId: "owner-1" },
        roles: [
          {
            id: "titan-reader",
            permissions: [
              Permission.LOOTLOG_LOOTS_READ,
              Permission.LOOTLOG_LOOTS_TITANS_READ,
            ],
            lvlRangeFrom: 1,
            lvlRangeTo: 500,
          },
        ],
      },
    ]);
    mockPrisma.watchedItem.findMany.mockResolvedValueOnce([
      {
        notificationRuleId: 91,
        world: "berufs",
        notificationRule: {
          id: 91,
          ownerType: "USER",
          ownerId: "user-1",
          guildId: null,
          world: "berufs",
          triggerType: "WATCHED_ITEM_DROPPED",
          filters: {
            itemIds: [123],
            guildIds: ["guild-1"],
          },
          targets: [
            {
              target: {
                id: 51,
                externalId: "dm-user-1",
                targetType: "DM",
                active: true,
                canSend: true,
              },
            },
          ],
        },
      },
    ]);

    await eventsHandler.handleLootCreated({
      version: 2,
      lootId: 1000,
      world: "berufs",
      itemIds: [123],
      itemNames: ["Legendarny Miecz"],
      guildIds: ["guild-1"],
      npcs: [
        { type: NpcType.TITAN, lvl: 300 },
        { type: NpcType.HERO, lvl: 120 },
      ],
    });

    expect(mockPrisma.notificationJob.create).not.toHaveBeenCalled();
  });

  it("skips watched-item notifications when the owner no longer has access to matching guilds", async () => {
    mockPrisma.member.findMany.mockResolvedValueOnce([]);
    mockPrisma.watchedItem.findMany.mockResolvedValueOnce([
      {
        notificationRuleId: 91,
        world: "berufs",
        notificationRule: {
          id: 91,
          ownerType: "USER",
          ownerId: "user-1",
          guildId: null,
          world: "berufs",
          triggerType: "WATCHED_ITEM_DROPPED",
          filters: {
            itemId: 123,
            guildIds: ["guild-1"],
          },
          targets: [
            {
              target: {
                id: 51,
                externalId: "dm-user-1",
                targetType: "DM",
                active: true,
                canSend: true,
              },
            },
          ],
        },
      },
    ]);

    await eventsHandler.handleLootCreated({
      version: 2,
      lootId: 1001,
      world: "berufs",
      itemIds: [123],
      itemNames: ["Legendarny Miecz"],
      guildIds: ["guild-1"],
      npcs: [{ type: NpcType.ELITE, lvl: 100 }],
    });

    expect(mockPrisma.notificationJob.create).not.toHaveBeenCalled();
  });

  it("recreates a canceled job when idempotency key already exists", async () => {
    const uniqueConstraintError = new Error("unique constraint") as Error & {
      code: string;
    };
    uniqueConstraintError.code = "23505";
    mockPrisma.notificationJob.create.mockRejectedValueOnce(
      uniqueConstraintError,
    );
    mockPrisma.notificationJob.findFirst.mockResolvedValueOnce({
      id: "job-canceled",
      status: "CANCELED",
    });

    const createdJob = await jobService.createNotificationJob({
      notificationRule: {
        id: 77,
        ownerType: "GUILD" as const,
        ownerId: "guild-1",
        guildId: "guild-1",
        triggerType: "TIMER_BEFORE_SPAWN" as const,
      },
      target: {
        id: 11,
        externalId: "channel-1",
        targetType: "CHANNEL" as const,
        active: true,
        canSend: true,
      },
      jobKind: "SCHEDULED" as const,
      scheduledFor: new Date("2026-03-31T18:00:00.000Z"),
      sourceEntityType: "timer",
      sourceEntityId: "guild-1:berufs:timer-1",
      payloadSnapshot: {
        title: "Nadchodzący spawn",
      },
    });

    expect(mockPrisma.notificationJob.findFirst).toHaveBeenCalledWith({
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
        updatedAt: expect.any(Date),
      },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(createdJob).toEqual({
      id: "job-created",
      status: "PENDING",
    });
  });
});
