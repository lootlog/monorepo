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

    return this.prisma.notificationTarget.update({
      where: { id: targetId },
      data: {
        ...(hasDisplayName ? { displayName: data.displayName ?? null } : {}),
        active: data.active,
      },
    });
  }

  async deleteGuildTarget(guildId: string, targetId: number) {
    await this.ensureGuildTarget(guildId, targetId);
    await this.cancelPendingJobs({ targetId });
    await this.prisma.notificationTarget.delete({ where: { id: targetId } });
    return { success: true };
  }

  async listGuildRules(guildId: string) {
    return this.prisma.notificationRule.findMany({
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
    });
  }

  async createGuildRule(guildId: string, data: CreateNotificationRuleDto) {
    await this.ensureGuildNotificationPermissions(guildId);

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
        world: data.world ?? null,
        name: data.name ?? null,
        filters: this.buildFilters(data),
        leadTimeMinutes: data.leadTimeMinutes ?? null,
        enabled: data.enabled ?? true,
        dedupeWindowSeconds: data.dedupeWindowSeconds ?? 0,
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
    const existingRule = await this.ensureRule({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
      ruleId,
    });

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
          triggerType:
            (data.triggerType as DbNotificationTriggerType | undefined) ??
            existingRule.triggerType,
          world: hasWorld ? (data.world ?? null) : existingRule.world,
          name: hasName ? (data.name ?? null) : existingRule.name,
          filters:
            data.npcId !== undefined ||
            data.npcIds !== undefined ||
            data.itemId !== undefined ||
            data.itemIds !== undefined
              ? this.buildFilters(data)
              : existingRule.filters,
          leadTimeMinutes:
            data.leadTimeMinutes !== undefined
              ? data.leadTimeMinutes
              : existingRule.leadTimeMinutes,
          enabled: data.enabled ?? existingRule.enabled,
          dedupeWindowSeconds:
            data.dedupeWindowSeconds ?? existingRule.dedupeWindowSeconds,
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

  async listGuildJobs(guildId: string) {
    return this.getJobsForOwner({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
    });
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

    const target = await this.prisma.notificationTarget.upsert({
      where: {
        ownerType_ownerId_provider_targetType_externalId: {
          ownerType: DbNotificationOwnerType.USER,
          ownerId: userId,
          provider: DbNotificationProvider.DISCORD,
          targetType: DbNotificationTargetType.DM,
          externalId: data.externalId ?? discordId,
        },
      },
      create: {
        ownerType: DbNotificationOwnerType.USER,
        ownerId: userId,
        provider: DbNotificationProvider.DISCORD,
        targetType: DbNotificationTargetType.DM,
        externalId: data.externalId ?? discordId,
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
        world: data.world ?? null,
        name: data.name ?? null,
        filters: this.buildFilters(data),
        leadTimeMinutes: data.leadTimeMinutes ?? null,
        enabled: data.enabled ?? true,
        dedupeWindowSeconds: data.dedupeWindowSeconds ?? 0,
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
    const existingRule = await this.ensureRule({
      ownerType: DbNotificationOwnerType.USER,
      ownerId: userId,
      ruleId,
    });

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
          triggerType:
            (data.triggerType as DbNotificationTriggerType | undefined) ??
            existingRule.triggerType,
          world: hasWorld ? (data.world ?? null) : existingRule.world,
          name: hasName ? (data.name ?? null) : existingRule.name,
          filters:
            data.npcId !== undefined ||
            data.npcIds !== undefined ||
            data.itemId !== undefined ||
            data.itemIds !== undefined
              ? this.buildFilters(data)
              : existingRule.filters,
          leadTimeMinutes:
            data.leadTimeMinutes !== undefined
              ? data.leadTimeMinutes
              : existingRule.leadTimeMinutes,
          enabled: data.enabled ?? existingRule.enabled,
          dedupeWindowSeconds:
            data.dedupeWindowSeconds ?? existingRule.dedupeWindowSeconds,
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
    const notificationRules = await this.prisma.notificationRule.findMany({
      where: {
        ownerType: DbNotificationOwnerType.USER,
        enabled: true,
        triggerType: DbNotificationTriggerType.WATCHED_ITEM_DROPPED,
        targets: {
          some: {},
        },
      },
      include: {
        targets: {
          include: {
            target: true,
          },
        },
      },
    });

    for (const notificationRule of notificationRules) {
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
        title:
          typeof payload?.title === "string" ? payload.title : "Powiadomienie",
        message:
          typeof payload?.message === "string"
            ? payload.message
            : "Masz nowe powiadomienie",
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
      notificationRule.triggerType !==
        DbNotificationTriggerType.TIMER_BEFORE_SPAWN ||
      !notificationRule.enabled ||
      !notificationRule.guildId ||
      !notificationRule.leadTimeMinutes
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
      !notificationRule.leadTimeMinutes
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

      const scheduledFor = new Date(
        new Date(event.minSpawnTime).getTime() -
          notificationRule.leadTimeMinutes * 60_000,
      );

      const effectiveScheduledFor =
        scheduledFor.getTime() < Date.now() ? new Date() : scheduledFor;

      const notificationJob = await this.createNotificationJob({
        notificationRule,
        target: relation.target,
        jobKind: DbNotificationJobKind.SCHEDULED,
        scheduledFor: effectiveScheduledFor,
        sourceEntityType: "timer",
        sourceEntityId,
        payloadSnapshot: {
          title: "Nadchodzący spawn",
          message: `${event.npc?.name ?? `NPC #${event.npcId}`} zrespi się na świecie ${event.world} za ${notificationRule.leadTimeMinutes} min.`,
          world: event.world,
          npcId: event.npcId,
          npcName: event.npc?.name ?? null,
          timerKey: event.timerKey,
          minSpawnTime: new Date(event.minSpawnTime).toISOString(),
          maxSpawnTime: new Date(event.maxSpawnTime).toISOString(),
          leadTimeMinutes: notificationRule.leadTimeMinutes,
        },
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
            "instant",
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
        return null;
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
    ruleId?: number;
    targetId?: number;
    sourceEntityType?: string;
    sourceEntityId?: string;
  }) {
    const jobs = await this.prisma.notificationJob.findMany({
      where: {
        ...filters,
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
}
