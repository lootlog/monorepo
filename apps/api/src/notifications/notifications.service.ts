import { randomUUID } from "node:crypto";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  DiscordGuildChannelSnapshot,
  DiscordGuildChannelDeletedEvent,
  DiscordNotificationDeliveryResultEvent,
  NotificationFilters,
} from "@lootlog/types";
import type { Queue } from "bullmq";
import {
  NotificationJobKind as DbNotificationJobKind,
  NotificationJobStatus as DbNotificationJobStatus,
  NotificationOwnerType as DbNotificationOwnerType,
  NotificationProvider as DbNotificationProvider,
  NotificationScheduleAnchor as DbNotificationScheduleAnchor,
  NotificationScheduleIntervalType as DbNotificationScheduleIntervalType,
  NotificationScheduleStrategy as DbNotificationScheduleStrategy,
  NotificationTargetType as DbNotificationTargetType,
  NotificationTriggerType as DbNotificationTriggerType,
  Prisma,
} from "prisma/generated/client";
import { ChannelsService } from "src/channels/channels.service";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { PrismaService } from "src/db/prisma.service";
import { RoutingKey } from "src/enum/routing-key.enum";
import { GuildsService } from "src/guilds/guilds.service";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "src/notifications/constants/notifications-dispatch-queue.constant";
import { GUILD_NOTIFICATION_TIMEZONE } from "src/notifications/constants/notification-schedule-timezone.constant";
import {
  NOTIFICATIONS_HISTORY_RESPONSE_LIMIT,
  NOTIFICATIONS_HISTORY_RETENTION_LIMIT,
} from "src/notifications/constants/notifications-history.constant";
import type { CreateNotificationRuleDto } from "src/notifications/dto/create-notification-rule.dto";
import type { CreateNotificationTargetDto } from "src/notifications/dto/create-notification-target.dto";
import type { CreateWatchedItemDto } from "src/notifications/dto/create-watched-item.dto";
import type { UpdateNotificationRuleDto } from "src/notifications/dto/update-notification-rule.dto";
import type { UpdateNotificationTargetDto } from "src/notifications/dto/update-notification-target.dto";
import type { NotificationDispatchJobData } from "src/notifications/notifications-dispatch.processor";
import {
  calculateFirstOccurrenceInTimeZone,
  calculateNextOccurrenceInTimeZone,
  isValidTimeZone,
} from "src/notifications/utils/notification-schedule-time.util";

type OwnerContext = {
  ownerType: DbNotificationOwnerType;
  ownerId: string;
};

type TimerUpdatedEvent = {
  guildId: string;
  world: string;
  npcId: number;
  timerKey: string;
  minSpawnTime: string | Date;
  maxSpawnTime: string | Date;
  npc?: {
    name?: string;
  } | null;
};

type TimerDeletedEvent = {
  guildId: string;
  world: string;
  timerKey: string;
  npcId?: number;
};

type LootCreatedEvent = {
  lootId: number;
  world: string;
  guildIds: string[];
  itemIds: number[];
  itemNames: string[];
};

const FINAL_JOB_STATUSES = [
  DbNotificationJobStatus.SENT,
  DbNotificationJobStatus.FAILED,
  DbNotificationJobStatus.CANCELED,
] as const;

const GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT = 10;
const GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS = 15 * 60_000;
const GUILD_NOTIFICATION_MAX_NPCS_PER_RULE = 5;
const DEFAULT_TIMER_NOTIFICATION_TEMPLATE = [
  "## {{npcName}}",
  "",
  "Swiat: **{{world}}**",
  "Okno spawnu: **{{minSpawnTime}} - {{maxSpawnTime}}**",
  "Zaplanowana wysylka: **{{scheduledFor}}**",
].join("\n");

const DEFAULT_SCHEDULED_MESSAGE_TEMPLATE = [
  "## {{ruleName}}",
  "",
  "Zaplanowana wysylka: **{{scheduledFor}}**",
].join("\n");

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channelsService: ChannelsService,
    private readonly guildsService: GuildsService,
    private readonly amqpConnection: AmqpConnection,
    @InjectQueue(NOTIFICATIONS_DISPATCH_QUEUE)
    private readonly notificationsQueue: Queue<NotificationDispatchJobData>,
  ) {}

  async listGuildTargets(guildId: string) {
    return this.prisma.notificationTarget.findMany({
      where: {
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
      },
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    });
  }

  async createGuildTarget(guildId: string, data: CreateNotificationTargetDto) {
    await this.ensureGuildNotificationPermissions(guildId);

    if (data.targetType !== DbNotificationTargetType.CHANNEL) {
      throw new BadRequestException(
        "Guild notification targets must be channels",
      );
    }

    if (!data.externalId) {
      throw new BadRequestException("Guild channel target requires externalId");
    }

    const { channels } =
      await this.channelsService.getSelectableGuildChannels(guildId);
    const selectedChannel = channels.find(
      (channel) => channel.channelId === data.externalId,
    );

    if (!selectedChannel) {
      throw new BadRequestException(
        "Selected Discord channel is not available",
      );
    }

    return this.prisma.notificationTarget.upsert({
      where: {
        ownerType_ownerId_provider_targetType_externalId: {
          ownerType: DbNotificationOwnerType.GUILD,
          ownerId: guildId,
          provider: DbNotificationProvider.DISCORD,
          targetType: DbNotificationTargetType.CHANNEL,
          externalId: data.externalId,
        },
      },
      create: {
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
        provider: DbNotificationProvider.DISCORD,
        targetType: DbNotificationTargetType.CHANNEL,
        externalId: data.externalId,
        displayName: data.displayName ?? selectedChannel.name,
        guildName: null,
        metadata: this.createGuildChannelTargetMetadata(selectedChannel),
        active: true,
        canSend: selectedChannel.hasRequiredPermissions,
        lastSyncedAt: new Date(selectedChannel.lastSyncedAt),
      },
      update: {
        displayName: data.displayName ?? selectedChannel.name,
        metadata: this.createGuildChannelTargetMetadata(selectedChannel),
        active: true,
        canSend: selectedChannel.hasRequiredPermissions,
        lastSyncedAt: new Date(selectedChannel.lastSyncedAt),
      },
    });
  }

  async updateGuildTarget(
    guildId: string,
    targetId: number,
    data: UpdateNotificationTargetDto,
  ) {
    await this.ensureGuildTarget(guildId, targetId);
    const hasDisplayName = Object.prototype.hasOwnProperty.call(
      data,
      "displayName",
    );

    const updated = await this.prisma.notificationTarget.update({
      where: { id: targetId },
      data: {
        ...(hasDisplayName ? { displayName: data.displayName ?? null } : {}),
        active: data.active,
      },
    });

    if (data.active === false) {
      await this.cancelPendingJobs({ targetId });
    }

    return updated;
  }

  async deleteGuildTarget(guildId: string, targetId: number) {
    await this.ensureGuildTarget(guildId, targetId);
    await this.cancelPendingJobs({ targetId });
    await this.prisma.notificationTarget.delete({ where: { id: targetId } });
    return { success: true };
  }

  async listGuildRules(guildId: string) {
    const [guildSettings, rules] = await Promise.all([
      this.prisma.guild.findUnique({
        where: { id: guildId },
        select: { notificationRuleLimit: true },
      }),
      this.prisma.notificationRule.findMany({
        where: {
          ownerType: DbNotificationOwnerType.GUILD,
          ownerId: guildId,
        },
        include: {
          targets: {
            include: {
              target: true,
            },
          },
        },
        orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      }),
    ]);

    const testTriggerUsage = await this.getGuildRuleTestTriggerUsage(
      rules.map((rule) => rule.id),
    );

    return {
      items: rules.map((rule) => ({
        ...rule,
        testTrigger: testTriggerUsage.get(rule.id) ?? {
          limit: GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT,
          used: 0,
          remaining: GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT,
          windowSeconds: Math.floor(
            GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS / 1000,
          ),
          nextAvailableAt: null,
        },
      })),
      limits: {
        ruleLimit: guildSettings?.notificationRuleLimit ?? 20,
        ruleCount: rules.length,
        maxNpcsPerRule: GUILD_NOTIFICATION_MAX_NPCS_PER_RULE,
        testTriggerLimit: GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT,
        testTriggerWindowSeconds: Math.floor(
          GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS / 1000,
        ),
      },
    };
  }

  async createGuildRule(guildId: string, data: CreateNotificationRuleDto) {
    await this.ensureGuildNotificationPermissions(guildId);
    await this.ensureGuildRuleLimitNotExceeded(guildId);
    const isScheduledMessage =
      (data.triggerType as string) ===
      DbNotificationTriggerType.SCHEDULED_MESSAGE;

    if (!isScheduledMessage) {
      this.validateRuleNpcSelection(data);
    }

    const targetIds = await this.validateTargetIds({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
      targetIds: data.targetIds,
    });

    const notificationRule = await this.prisma.notificationRule.create({
      data: {
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
        triggerType: data.triggerType as DbNotificationTriggerType,
        guildId,
        world: isScheduledMessage ? null : (data.world ?? null),
        name: data.name ?? null,
        filters: isScheduledMessage ? Prisma.DbNull : this.buildFilters(data),
        contentTemplate: this.normalizeContentTemplate(data.contentTemplate),
        ...this.resolveScheduleConfig({
          triggerType: data.triggerType as DbNotificationTriggerType,
          data,
        }),
        ...this.resolveScheduledMessageFields({
          ownerType: DbNotificationOwnerType.GUILD,
          data: isScheduledMessage ? data : null,
        }),
        enabled: data.enabled ?? true,
        dedupeWindowSeconds: 0,
        targets: {
          createMany: {
            data: targetIds.map((targetId) => ({ targetId })),
          },
        },
      },
    });

    await this.rebuildJobsForRule(notificationRule.id);

    return this.getRuleById(notificationRule.id);
  }

  async updateGuildRule(
    guildId: string,
    ruleId: number,
    data: UpdateNotificationRuleDto,
  ) {
    await this.ensureGuildNotificationPermissions(guildId);
    const hasName = Object.prototype.hasOwnProperty.call(data, "name");
    const hasWorld = Object.prototype.hasOwnProperty.call(data, "world");
    const hasContentTemplate = Object.prototype.hasOwnProperty.call(
      data,
      "contentTemplate",
    );
    const existingRule = await this.ensureRule({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
      ruleId,
    });
    const nextTriggerType =
      (data.triggerType as DbNotificationTriggerType | undefined) ??
      existingRule.triggerType;
    const isScheduledMessage =
      nextTriggerType === DbNotificationTriggerType.SCHEDULED_MESSAGE;

    if (!isScheduledMessage) {
      this.validateRuleNpcSelection(data);
    }

    const targetIds = data.targetIds
      ? await this.validateTargetIds({
          ownerType: DbNotificationOwnerType.GUILD,
          ownerId: guildId,
          targetIds: data.targetIds,
        })
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.notificationRule.update({
        where: { id: ruleId },
        data: {
          triggerType: nextTriggerType,
          world: isScheduledMessage
            ? null
            : hasWorld
              ? (data.world ?? null)
              : existingRule.world,
          name: hasName ? (data.name ?? null) : existingRule.name,
          contentTemplate: hasContentTemplate
            ? this.normalizeContentTemplate(data.contentTemplate)
            : existingRule.contentTemplate,
          filters: isScheduledMessage
            ? Prisma.DbNull
            : data.npcId !== undefined ||
                data.npcIds !== undefined ||
                data.itemId !== undefined ||
                data.itemIds !== undefined
              ? this.buildFilters(data)
              : existingRule.filters,
          ...this.resolveScheduleConfig({
            triggerType: nextTriggerType,
            data,
            existingRule,
          }),
          ...this.resolveScheduledMessageFields({
            ownerType: DbNotificationOwnerType.GUILD,
            data: isScheduledMessage ? data : null,
            existingRule: isScheduledMessage
              ? {
                  scheduledAt: existingRule.scheduledAt,
                  scheduleIntervalType: existingRule.scheduleIntervalType,
                  scheduleIntervalValue: existingRule.scheduleIntervalValue,
                  scheduleWeekday: existingRule.scheduleWeekday,
                  scheduleTimeOfDay: existingRule.scheduleTimeOfDay,
                  scheduledUntil: existingRule.scheduledUntil,
                  scheduleTimezone: existingRule.scheduleTimezone,
                }
              : undefined,
          }),
          enabled: data.enabled ?? existingRule.enabled,
          dedupeWindowSeconds: existingRule.dedupeWindowSeconds,
        },
      });

      if (targetIds) {
        await tx.notificationRuleTarget.deleteMany({
          where: { ruleId },
        });
        await tx.notificationRuleTarget.createMany({
          data: targetIds.map((targetId) => ({ ruleId, targetId })),
          skipDuplicates: true,
        });
      }
    });

    await this.rebuildJobsForRule(ruleId);

    return this.getRuleById(ruleId);
  }

  async deleteGuildRule(guildId: string, ruleId: number) {
    await this.ensureRule({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
      ruleId,
    });
    await this.cancelPendingJobs({ ruleId });
    await this.prisma.notificationRule.delete({ where: { id: ruleId } });
    return { success: true };
  }

  async rebuildGuildRuleJobs(guildId: string, ruleId: number) {
    await this.ensureRule({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
      ruleId,
    });

    await this.rebuildJobsForRule(ruleId);

    return { success: true };
  }

  async triggerGuildRuleTest(guildId: string, ruleId: number) {
    await this.ensureGuildNotificationPermissions(guildId);

    const notificationRule = await this.prisma.notificationRule.findFirst({
      where: {
        id: ruleId,
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
      },
      include: {
        targets: {
          include: {
            target: true,
          },
        },
      },
    });

    if (!notificationRule) {
      throw new NotFoundException("Notification rule not found");
    }

    if (!notificationRule.enabled) {
      throw new ConflictException("Only enabled rules can be test triggered");
    }

    const activeTargets = notificationRule.targets
      .map((relation) => relation.target)
      .filter((target) => target.active && target.canSend);

    if (activeTargets.length === 0) {
      throw new ConflictException(
        "Notification rule requires at least one active target that can send",
      );
    }

    const testTriggerUsage = await this.getRuleTestTriggerUsage(
      notificationRule.id,
    );

    if (testTriggerUsage.remaining <= 0) {
      throw new ConflictException({
        message: "Test trigger limit reached for this rule",
        limit: testTriggerUsage.limit,
        windowSeconds: testTriggerUsage.windowSeconds,
        nextAvailableAt: testTriggerUsage.nextAvailableAt,
      });
    }

    const now = new Date();
    const testEventId = `test:${notificationRule.id}:${randomUUID()}`;
    let createdJobsCount = 0;

    for (const target of activeTargets) {
      const testPayload = await this.buildTestNotificationPayload({
        notificationRule,
        scheduledFor: now,
        targetType: target.targetType,
      });
      const notificationJob = await this.createNotificationJob({
        notificationRule,
        target,
        jobKind: DbNotificationJobKind.TEST,
        scheduledFor: now,
        sourceEntityType: "rule-test",
        sourceEntityId: String(notificationRule.id),
        sourceEventId: testEventId,
        payloadSnapshot: {
          ...testPayload,
          testTriggeredAt: now.toISOString(),
          source: "rule-test",
        },
      });

      if (!notificationJob) {
        continue;
      }

      createdJobsCount += 1;
      await this.enqueueNotificationJob(notificationJob.id, 0);
    }

    if (createdJobsCount === 0) {
      throw new ConflictException("No test jobs were created for this rule");
    }

    return { success: true };
  }

  async listGuildJobs(guildId: string) {
    return this.getJobsForOwner({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
    });
  }

  async cancelGuildJob(guildId: string, jobId: string) {
    await this.ensureGuildJob(guildId, jobId);
    await this.cancelPendingJobs({ jobId });

    return { success: true };
  }

  async listUserTargets(userId: string) {
    return this.prisma.notificationTarget.findMany({
      where: {
        ownerType: DbNotificationOwnerType.USER,
        ownerId: userId,
      },
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    });
  }

  async createUserTarget(
    userId: string,
    discordId: string,
    data: CreateNotificationTargetDto,
  ) {
    if (data.targetType !== DbNotificationTargetType.DM) {
      throw new BadRequestException(
        "User notification targets must be Discord DMs",
      );
    }

    if (data.externalId && data.externalId !== discordId) {
      throw new BadRequestException(
        "User DM notification targets must use the authenticated Discord account",
      );
    }

    const target = await this.prisma.notificationTarget.upsert({
      where: {
        ownerType_ownerId_provider_targetType_externalId: {
          ownerType: DbNotificationOwnerType.USER,
          ownerId: userId,
          provider: DbNotificationProvider.DISCORD,
          targetType: DbNotificationTargetType.DM,
          externalId: discordId,
        },
      },
      create: {
        ownerType: DbNotificationOwnerType.USER,
        ownerId: userId,
        provider: DbNotificationProvider.DISCORD,
        targetType: DbNotificationTargetType.DM,
        externalId: discordId,
        displayName: data.displayName ?? "Discord DM",
        active: true,
        canSend: true,
      },
      update: {
        displayName: data.displayName ?? "Discord DM",
        active: true,
        canSend: true,
      },
    });

    await this.attachUserTargetToWatchedItemRules(userId, target.id);

    return target;
  }

  async updateUserTarget(
    userId: string,
    targetId: number,
    data: UpdateNotificationTargetDto,
  ) {
    await this.ensureUserTarget(userId, targetId);
    const hasDisplayName = Object.prototype.hasOwnProperty.call(
      data,
      "displayName",
    );

    return this.prisma.notificationTarget.update({
      where: { id: targetId },
      data: {
        ...(hasDisplayName ? { displayName: data.displayName ?? null } : {}),
        active: data.active,
      },
    });
  }

  async deleteUserTarget(userId: string, targetId: number) {
    await this.ensureUserTarget(userId, targetId);
    await this.cancelPendingJobs({ targetId });
    await this.prisma.notificationTarget.delete({ where: { id: targetId } });
    return { success: true };
  }

  async listUserRules(userId: string) {
    return this.prisma.notificationRule.findMany({
      where: {
        ownerType: DbNotificationOwnerType.USER,
        ownerId: userId,
      },
      include: {
        targets: {
          include: {
            target: true,
          },
        },
      },
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
    });
  }

  async createUserRule(userId: string, data: CreateNotificationRuleDto) {
    const isScheduledMessage =
      (data.triggerType as DbNotificationTriggerType) ===
      DbNotificationTriggerType.SCHEDULED_MESSAGE;

    if (!isScheduledMessage) {
      this.validateRuleNpcSelection(data);
    }

    const targetIds = await this.validateTargetIds({
      ownerType: DbNotificationOwnerType.USER,
      ownerId: userId,
      targetIds: data.targetIds,
    });

    const notificationRule = await this.prisma.notificationRule.create({
      data: {
        ownerType: DbNotificationOwnerType.USER,
        ownerId: userId,
        triggerType: data.triggerType as DbNotificationTriggerType,
        guildId: null,
        world: isScheduledMessage ? null : (data.world ?? null),
        name: data.name ?? null,
        filters: isScheduledMessage ? Prisma.DbNull : this.buildFilters(data),
        contentTemplate: this.normalizeContentTemplate(data.contentTemplate),
        ...this.resolveScheduleConfig({
          triggerType: data.triggerType as DbNotificationTriggerType,
          data,
        }),
        ...this.resolveScheduledMessageFields({
          ownerType: DbNotificationOwnerType.USER,
          data: isScheduledMessage ? data : null,
        }),
        enabled: data.enabled ?? true,
        dedupeWindowSeconds: 0,
        targets: {
          createMany: {
            data: targetIds.map((targetId) => ({ targetId })),
          },
        },
      },
    });

    return this.getRuleById(notificationRule.id);
  }

  async updateUserRule(
    userId: string,
    ruleId: number,
    data: UpdateNotificationRuleDto,
  ) {
    const hasName = Object.prototype.hasOwnProperty.call(data, "name");
    const hasWorld = Object.prototype.hasOwnProperty.call(data, "world");
    const hasContentTemplate = Object.prototype.hasOwnProperty.call(
      data,
      "contentTemplate",
    );
    const existingRule = await this.ensureRule({
      ownerType: DbNotificationOwnerType.USER,
      ownerId: userId,
      ruleId,
    });
    const nextTriggerType =
      (data.triggerType as DbNotificationTriggerType | undefined) ??
      existingRule.triggerType;
    const isScheduledMessage =
      nextTriggerType === DbNotificationTriggerType.SCHEDULED_MESSAGE;

    if (!isScheduledMessage) {
      this.validateRuleNpcSelection(data);
    }

    const targetIds = data.targetIds
      ? await this.validateTargetIds({
          ownerType: DbNotificationOwnerType.USER,
          ownerId: userId,
          targetIds: data.targetIds,
        })
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.notificationRule.update({
        where: { id: ruleId },
        data: {
          triggerType: nextTriggerType,
          world: isScheduledMessage
            ? null
            : hasWorld
              ? (data.world ?? null)
              : existingRule.world,
          name: hasName ? (data.name ?? null) : existingRule.name,
          contentTemplate: hasContentTemplate
            ? this.normalizeContentTemplate(data.contentTemplate)
            : existingRule.contentTemplate,
          filters: isScheduledMessage
            ? Prisma.DbNull
            : data.npcId !== undefined ||
                data.npcIds !== undefined ||
                data.itemId !== undefined ||
                data.itemIds !== undefined
              ? this.buildFilters(data)
              : existingRule.filters,
          ...this.resolveScheduleConfig({
            triggerType: nextTriggerType,
            data,
            existingRule,
          }),
          ...this.resolveScheduledMessageFields({
            ownerType: DbNotificationOwnerType.USER,
            data: isScheduledMessage ? data : null,
            existingRule: isScheduledMessage
              ? {
                  scheduledAt: existingRule.scheduledAt,
                  scheduleIntervalType: existingRule.scheduleIntervalType,
                  scheduleIntervalValue: existingRule.scheduleIntervalValue,
                  scheduleWeekday: existingRule.scheduleWeekday,
                  scheduleTimeOfDay: existingRule.scheduleTimeOfDay,
                  scheduledUntil: existingRule.scheduledUntil,
                  scheduleTimezone: existingRule.scheduleTimezone,
                }
              : undefined,
          }),
          enabled: data.enabled ?? existingRule.enabled,
          dedupeWindowSeconds: existingRule.dedupeWindowSeconds,
        },
      });

      if (targetIds) {
        await tx.notificationRuleTarget.deleteMany({
          where: { ruleId },
        });
        await tx.notificationRuleTarget.createMany({
          data: targetIds.map((targetId) => ({ ruleId, targetId })),
          skipDuplicates: true,
        });
      }
    });

    return this.getRuleById(ruleId);
  }

  async deleteUserRule(userId: string, ruleId: number) {
    await this.ensureRule({
      ownerType: DbNotificationOwnerType.USER,
      ownerId: userId,
      ruleId,
    });
    await this.cancelPendingJobs({ ruleId });
    await this.prisma.notificationRule.delete({ where: { id: ruleId } });
    return { success: true };
  }

  async listUserJobs(userId: string) {
    return this.getJobsForOwner({
      ownerType: DbNotificationOwnerType.USER,
      ownerId: userId,
    });
  }

  async listWatchedItems(userId: string) {
    return this.prisma.watchedItem.findMany({
      where: { userId },
      include: {
        notificationRule: {
          include: {
            targets: {
              include: {
                target: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createWatchedItem(userId: string, data: CreateWatchedItemDto) {
    const existingWatchedItem = await this.prisma.watchedItem.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId: data.itemId,
        },
      },
      include: {
        notificationRule: true,
      },
    });

    const targetIds = await this.getActiveUserTargetIds(userId);

    if (existingWatchedItem?.notificationRuleId) {
      await this.prisma.$transaction(async (tx) => {
        await tx.watchedItem.update({
          where: { id: existingWatchedItem.id },
          data: { enabled: true },
        });
        await tx.notificationRule.update({
          where: { id: existingWatchedItem.notificationRuleId },
          data: {
            enabled: true,
            filters: { itemId: data.itemId },
          },
        });
        if (targetIds.length > 0) {
          await tx.notificationRuleTarget.createMany({
            data: targetIds.map((targetId) => ({
              ruleId: existingWatchedItem.notificationRuleId!,
              targetId,
            })),
            skipDuplicates: true,
          });
        }
      });

      return this.prisma.watchedItem.findUnique({
        where: { id: existingWatchedItem.id },
        include: {
          notificationRule: {
            include: {
              targets: {
                include: {
                  target: true,
                },
              },
            },
          },
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const notificationRule = await tx.notificationRule.create({
        data: {
          ownerType: DbNotificationOwnerType.USER,
          ownerId: userId,
          triggerType: DbNotificationTriggerType.WATCHED_ITEM_DROPPED,
          filters: { itemId: data.itemId },
          enabled: true,
          dedupeWindowSeconds: 0,
          targets:
            targetIds.length > 0
              ? {
                  createMany: {
                    data: targetIds.map((targetId) => ({ targetId })),
                  },
                }
              : undefined,
        },
      });

      return tx.watchedItem.upsert({
        where: {
          userId_itemId: {
            userId,
            itemId: data.itemId,
          },
        },
        create: {
          userId,
          itemId: data.itemId,
          notificationRuleId: notificationRule.id,
        },
        update: {
          enabled: true,
          notificationRuleId: notificationRule.id,
        },
        include: {
          notificationRule: {
            include: {
              targets: {
                include: {
                  target: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async deleteWatchedItem(userId: string, watchedItemId: number) {
    const watchedItem = await this.prisma.watchedItem.findFirst({
      where: {
        id: watchedItemId,
        userId,
      },
    });

    if (!watchedItem) {
      throw new NotFoundException("Watched item not found");
    }

    if (watchedItem.notificationRuleId) {
      await this.cancelPendingJobs({ ruleId: watchedItem.notificationRuleId });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.watchedItem.delete({ where: { id: watchedItem.id } });

      if (watchedItem.notificationRuleId) {
        await tx.notificationRule.delete({
          where: { id: watchedItem.notificationRuleId },
        });
      }
    });

    return { success: true };
  }

  async handleTimerUpdated(event: TimerUpdatedEvent) {
    const notificationRules = await this.prisma.notificationRule.findMany({
      where: {
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: event.guildId,
        guildId: event.guildId,
        enabled: true,
        triggerType: DbNotificationTriggerType.TIMER_BEFORE_SPAWN,
        OR: [{ world: null }, { world: event.world }],
      },
    });

    for (const notificationRule of notificationRules) {
      if (!this.matchesTimerRule(notificationRule.filters, event.npcId)) {
        continue;
      }

      await this.rebuildTimerJobsForRule(notificationRule.id, event);
    }
  }

  async handleTimerDeleted(event: TimerDeletedEvent) {
    await this.cancelPendingJobs({
      sourceEntityType: "timer",
      sourceEntityId: this.getTimerSourceEntityId(event),
    });
  }

  async handleLootCreated(event: LootCreatedEvent) {
    const watchedItems = await this.prisma.watchedItem.findMany({
      where: {
        enabled: true,
        itemId: {
          in: event.itemIds,
        },
        notificationRule: {
          is: {
            enabled: true,
            triggerType: DbNotificationTriggerType.WATCHED_ITEM_DROPPED,
            targets: {
              some: {},
            },
          },
        },
      },
      include: {
        notificationRule: {
          include: {
            targets: {
              include: {
                target: true,
              },
            },
          },
        },
      },
    });

    for (const watchedItem of watchedItems) {
      const notificationRule = watchedItem.notificationRule;
      if (!notificationRule) {
        continue;
      }

      if (!this.matchesLootRule(notificationRule.filters, event)) {
        continue;
      }

      for (const relation of notificationRule.targets) {
        if (!relation.target.active || !relation.target.canSend) {
          continue;
        }

        const notificationJob = await this.createNotificationJob({
          notificationRule,
          target: relation.target,
          jobKind: DbNotificationJobKind.INSTANT,
          scheduledFor: new Date(),
          sourceEntityType: "loot",
          sourceEntityId: String(event.lootId),
          sourceEventId: `loot:${event.lootId}`,
          payloadSnapshot: {
            title: "Obserwowany item dropnął",
            message: `Na świecie ${event.world} wypadły obserwowane przedmioty: ${event.itemNames.join(", ")}`,
            world: event.world,
            itemIds: event.itemIds,
            itemNames: event.itemNames,
            guildIds: event.guildIds,
          },
        });

        if (notificationJob) {
          await this.enqueueNotificationJob(notificationJob.id, 0);
        }
      }
    }
  }

  async dispatchNotificationJob(notificationJobId: string) {
    const notificationJob = await this.prisma.notificationJob.findUnique({
      where: { id: notificationJobId },
      include: {
        rule: true,
        target: true,
      },
    });

    if (!notificationJob) {
      return;
    }

    if (
      notificationJob.status !== DbNotificationJobStatus.PENDING &&
      notificationJob.status !== DbNotificationJobStatus.BLOCKED
    ) {
      return;
    }

    const targetBlockedReason = this.getNotificationTargetBlockedReason(
      notificationJob.target,
    );

    if (targetBlockedReason) {
      await this.prisma.notificationJob.update({
        where: { id: notificationJob.id },
        data: {
          status: DbNotificationJobStatus.BLOCKED,
          blockedReason: targetBlockedReason,
          lastError: targetBlockedReason,
        },
      });
      return;
    }

    if (
      notificationJob.ownerType === DbNotificationOwnerType.GUILD &&
      !(await this.guildsService.hasRequiredGuildPermissions(
        notificationJob.ownerId,
      ))
    ) {
      await this.prisma.notificationJob.update({
        where: { id: notificationJob.id },
        data: {
          status: DbNotificationJobStatus.BLOCKED,
          blockedReason: "Missing Discord bot permissions",
          lastError: "Missing Discord bot permissions",
        },
      });
      return;
    }

    await this.prisma.notificationJob.update({
      where: { id: notificationJob.id },
      data: {
        status: DbNotificationJobStatus.PROCESSING,
        blockedReason: null,
        attemptCount: {
          increment: 1,
        },
      },
    });

    const payload = notificationJob.payloadSnapshot as
      | Prisma.JsonObject
      | null
      | undefined;

    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.NOTIFICATIONS_DISCORD_SEND,
      {
        notificationJobId: notificationJob.id,
        provider: DbNotificationProvider.DISCORD,
        ownerType: notificationJob.ownerType,
        ownerId: notificationJob.ownerId,
        guildId: notificationJob.rule.guildId,
        content:
          typeof payload?.content === "string" ? payload.content : undefined,
        title:
          typeof payload?.title === "string" ? payload.title : "Powiadomienie",
        message:
          typeof payload?.message === "string"
            ? payload.message
            : "Masz nowe powiadomienie",
        allowedMentions: this.parseAllowedMentions(payload?.allowedMentions),
        metadata: payload && typeof payload === "object" ? payload : undefined,
        target: {
          targetId: String(notificationJob.target.id),
          externalId: notificationJob.target.externalId,
          targetType: notificationJob.target.targetType,
        },
      },
    );
  }

  async handleDeliveryResult(event: DiscordNotificationDeliveryResultEvent) {
    const notificationJob = await this.prisma.notificationJob.findUnique({
      where: { id: event.notificationJobId },
    });

    if (!notificationJob) {
      return;
    }

    if (
      (FINAL_JOB_STATUSES as readonly DbNotificationJobStatus[]).includes(
        notificationJob.status,
      )
    ) {
      return;
    }

    if (event.success) {
      await this.prisma.$transaction(async (tx) => {
        await tx.notificationJob.update({
          where: { id: notificationJob.id },
          data: {
            status: DbNotificationJobStatus.SENT,
            processedAt: new Date(event.deliveredAt),
            providerMessageId: event.providerMessageId ?? null,
            lastError: null,
          },
        });

        await tx.notificationTarget.update({
          where: { id: notificationJob.targetId },
          data: {
            lastDeliveryAt: new Date(event.deliveredAt),
            lastDeliveryError: null,
          },
        });
      });

      await this.pruneHistory({
        ownerType: notificationJob.ownerType,
        ownerId: notificationJob.ownerId,
      });

      if (notificationJob.sourceEntityType === "scheduled-message") {
        await this.scheduleNextRecurringJob(notificationJob.ruleId);
      }

      return;
    }

    const nextAttemptCount = notificationJob.attemptCount;
    const shouldRetry = event.retryable && nextAttemptCount < 3;

    await this.prisma.$transaction(async (tx) => {
      await tx.notificationTarget.update({
        where: { id: notificationJob.targetId },
        data: {
          lastDeliveryError:
            event.errorMessage ??
            event.errorCode ??
            "Notification delivery failed",
        },
      });

      await tx.notificationJob.update({
        where: { id: notificationJob.id },
        data: shouldRetry
          ? {
              status: DbNotificationJobStatus.PENDING,
              lastError:
                event.errorMessage ??
                event.errorCode ??
                "Notification delivery failed",
            }
          : {
              status: DbNotificationJobStatus.FAILED,
              processedAt: new Date(event.deliveredAt),
              lastError:
                event.errorMessage ??
                event.errorCode ??
                "Notification delivery failed",
            },
      });
    });

    if (shouldRetry) {
      await this.enqueueNotificationJob(
        notificationJob.id,
        Math.max(30_000, nextAttemptCount * 30_000),
      );
      return;
    }

    await this.pruneHistory({
      ownerType: notificationJob.ownerType,
      ownerId: notificationJob.ownerId,
    });

    if (notificationJob.sourceEntityType === "scheduled-message") {
      await this.scheduleNextRecurringJob(notificationJob.ruleId);
    }
  }

  async handleGuildChannelDeleted(event: DiscordGuildChannelDeletedEvent) {
    const targets = await this.prisma.notificationTarget.findMany({
      where: {
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: event.guildId,
        provider: DbNotificationProvider.DISCORD,
        targetType: DbNotificationTargetType.CHANNEL,
        externalId: event.channelId,
      },
      select: { id: true },
    });

    if (targets.length === 0) {
      return;
    }

    await Promise.all(
      targets.map((target) => this.cancelPendingJobs({ targetId: target.id })),
    );

    await this.prisma.notificationTarget.deleteMany({
      where: {
        id: {
          in: targets.map((target) => target.id),
        },
      },
    });
  }

  async rebuildJobsForRule(ruleId: number) {
    const notificationRule = await this.prisma.notificationRule.findUnique({
      where: { id: ruleId },
    });

    if (!notificationRule) {
      return;
    }

    await this.cancelPendingJobs({ ruleId });

    if (
      notificationRule.triggerType ===
        DbNotificationTriggerType.SCHEDULED_MESSAGE &&
      notificationRule.enabled &&
      notificationRule.scheduledAt
    ) {
      await this.rebuildScheduledMessageJobsForRule(notificationRule.id);
      return;
    }

    if (
      notificationRule.triggerType !==
        DbNotificationTriggerType.TIMER_BEFORE_SPAWN ||
      !notificationRule.enabled ||
      !notificationRule.guildId ||
      notificationRule.scheduleStrategy !==
        DbNotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE ||
      notificationRule.scheduleAnchor === null ||
      notificationRule.scheduleOffsetMinutes === null
    ) {
      return;
    }

    const timers = await this.prisma.timer.findMany({
      where: {
        guildId: notificationRule.guildId,
        ...(notificationRule.world ? { world: notificationRule.world } : {}),
      },
      select: {
        guildId: true,
        world: true,
        npcId: true,
        timerKey: true,
        minSpawnTime: true,
        maxSpawnTime: true,
        npc: true,
      },
    });

    for (const timer of timers) {
      if (!this.matchesTimerRule(notificationRule.filters, timer.npcId)) {
        continue;
      }

      await this.rebuildTimerJobsForRule(notificationRule.id, {
        guildId: timer.guildId,
        world: timer.world,
        npcId: timer.npcId,
        timerKey: timer.timerKey,
        minSpawnTime: timer.minSpawnTime,
        maxSpawnTime: timer.maxSpawnTime,
        npc:
          timer.npc &&
          typeof timer.npc === "object" &&
          !Array.isArray(timer.npc)
            ? (timer.npc as { name?: string })
            : null,
      });
    }
  }

  private async rebuildTimerJobsForRule(
    ruleId: number,
    event: TimerUpdatedEvent,
  ) {
    const notificationRule = await this.prisma.notificationRule.findUnique({
      where: { id: ruleId },
      include: {
        targets: {
          include: {
            target: true,
          },
        },
      },
    });

    if (
      !notificationRule ||
      !notificationRule.enabled ||
      notificationRule.scheduleStrategy !==
        DbNotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE ||
      notificationRule.scheduleAnchor === null ||
      notificationRule.scheduleOffsetMinutes === null
    ) {
      return;
    }

    const sourceEntityId = this.getTimerSourceEntityId(event);
    await this.cancelPendingJobs({
      ruleId,
      sourceEntityType: "timer",
      sourceEntityId,
    });

    const hasRequiredPermissions =
      notificationRule.ownerType === DbNotificationOwnerType.USER
        ? true
        : await this.guildsService.hasRequiredGuildPermissions(
            notificationRule.ownerId,
          );

    for (const relation of notificationRule.targets) {
      if (!relation.target.active || !relation.target.canSend) {
        continue;
      }

      const scheduledFor = this.calculateTimerNotificationSchedule({
        minSpawnTime: event.minSpawnTime,
        maxSpawnTime: event.maxSpawnTime,
        scheduleAnchor: notificationRule.scheduleAnchor,
        scheduleOffsetMinutes: notificationRule.scheduleOffsetMinutes,
      });

      const effectiveScheduledFor =
        scheduledFor.getTime() < Date.now() ? new Date() : scheduledFor;

      const notificationJob = await this.createNotificationJob({
        notificationRule,
        target: relation.target,
        jobKind: DbNotificationJobKind.SCHEDULED,
        scheduledFor: effectiveScheduledFor,
        sourceEntityType: "timer",
        sourceEntityId,
        payloadSnapshot: this.buildTimerNotificationPayload({
          notificationRule,
          target: relation.target,
          npcId: event.npcId,
          npcName: event.npc?.name ?? null,
          world: event.world,
          timerKey: event.timerKey,
          minSpawnTime: new Date(event.minSpawnTime),
          maxSpawnTime: new Date(event.maxSpawnTime),
          scheduledFor: effectiveScheduledFor,
        }),
        forceBlocked:
          !hasRequiredPermissions ||
          !relation.target.canSend ||
          !relation.target.active,
      });

      if (
        notificationJob &&
        notificationJob.status === DbNotificationJobStatus.PENDING
      ) {
        const delay = Math.max(0, effectiveScheduledFor.getTime() - Date.now());
        await this.enqueueNotificationJob(notificationJob.id, delay);
      }
    }
  }

  private async rebuildScheduledMessageJobsForRule(ruleId: number) {
    const notificationRule = await this.prisma.notificationRule.findUnique({
      where: { id: ruleId },
      include: {
        targets: {
          include: {
            target: true,
          },
        },
      },
    });

    if (
      !notificationRule ||
      !notificationRule.enabled ||
      !notificationRule.scheduledAt
    ) {
      return;
    }

    const scheduledAt = notificationRule.scheduledAt;

    if (scheduledAt.getTime() < Date.now()) {
      return;
    }

    if (
      notificationRule.scheduledUntil &&
      scheduledAt.getTime() > notificationRule.scheduledUntil.getTime()
    ) {
      return;
    }

    const hasRequiredPermissions =
      notificationRule.ownerType === DbNotificationOwnerType.USER
        ? true
        : await this.guildsService.hasRequiredGuildPermissions(
            notificationRule.ownerId,
          );

    for (const relation of notificationRule.targets) {
      if (!relation.target.active || !relation.target.canSend) {
        continue;
      }

      const notificationJob = await this.createNotificationJob({
        notificationRule,
        target: relation.target,
        jobKind: DbNotificationJobKind.SCHEDULED,
        scheduledFor: scheduledAt,
        sourceEntityType: "scheduled-message",
        sourceEntityId: String(notificationRule.id),
        payloadSnapshot: this.buildScheduledMessagePayload({
          notificationRule,
          target: relation.target,
          scheduledFor: scheduledAt,
        }),
        forceBlocked:
          !hasRequiredPermissions ||
          !relation.target.canSend ||
          !relation.target.active,
      });

      if (
        notificationJob &&
        notificationJob.status === DbNotificationJobStatus.PENDING
      ) {
        const delay = Math.max(0, scheduledAt.getTime() - Date.now());
        await this.enqueueNotificationJob(notificationJob.id, delay);
      }
    }
  }

  private buildScheduledMessagePayload(params: {
    notificationRule: {
      id: number;
      name: string | null;
      triggerType: DbNotificationTriggerType;
      contentTemplate?: string | null;
      scheduleTimezone?: string | null;
    };
    target: {
      targetType: DbNotificationTargetType;
    };
    scheduledFor: Date;
  }) {
    const ruleName = params.notificationRule.name?.trim().length
      ? params.notificationRule.name.trim()
      : "Zaplanowana wiadomosc";
    const message = `Zaplanowana wiadomosc "${ruleName}".`;
    const content = this.renderScheduledMessageContent({
      template:
        params.notificationRule.contentTemplate ??
        DEFAULT_SCHEDULED_MESSAGE_TEMPLATE,
      notificationRuleName: params.notificationRule.name,
      scheduledFor: params.scheduledFor,
      timeZone:
        params.notificationRule.scheduleTimezone ?? GUILD_NOTIFICATION_TIMEZONE,
    });

    return {
      title: "Zaplanowana wiadomosc",
      message,
      content,
      allowedMentions: this.buildAllowedMentionsForTarget(
        content,
        params.target.targetType,
      ),
      ruleId: params.notificationRule.id,
      ruleName: params.notificationRule.name,
      triggerType: params.notificationRule.triggerType,
      scheduledFor: params.scheduledFor.toISOString(),
      contentTemplate:
        params.notificationRule.contentTemplate ??
        DEFAULT_SCHEDULED_MESSAGE_TEMPLATE,
    } satisfies Prisma.InputJsonObject;
  }

  private renderScheduledMessageContent(params: {
    template: string;
    notificationRuleName: string | null;
    scheduledFor: Date;
    timeZone: string;
  }) {
    const placeholderValues = {
      ruleName: params.notificationRuleName?.trim().length
        ? params.notificationRuleName.trim()
        : "Zaplanowana wiadomosc",
      scheduledFor: this.formatNotificationDate(
        params.scheduledFor,
        params.timeZone,
      ),
    } satisfies Record<string, string>;

    return params.template.replaceAll(
      /\{\{(ruleName|scheduledFor)\}\}/g,
      (_match, placeholder) => placeholderValues[placeholder] ?? "",
    );
  }

  private resolveScheduledMessageFields(params: {
    ownerType: DbNotificationOwnerType;
    data: Pick<
      CreateNotificationRuleDto | UpdateNotificationRuleDto,
      | "scheduledAt"
      | "scheduleIntervalType"
      | "scheduleIntervalValue"
      | "scheduleWeekday"
      | "scheduleTimeOfDay"
      | "scheduledUntil"
      | "scheduleTimezone"
    > | null;
    existingRule?: {
      scheduledAt: Date | null;
      scheduleIntervalType: DbNotificationScheduleIntervalType | null;
      scheduleIntervalValue: number | null;
      scheduleWeekday: number | null;
      scheduleTimeOfDay: string | null;
      scheduledUntil: Date | null;
      scheduleTimezone: string | null;
    };
  }) {
    const { data, existingRule, ownerType } = params;

    if (!data) {
      return {
        scheduledAt: null,
        scheduleIntervalType: null,
        scheduleIntervalValue: null,
        scheduleWeekday: null,
        scheduleTimeOfDay: null,
        scheduledUntil: null,
        scheduleTimezone: null,
      };
    }

    const intervalType =
      (data.scheduleIntervalType as
        | DbNotificationScheduleIntervalType
        | undefined) ??
      existingRule?.scheduleIntervalType ??
      DbNotificationScheduleIntervalType.ONCE;
    const intervalValue =
      data.scheduleIntervalValue ?? existingRule?.scheduleIntervalValue ?? null;
    const weekday =
      data.scheduleWeekday ?? existingRule?.scheduleWeekday ?? null;
    const timeOfDay =
      data.scheduleTimeOfDay ?? existingRule?.scheduleTimeOfDay ?? null;
    const scheduledUntil = Object.prototype.hasOwnProperty.call(
      data,
      "scheduledUntil",
    )
      ? data.scheduledUntil
        ? new Date(data.scheduledUntil)
        : null
      : (existingRule?.scheduledUntil ?? null);
    const scheduleTimezone = this.resolveNotificationScheduleTimeZone({
      ownerType,
      providedTimeZone: data.scheduleTimezone,
      existingTimeZone: existingRule?.scheduleTimezone ?? null,
    });

    if (
      ownerType === DbNotificationOwnerType.USER &&
      (intervalType === DbNotificationScheduleIntervalType.DAILY ||
        intervalType === DbNotificationScheduleIntervalType.WEEKLY) &&
      !scheduleTimezone
    ) {
      throw new BadRequestException(
        "Recurring user scheduled messages require scheduleTimezone",
      );
    }

    let scheduledAt: Date | null = null;

    if (data.scheduledAt) {
      scheduledAt = new Date(data.scheduledAt);
    } else if (existingRule?.scheduledAt) {
      scheduledAt = existingRule.scheduledAt;
    }

    if (
      !scheduledAt &&
      (intervalType === DbNotificationScheduleIntervalType.DAILY ||
        intervalType === DbNotificationScheduleIntervalType.WEEKLY) &&
      timeOfDay &&
      scheduleTimezone
    ) {
      scheduledAt = calculateFirstOccurrenceInTimeZone({
        intervalType,
        timeOfDay,
        weekday,
        timeZone: scheduleTimezone,
      });
    }

    return {
      scheduledAt,
      scheduleIntervalType: intervalType,
      scheduleIntervalValue: intervalValue,
      scheduleWeekday: weekday,
      scheduleTimeOfDay: timeOfDay,
      scheduledUntil,
      scheduleTimezone,
    };
  }

  private resolveNotificationScheduleTimeZone(params: {
    ownerType: DbNotificationOwnerType;
    providedTimeZone?: string | null;
    existingTimeZone?: string | null;
  }) {
    const normalizedTimeZone = params.providedTimeZone?.trim() ?? "";

    if (normalizedTimeZone.length > 0) {
      if (!isValidTimeZone(normalizedTimeZone)) {
        throw new BadRequestException("Invalid notification schedule timezone");
      }

      return normalizedTimeZone;
    }

    if (params.existingTimeZone) {
      return params.existingTimeZone;
    }

    if (params.ownerType === DbNotificationOwnerType.GUILD) {
      return GUILD_NOTIFICATION_TIMEZONE;
    }

    return null;
  }

  private calculateFirstOccurrence(
    intervalType: DbNotificationScheduleIntervalType,
    timeOfDay: string,
    weekday: number | null,
    timeZone: string,
  ): Date {
    return calculateFirstOccurrenceInTimeZone({
      intervalType,
      timeOfDay,
      weekday,
      timeZone,
    });
  }

  private calculateNextOccurrence(params: {
    currentScheduledAt: Date;
    intervalType: DbNotificationScheduleIntervalType;
    intervalValue: number | null;
    weekday: number | null;
    timeOfDay: string | null;
    timeZone: string;
  }): Date | null {
    return calculateNextOccurrenceInTimeZone(params);
  }

  private async scheduleNextRecurringJob(ruleId: number) {
    const notificationRule = await this.prisma.notificationRule.findUnique({
      where: { id: ruleId },
      include: {
        targets: {
          include: { target: true },
        },
      },
    });

    if (
      !notificationRule ||
      !notificationRule.enabled ||
      !notificationRule.scheduledAt ||
      !notificationRule.scheduleIntervalType ||
      notificationRule.scheduleIntervalType ===
        DbNotificationScheduleIntervalType.ONCE
    ) {
      return;
    }

    const currentCycleJobs = await this.prisma.notificationJob.findMany({
      where: {
        ruleId,
        scheduledFor: notificationRule.scheduledAt,
        sourceEntityType: "scheduled-message",
      },
      select: { status: true },
    });

    if (
      currentCycleJobs.length > 0 &&
      currentCycleJobs.some(
        (job) =>
          !(FINAL_JOB_STATUSES as readonly DbNotificationJobStatus[]).includes(
            job.status,
          ),
      )
    ) {
      return;
    }

    const nextScheduledAt = this.calculateNextOccurrence({
      currentScheduledAt: notificationRule.scheduledAt,
      intervalType: notificationRule.scheduleIntervalType,
      intervalValue: notificationRule.scheduleIntervalValue,
      weekday: notificationRule.scheduleWeekday,
      timeOfDay: notificationRule.scheduleTimeOfDay,
      timeZone:
        notificationRule.scheduleTimezone ??
        (notificationRule.ownerType === DbNotificationOwnerType.GUILD
          ? GUILD_NOTIFICATION_TIMEZONE
          : "UTC"),
    });

    if (!nextScheduledAt) {
      return;
    }

    if (
      notificationRule.scheduledUntil &&
      nextScheduledAt.getTime() > notificationRule.scheduledUntil.getTime()
    ) {
      return;
    }

    const updated = await this.prisma.notificationRule.updateMany({
      where: { id: ruleId, scheduledAt: notificationRule.scheduledAt },
      data: { scheduledAt: nextScheduledAt },
    });

    if (updated.count === 0) {
      return;
    }

    const hasRequiredPermissions =
      notificationRule.ownerType === DbNotificationOwnerType.USER
        ? true
        : await this.guildsService.hasRequiredGuildPermissions(
            notificationRule.ownerId,
          );

    for (const relation of notificationRule.targets) {
      if (!relation.target.active || !relation.target.canSend) {
        continue;
      }

      const notificationJob = await this.createNotificationJob({
        notificationRule,
        target: relation.target,
        jobKind: DbNotificationJobKind.SCHEDULED,
        scheduledFor: nextScheduledAt,
        sourceEntityType: "scheduled-message",
        sourceEntityId: String(notificationRule.id),
        payloadSnapshot: this.buildScheduledMessagePayload({
          notificationRule,
          target: relation.target,
          scheduledFor: nextScheduledAt,
        }),
        forceBlocked:
          !hasRequiredPermissions ||
          !relation.target.canSend ||
          !relation.target.active,
      });

      if (
        notificationJob &&
        notificationJob.status === DbNotificationJobStatus.PENDING
      ) {
        const delay = Math.max(0, nextScheduledAt.getTime() - Date.now());
        await this.enqueueNotificationJob(notificationJob.id, delay);
      }
    }
  }

  private async createNotificationJob(options: {
    notificationRule: {
      id: number;
      ownerType: DbNotificationOwnerType;
      ownerId: string;
      guildId: string | null;
      triggerType: DbNotificationTriggerType;
    };
    target: {
      id: number;
      externalId: string;
      targetType: DbNotificationTargetType;
      active: boolean;
      canSend: boolean;
    };
    jobKind: DbNotificationJobKind;
    scheduledFor: Date;
    sourceEntityType?: string;
    sourceEntityId?: string;
    sourceEventId?: string;
    payloadSnapshot: Prisma.InputJsonValue;
    forceBlocked?: boolean;
  }) {
    const idempotencyKey =
      options.jobKind === DbNotificationJobKind.SCHEDULED
        ? [
            "scheduled",
            options.notificationRule.id,
            options.target.id,
            options.sourceEntityType ?? "unknown",
            options.sourceEntityId ?? "unknown",
            options.scheduledFor.toISOString(),
          ].join(":")
        : [
            options.jobKind === DbNotificationJobKind.TEST ? "test" : "instant",
            options.notificationRule.id,
            options.target.id,
            options.sourceEventId ?? randomUUID(),
          ].join(":");

    try {
      return await this.prisma.notificationJob.create({
        data: {
          id: randomUUID(),
          ruleId: options.notificationRule.id,
          targetId: options.target.id,
          ownerType: options.notificationRule.ownerType,
          ownerId: options.notificationRule.ownerId,
          jobKind: options.jobKind,
          scheduledFor: options.scheduledFor,
          status: options.forceBlocked
            ? DbNotificationJobStatus.BLOCKED
            : DbNotificationJobStatus.PENDING,
          idempotencyKey,
          sourceEntityType: options.sourceEntityType ?? null,
          sourceEntityId: options.sourceEntityId ?? null,
          sourceEventId: options.sourceEventId ?? null,
          payloadSnapshot: options.payloadSnapshot,
          blockedReason: options.forceBlocked
            ? "Missing Discord bot permissions or target access"
            : null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingJob = await this.prisma.notificationJob.findUnique({
          where: { idempotencyKey },
        });

        if (existingJob?.status !== DbNotificationJobStatus.CANCELED) {
          return null;
        }

        return this.prisma.$transaction(async (tx) => {
          await tx.notificationJob.update({
            where: { id: existingJob.id },
            data: {
              idempotencyKey: `${idempotencyKey}:canceled:${randomUUID()}`,
            },
          });

          return tx.notificationJob.create({
            data: {
              id: randomUUID(),
              ruleId: options.notificationRule.id,
              targetId: options.target.id,
              ownerType: options.notificationRule.ownerType,
              ownerId: options.notificationRule.ownerId,
              jobKind: options.jobKind,
              scheduledFor: options.scheduledFor,
              status: options.forceBlocked
                ? DbNotificationJobStatus.BLOCKED
                : DbNotificationJobStatus.PENDING,
              idempotencyKey,
              sourceEntityType: options.sourceEntityType ?? null,
              sourceEntityId: options.sourceEntityId ?? null,
              sourceEventId: options.sourceEventId ?? null,
              payloadSnapshot: options.payloadSnapshot,
              blockedReason: options.forceBlocked
                ? "Missing Discord bot permissions or target access"
                : null,
            },
          });
        });
      }

      throw error;
    }
  }

  private async enqueueNotificationJob(
    notificationJobId: string,
    delayMs: number,
  ) {
    await this.notificationsQueue.add(
      notificationJobId,
      { notificationJobId },
      {
        jobId: notificationJobId,
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  private createGuildChannelTargetMetadata(
    channel: Pick<
      DiscordGuildChannelSnapshot,
      | "channelType"
      | "requiredPermissions"
      | "grantedPermissions"
      | "missingPermissions"
      | "hasRequiredPermissions"
    >,
  ) {
    return {
      channelType: channel.channelType,
      requiredPermissions: channel.requiredPermissions,
      grantedPermissions: channel.grantedPermissions,
      missingPermissions: channel.missingPermissions,
      hasRequiredPermissions: channel.hasRequiredPermissions,
    };
  }

  private getNotificationTargetBlockedReason(target: {
    active: boolean;
    canSend: boolean;
    metadata?: Prisma.JsonValue | null;
  }) {
    if (!target.active) {
      return "Notification target is disabled";
    }

    if (target.canSend) {
      return null;
    }

    const metadata =
      target.metadata && typeof target.metadata === "object"
        ? (target.metadata as Prisma.JsonObject)
        : null;
    const missingPermissions = Array.isArray(metadata?.missingPermissions)
      ? metadata.missingPermissions.filter(
          (permission): permission is string => typeof permission === "string",
        )
      : [];

    if (missingPermissions.length === 0) {
      return "Discord channel is missing required permissions";
    }

    return `Discord channel is missing required permissions: ${missingPermissions.join(", ")}`;
  }

  private async cancelPendingJobs(filters: {
    jobId?: string;
    ruleId?: number;
    targetId?: number;
    sourceEntityType?: string;
    sourceEntityId?: string;
  }) {
    const { jobId, ...remainingFilters } = filters;

    const jobs = await this.prisma.notificationJob.findMany({
      where: {
        ...remainingFilters,
        ...(jobId ? { id: jobId } : {}),
        status: {
          in: [
            DbNotificationJobStatus.PENDING,
            DbNotificationJobStatus.BLOCKED,
            DbNotificationJobStatus.PROCESSING,
          ],
        },
      },
      select: { id: true },
    });

    await Promise.all(
      jobs.map(async (job) => {
        const queueJob = await this.notificationsQueue.getJob(job.id);
        await queueJob?.remove();
      }),
    );

    if (jobs.length === 0) {
      return;
    }

    await this.prisma.notificationJob.updateMany({
      where: {
        id: {
          in: jobs.map((job) => job.id),
        },
      },
      data: {
        status: DbNotificationJobStatus.CANCELED,
        processedAt: new Date(),
      },
    });
  }

  private async getRuleById(ruleId: number) {
    const notificationRule = await this.prisma.notificationRule.findUnique({
      where: { id: ruleId },
      include: {
        targets: {
          include: {
            target: true,
          },
        },
      },
    });

    if (!notificationRule) {
      throw new NotFoundException("Notification rule not found");
    }

    return notificationRule;
  }

  private async getJobsForOwner(owner: OwnerContext) {
    const [pending, history] = await Promise.all([
      this.prisma.notificationJob.findMany({
        where: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          status: {
            in: [
              DbNotificationJobStatus.PENDING,
              DbNotificationJobStatus.PROCESSING,
              DbNotificationJobStatus.BLOCKED,
            ],
          },
        },
        include: {
          rule: true,
          target: true,
        },
        orderBy: [{ scheduledFor: "asc" }],
      }),
      this.prisma.notificationJob.findMany({
        where: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          status: {
            in: FINAL_JOB_STATUSES as unknown as DbNotificationJobStatus[],
          },
        },
        include: {
          rule: true,
          target: true,
        },
        orderBy: [{ updatedAt: "desc" }],
        take: NOTIFICATIONS_HISTORY_RESPONSE_LIMIT,
      }),
    ]);

    return { pending, history };
  }

  private async pruneHistory(owner: OwnerContext) {
    const staleJobs = await this.prisma.notificationJob.findMany({
      where: {
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        status: {
          in: FINAL_JOB_STATUSES as unknown as DbNotificationJobStatus[],
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      skip: NOTIFICATIONS_HISTORY_RETENTION_LIMIT,
      select: { id: true },
    });

    if (staleJobs.length === 0) {
      return;
    }

    await this.prisma.notificationJob.deleteMany({
      where: {
        id: {
          in: staleJobs.map((job) => job.id),
        },
      },
    });
  }

  private async ensureGuildNotificationPermissions(guildId: string) {
    const syncState = await this.guildsService.getGuildDiscordSyncStatus(
      guildId,
      {
        refreshIfStale: true,
      },
    );

    if (!syncState.hasRequiredPermissions) {
      throw new ConflictException({
        message: "Discord bot is missing required permissions",
        missingPermissions: syncState.missingPermissions,
        syncState,
      });
    }

    return syncState;
  }

  private async validateTargetIds(params: {
    ownerType: DbNotificationOwnerType;
    ownerId: string;
    targetIds: number[];
  }) {
    if (params.targetIds.length === 0) {
      throw new BadRequestException("At least one target is required");
    }

    const targets = await this.prisma.notificationTarget.findMany({
      where: {
        id: { in: params.targetIds },
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        active: true,
      },
      select: { id: true },
    });

    if (targets.length !== params.targetIds.length) {
      throw new BadRequestException(
        "One or more notification targets are invalid",
      );
    }

    return params.targetIds;
  }

  private buildFilters(
    data: Pick<
      CreateNotificationRuleDto | UpdateNotificationRuleDto,
      "npcId" | "npcIds" | "itemId" | "itemIds"
    >,
  ): Prisma.InputJsonObject {
    const filters: Record<string, Prisma.InputJsonValue> = {};

    if (data.npcId !== undefined) {
      filters.npcId = data.npcId;
    }

    if (data.npcIds !== undefined) {
      filters.npcIds = data.npcIds;
    }

    if (data.itemId !== undefined) {
      filters.itemId = data.itemId;
    }

    if (data.itemIds !== undefined) {
      filters.itemIds = data.itemIds;
    }

    return filters as Prisma.InputJsonObject;
  }

  private validateRuleNpcSelection(
    data: Pick<
      CreateNotificationRuleDto | UpdateNotificationRuleDto,
      "npcId" | "npcIds"
    >,
  ) {
    const uniqueNpcIds = new Set<number>();

    if (typeof data.npcId === "number") {
      uniqueNpcIds.add(data.npcId);
    }

    if (Array.isArray(data.npcIds)) {
      for (const npcId of data.npcIds) {
        uniqueNpcIds.add(npcId);
      }
    }

    if (uniqueNpcIds.size > GUILD_NOTIFICATION_MAX_NPCS_PER_RULE) {
      throw new BadRequestException(
        `Notification rule can target up to ${GUILD_NOTIFICATION_MAX_NPCS_PER_RULE} NPCs`,
      );
    }
  }

  private matchesTimerRule(filtersValue: Prisma.JsonValue, npcId: number) {
    const filters = this.parseFilters(filtersValue);

    if (filters.npcId && filters.npcId !== npcId) {
      return false;
    }

    if (filters.npcIds?.length && !filters.npcIds.includes(npcId)) {
      return false;
    }

    return true;
  }

  private matchesLootRule(
    filtersValue: Prisma.JsonValue,
    event: LootCreatedEvent,
  ) {
    const filters = this.parseFilters(filtersValue);

    if (filters.itemId && !event.itemIds.includes(filters.itemId)) {
      return false;
    }

    if (
      filters.itemIds?.length &&
      !filters.itemIds.some((itemId) => event.itemIds.includes(itemId))
    ) {
      return false;
    }

    if (filters.world && filters.world !== event.world) {
      return false;
    }

    if (
      filters.guildId &&
      !event.guildIds.some((guildId) => guildId === filters.guildId)
    ) {
      return false;
    }

    return true;
  }

  private parseFilters(filtersValue: Prisma.JsonValue): NotificationFilters {
    if (
      !filtersValue ||
      typeof filtersValue !== "object" ||
      Array.isArray(filtersValue)
    ) {
      return {};
    }

    return filtersValue as unknown as NotificationFilters;
  }

  private getTimerSourceEntityId(
    event: Pick<
      TimerUpdatedEvent | TimerDeletedEvent,
      "guildId" | "world" | "timerKey"
    >,
  ) {
    return `${event.guildId}:${event.world}:${event.timerKey}`;
  }

  private async ensureGuildRuleLimitNotExceeded(guildId: string) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      select: { notificationRuleLimit: true },
    });

    if (!guild) {
      throw new NotFoundException("Guild not found");
    }

    const currentRuleCount = await this.prisma.notificationRule.count({
      where: {
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
      },
    });

    if (currentRuleCount >= guild.notificationRuleLimit) {
      throw new ConflictException({
        message: "Notification rule limit reached for this guild",
        ruleLimit: guild.notificationRuleLimit,
        ruleCount: currentRuleCount,
      });
    }
  }

  private resolveScheduleConfig(params: {
    triggerType: DbNotificationTriggerType;
    data: Pick<
      CreateNotificationRuleDto | UpdateNotificationRuleDto,
      "scheduleStrategy" | "scheduleAnchor" | "scheduleOffsetMinutes"
    >;
    existingRule?: {
      scheduleStrategy: DbNotificationScheduleStrategy | null;
      scheduleAnchor: DbNotificationScheduleAnchor | null;
      scheduleOffsetMinutes: number | null;
    };
  }) {
    if (params.triggerType === DbNotificationTriggerType.SCHEDULED_MESSAGE) {
      return {
        scheduleStrategy: DbNotificationScheduleStrategy.FIXED_DATETIME,
        scheduleAnchor: null,
        scheduleOffsetMinutes: null,
      };
    }

    if (params.triggerType !== DbNotificationTriggerType.TIMER_BEFORE_SPAWN) {
      return {
        scheduleStrategy: null,
        scheduleAnchor: null,
        scheduleOffsetMinutes: null,
      };
    }

    const scheduleStrategy =
      (params.data.scheduleStrategy as
        | DbNotificationScheduleStrategy
        | undefined) ??
      params.existingRule?.scheduleStrategy ??
      null;
    const scheduleAnchor =
      (params.data.scheduleAnchor as
        | DbNotificationScheduleAnchor
        | undefined) ??
      params.existingRule?.scheduleAnchor ??
      null;
    const scheduleOffsetMinutes =
      params.data.scheduleOffsetMinutes ??
      params.existingRule?.scheduleOffsetMinutes ??
      null;

    if (
      scheduleStrategy !== DbNotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE
    ) {
      throw new BadRequestException(
        "Timer notifications require SPAWN_WINDOW_RELATIVE schedule strategy",
      );
    }

    if (
      scheduleAnchor !== DbNotificationScheduleAnchor.MIN_SPAWN &&
      scheduleAnchor !== DbNotificationScheduleAnchor.MAX_SPAWN
    ) {
      throw new BadRequestException(
        "Timer notifications require a valid schedule anchor",
      );
    }

    if (scheduleOffsetMinutes === null || scheduleOffsetMinutes < 0) {
      throw new BadRequestException(
        "Timer notifications require a non-negative schedule offset",
      );
    }

    return {
      scheduleStrategy,
      scheduleAnchor,
      scheduleOffsetMinutes,
    };
  }

  private calculateTimerNotificationSchedule(params: {
    minSpawnTime: string | Date;
    maxSpawnTime: string | Date;
    scheduleAnchor: DbNotificationScheduleAnchor;
    scheduleOffsetMinutes: number;
  }) {
    const anchorTime =
      params.scheduleAnchor === DbNotificationScheduleAnchor.MAX_SPAWN
        ? new Date(params.maxSpawnTime)
        : new Date(params.minSpawnTime);

    return new Date(
      anchorTime.getTime() - params.scheduleOffsetMinutes * 60_000,
    );
  }

  private buildTimerNotificationMessage(params: {
    npcName: string | null;
    npcId: number;
    world: string;
    scheduleAnchor: DbNotificationScheduleAnchor;
    scheduleOffsetMinutes: number;
  }) {
    const npcLabel = params.npcName ?? `NPC #${params.npcId}`;

    if (params.scheduleAnchor === DbNotificationScheduleAnchor.MAX_SPAWN) {
      if (params.scheduleOffsetMinutes === 0) {
        return `${npcLabel} osiąga maksymalny czas spawnu na świecie ${params.world}.`;
      }

      return `${npcLabel} osiągnie maksymalny czas spawnu na świecie ${params.world} za ${params.scheduleOffsetMinutes} min.`;
    }

    if (params.scheduleOffsetMinutes === 0) {
      return `${npcLabel} osiąga minimalny czas spawnu na świecie ${params.world}.`;
    }

    return `${npcLabel} osiągnie minimalny czas spawnu na świecie ${params.world} za ${params.scheduleOffsetMinutes} min.`;
  }

  private buildRuleTestNotificationMessage(params: {
    ruleName: string | null;
    triggerType: DbNotificationTriggerType;
    world: string | null;
  }) {
    const ruleLabel = params.ruleName?.trim().length
      ? params.ruleName.trim()
      : params.triggerType === DbNotificationTriggerType.TIMER_BEFORE_SPAWN
        ? "Przypomnienie przed spawnem"
        : params.triggerType === DbNotificationTriggerType.SCHEDULED_MESSAGE
          ? "Zaplanowana wiadomosc"
          : "Powiadomienie";

    if (params.world) {
      return `To jest test reguły "${ruleLabel}" dla świata ${params.world}.`;
    }

    return `To jest test reguły "${ruleLabel}".`;
  }

  private normalizeContentTemplate(contentTemplate?: string | null) {
    if (typeof contentTemplate !== "string") {
      return null;
    }

    const trimmedContentTemplate = contentTemplate.trim();

    return trimmedContentTemplate.length > 0 ? trimmedContentTemplate : null;
  }

  private buildTimerNotificationPayload(params: {
    notificationRule: {
      id: number;
      name: string | null;
      triggerType: DbNotificationTriggerType;
      scheduleStrategy: DbNotificationScheduleStrategy | null;
      scheduleAnchor: DbNotificationScheduleAnchor | null;
      scheduleOffsetMinutes: number | null;
      contentTemplate?: string | null;
    };
    target: {
      targetType: DbNotificationTargetType;
    };
    npcId: number;
    npcName: string | null;
    world: string;
    timerKey: string;
    minSpawnTime: Date;
    maxSpawnTime: Date;
    scheduledFor: Date;
  }) {
    const message = this.buildTimerNotificationMessage({
      npcName: params.npcName,
      npcId: params.npcId,
      world: params.world,
      scheduleAnchor:
        params.notificationRule.scheduleAnchor ??
        DbNotificationScheduleAnchor.MIN_SPAWN,
      scheduleOffsetMinutes: params.notificationRule.scheduleOffsetMinutes ?? 0,
    });
    const content = this.renderTimerNotificationContent({
      template:
        params.notificationRule.contentTemplate ??
        DEFAULT_TIMER_NOTIFICATION_TEMPLATE,
      notificationRuleName: params.notificationRule.name,
      npcId: params.npcId,
      npcName: params.npcName,
      world: params.world,
      minSpawnTime: params.minSpawnTime,
      maxSpawnTime: params.maxSpawnTime,
      scheduledFor: params.scheduledFor,
    });

    return {
      title: "Nadchodzacy spawn",
      message,
      content,
      allowedMentions: this.buildAllowedMentionsForTarget(
        content,
        params.target.targetType,
      ),
      ruleId: params.notificationRule.id,
      ruleName: params.notificationRule.name,
      triggerType: params.notificationRule.triggerType,
      world: params.world,
      npcId: params.npcId,
      npcName: params.npcName,
      timerKey: params.timerKey,
      minSpawnTime: params.minSpawnTime.toISOString(),
      maxSpawnTime: params.maxSpawnTime.toISOString(),
      scheduledFor: params.scheduledFor.toISOString(),
      scheduleStrategy: params.notificationRule.scheduleStrategy,
      scheduleAnchor: params.notificationRule.scheduleAnchor,
      scheduleOffsetMinutes: params.notificationRule.scheduleOffsetMinutes,
      contentTemplate:
        params.notificationRule.contentTemplate ??
        DEFAULT_TIMER_NOTIFICATION_TEMPLATE,
    } satisfies Prisma.InputJsonObject;
  }

  private renderTimerNotificationContent(params: {
    template: string;
    notificationRuleName: string | null;
    npcId: number;
    npcName: string | null;
    world: string;
    minSpawnTime: Date;
    maxSpawnTime: Date;
    scheduledFor: Date;
  }) {
    const placeholderValues = {
      ruleName: params.notificationRuleName?.trim().length
        ? params.notificationRuleName.trim()
        : "Powiadomienie o spawnie",
      npcName: params.npcName ?? `NPC #${params.npcId}`,
      npcId: String(params.npcId),
      world: params.world,
      minSpawnTime: this.formatNotificationDate(params.minSpawnTime),
      maxSpawnTime: this.formatNotificationDate(params.maxSpawnTime),
      scheduledFor: this.formatNotificationDate(params.scheduledFor),
    } satisfies Record<string, string>;

    return params.template.replaceAll(
      /\{\{(ruleName|npcName|npcId|world|minSpawnTime|maxSpawnTime|scheduledFor)\}\}/g,
      (_match, placeholder) => placeholderValues[placeholder] ?? "",
    );
  }

  private buildAllowedMentionsForTarget(
    content: string,
    targetType: DbNotificationTargetType,
  ) {
    if (targetType === DbNotificationTargetType.DM) {
      return undefined;
    }

    const roleIds = Array.from(
      new Set(
        Array.from(content.matchAll(/<@&(\d+)>/g))
          .map((match) => match[1])
          .filter((roleId): roleId is string => typeof roleId === "string"),
      ),
    );
    const parse: Array<"everyone"> = [];

    if (content.includes("@everyone") || content.includes("@here")) {
      parse.push("everyone");
    }

    if (roleIds.length === 0 && parse.length === 0) {
      return undefined;
    }

    return {
      ...(parse.length > 0 ? { parse } : {}),
      ...(roleIds.length > 0 ? { roles: roleIds } : {}),
      repliedUser: false,
    } satisfies Prisma.InputJsonObject;
  }

  private parseAllowedMentions(value: Prisma.JsonValue | undefined) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    const parse = Array.isArray(value.parse)
      ? value.parse.filter(
          (entry): entry is "roles" | "users" | "everyone" =>
            entry === "roles" || entry === "users" || entry === "everyone",
        )
      : undefined;
    const roles = Array.isArray(value.roles)
      ? value.roles.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : undefined;
    const users = Array.isArray(value.users)
      ? value.users.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : undefined;
    const repliedUser =
      typeof value.repliedUser === "boolean" ? value.repliedUser : undefined;

    if (
      (parse?.length ?? 0) === 0 &&
      (roles?.length ?? 0) === 0 &&
      (users?.length ?? 0) === 0 &&
      repliedUser === undefined
    ) {
      return undefined;
    }

    return {
      ...(parse && parse.length > 0 ? { parse } : {}),
      ...(roles && roles.length > 0 ? { roles } : {}),
      ...(users && users.length > 0 ? { users } : {}),
      ...(repliedUser !== undefined ? { repliedUser } : {}),
    };
  }

  private formatNotificationDate(date: Date, timeZone?: string) {
    return new Intl.DateTimeFormat("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...(timeZone ? { timeZone } : {}),
    }).format(date);
  }

  private async buildTestNotificationPayload(params: {
    notificationRule: {
      id: number;
      ownerType: DbNotificationOwnerType;
      ownerId: string;
      guildId: string | null;
      name: string | null;
      world: string | null;
      triggerType: DbNotificationTriggerType;
      filters: Prisma.JsonValue;
      scheduleStrategy: DbNotificationScheduleStrategy | null;
      scheduleAnchor: DbNotificationScheduleAnchor | null;
      scheduleOffsetMinutes: number | null;
      contentTemplate: string | null;
    };
    scheduledFor: Date;
    targetType: DbNotificationTargetType;
  }) {
    if (
      params.notificationRule.triggerType ===
      DbNotificationTriggerType.TIMER_BEFORE_SPAWN
    ) {
      const timerContext = await this.getTimerTestContext(
        params.notificationRule,
        params.scheduledFor,
      );

      return this.buildTimerNotificationPayload({
        notificationRule: params.notificationRule,
        target: { targetType: params.targetType },
        npcId: timerContext.npcId,
        npcName: timerContext.npcName,
        world: timerContext.world,
        timerKey: timerContext.timerKey,
        minSpawnTime: timerContext.minSpawnTime,
        maxSpawnTime: timerContext.maxSpawnTime,
        scheduledFor: params.scheduledFor,
      });
    }

    return {
      title: "Powiadomienie",
      message: this.buildRuleTestNotificationMessage({
        ruleName: params.notificationRule.name,
        triggerType: params.notificationRule.triggerType,
        world: params.notificationRule.world,
      }),
      content: this.buildRuleTestNotificationMessage({
        ruleName: params.notificationRule.name,
        triggerType: params.notificationRule.triggerType,
        world: params.notificationRule.world,
      }),
      ruleId: params.notificationRule.id,
      ruleName: params.notificationRule.name,
      triggerType: params.notificationRule.triggerType,
      world: params.notificationRule.world,
    } satisfies Prisma.InputJsonObject;
  }

  private async getTimerTestContext(
    notificationRule: {
      guildId: string | null;
      world: string | null;
      filters: Prisma.JsonValue;
      scheduleAnchor: DbNotificationScheduleAnchor | null;
      scheduleOffsetMinutes: number | null;
    },
    scheduledFor: Date,
  ) {
    if (notificationRule.guildId) {
      const timers = await this.prisma.timer.findMany({
        where: {
          guildId: notificationRule.guildId,
          ...(notificationRule.world ? { world: notificationRule.world } : {}),
        },
        select: {
          npcId: true,
          world: true,
          timerKey: true,
          minSpawnTime: true,
          maxSpawnTime: true,
          npc: true,
        },
        orderBy: [{ minSpawnTime: "asc" }],
        take: 50,
      });

      const matchingTimer = timers.find((timer) =>
        this.matchesTimerRule(notificationRule.filters, timer.npcId),
      );

      if (matchingTimer) {
        return {
          npcId: matchingTimer.npcId,
          npcName:
            matchingTimer.npc &&
            typeof matchingTimer.npc === "object" &&
            !Array.isArray(matchingTimer.npc) &&
            typeof matchingTimer.npc.name === "string"
              ? matchingTimer.npc.name
              : null,
          world: matchingTimer.world,
          timerKey: matchingTimer.timerKey,
          minSpawnTime: matchingTimer.minSpawnTime,
          maxSpawnTime: matchingTimer.maxSpawnTime,
        };
      }
    }

    const filters = this.parseFilters(notificationRule.filters);
    const fallbackNpcId = filters.npcId ?? filters.npcIds?.[0] ?? 0;
    const anchor = notificationRule.scheduleAnchor;
    const offsetMinutes = notificationRule.scheduleOffsetMinutes ?? 0;
    const minSpawnTime =
      anchor === DbNotificationScheduleAnchor.MAX_SPAWN
        ? new Date(
            scheduledFor.getTime() + Math.max(0, offsetMinutes - 20) * 60_000,
          )
        : new Date(scheduledFor.getTime() + offsetMinutes * 60_000);
    const maxSpawnTime =
      anchor === DbNotificationScheduleAnchor.MAX_SPAWN
        ? new Date(scheduledFor.getTime() + offsetMinutes * 60_000)
        : new Date(minSpawnTime.getTime() + 20 * 60_000);

    return {
      npcId: fallbackNpcId,
      npcName: fallbackNpcId > 0 ? null : "Wybrany NPC",
      world: notificationRule.world ?? "Wybrany swiat",
      timerKey: `test-${randomUUID()}`,
      minSpawnTime,
      maxSpawnTime,
    };
  }

  private async ensureGuildTarget(guildId: string, targetId: number) {
    const target = await this.prisma.notificationTarget.findFirst({
      where: {
        id: targetId,
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
      },
    });

    if (!target) {
      throw new NotFoundException("Notification target not found");
    }

    return target;
  }

  private async ensureUserTarget(userId: string, targetId: number) {
    const target = await this.prisma.notificationTarget.findFirst({
      where: {
        id: targetId,
        ownerType: DbNotificationOwnerType.USER,
        ownerId: userId,
      },
    });

    if (!target) {
      throw new NotFoundException("Notification target not found");
    }

    return target;
  }

  private async ensureRule(params: {
    ownerType: DbNotificationOwnerType;
    ownerId: string;
    ruleId: number;
  }) {
    const notificationRule = await this.prisma.notificationRule.findFirst({
      where: {
        id: params.ruleId,
        ownerType: params.ownerType,
        ownerId: params.ownerId,
      },
    });

    if (!notificationRule) {
      throw new NotFoundException("Notification rule not found");
    }

    return notificationRule;
  }

  private async ensureGuildJob(guildId: string, jobId: string) {
    const notificationJob = await this.prisma.notificationJob.findFirst({
      where: {
        id: jobId,
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
      },
    });

    if (!notificationJob) {
      throw new NotFoundException("Notification job not found");
    }

    if (
      notificationJob.status !== DbNotificationJobStatus.PENDING &&
      notificationJob.status !== DbNotificationJobStatus.BLOCKED &&
      notificationJob.status !== DbNotificationJobStatus.PROCESSING
    ) {
      throw new BadRequestException(
        "Only pending notification jobs can be canceled",
      );
    }

    return notificationJob;
  }

  private async attachUserTargetToWatchedItemRules(
    userId: string,
    targetId: number,
  ) {
    const watchedRules = await this.prisma.watchedItem.findMany({
      where: {
        userId,
        notificationRuleId: {
          not: null,
        },
      },
      select: {
        notificationRuleId: true,
      },
    });

    if (watchedRules.length === 0) {
      return;
    }

    await this.prisma.notificationRuleTarget.createMany({
      data: watchedRules
        .map((watchedItem) => watchedItem.notificationRuleId)
        .filter((ruleId): ruleId is number => ruleId !== null)
        .map((ruleId) => ({ ruleId, targetId })),
      skipDuplicates: true,
    });
  }

  private async getActiveUserTargetIds(userId: string) {
    const targets = await this.prisma.notificationTarget.findMany({
      where: {
        ownerType: DbNotificationOwnerType.USER,
        ownerId: userId,
        active: true,
        canSend: true,
      },
      select: { id: true },
    });

    return targets.map((target) => target.id);
  }

  private async getGuildRuleTestTriggerUsage(ruleIds: number[]) {
    const usageByRuleId = new Map<
      number,
      {
        limit: number;
        used: number;
        remaining: number;
        windowSeconds: number;
        nextAvailableAt: string | null;
      }
    >();

    if (ruleIds.length === 0) {
      return usageByRuleId;
    }

    const threshold = new Date(
      Date.now() - GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS,
    );
    const testJobs = await this.prisma.notificationJob.findMany({
      where: {
        ruleId: { in: ruleIds },
        jobKind: DbNotificationJobKind.TEST,
        createdAt: { gte: threshold },
      },
      select: {
        ruleId: true,
        createdAt: true,
        sourceEventId: true,
      },
      orderBy: [{ createdAt: "asc" }],
    });

    const jobsByRuleId = new Map<number, Date[]>();
    const seenEventKeysByRuleId = new Map<number, Set<string>>();

    for (const job of testJobs) {
      const eventKey =
        job.sourceEventId ?? `legacy:${job.createdAt.toISOString()}`;
      const seenEventKeys = seenEventKeysByRuleId.get(job.ruleId) ?? new Set();

      if (seenEventKeys.has(eventKey)) {
        continue;
      }

      seenEventKeys.add(eventKey);
      seenEventKeysByRuleId.set(job.ruleId, seenEventKeys);

      const currentJobs = jobsByRuleId.get(job.ruleId) ?? [];
      currentJobs.push(job.createdAt);
      jobsByRuleId.set(job.ruleId, currentJobs);
    }

    for (const ruleId of ruleIds) {
      const usage = jobsByRuleId.get(ruleId) ?? [];
      const nextAvailableAt =
        usage.length >= GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT
          ? new Date(
              usage[0]!.getTime() + GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS,
            ).toISOString()
          : null;

      usageByRuleId.set(ruleId, {
        limit: GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT,
        used: usage.length,
        remaining: Math.max(
          0,
          GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT - usage.length,
        ),
        windowSeconds: Math.floor(
          GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS / 1000,
        ),
        nextAvailableAt,
      });
    }

    return usageByRuleId;
  }

  private async getRuleTestTriggerUsage(ruleId: number) {
    const usageByRuleId = await this.getGuildRuleTestTriggerUsage([ruleId]);

    return (
      usageByRuleId.get(ruleId) ?? {
        limit: GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT,
        used: 0,
        remaining: GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT,
        windowSeconds: Math.floor(
          GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS / 1000,
        ),
        nextAvailableAt: null,
      }
    );
  }
}
