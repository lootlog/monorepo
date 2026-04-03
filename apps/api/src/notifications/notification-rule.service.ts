import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationJobKind as DbNotificationJobKind,
  NotificationOwnerType as DbNotificationOwnerType,
  NotificationScheduleAnchor as DbNotificationScheduleAnchor,
  NotificationScheduleIntervalType as DbNotificationScheduleIntervalType,
  NotificationScheduleStrategy as DbNotificationScheduleStrategy,
  NotificationTriggerType as DbNotificationTriggerType,
  Prisma,
} from "prisma/generated/client";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { GUILD_NOTIFICATION_TIMEZONE } from "src/notifications/constants/notification-schedule-timezone.constant";
import { NotificationContentService } from "src/notifications/notification-content.service";
import { NotificationJobService } from "src/notifications/notification-job.service";
import { NotificationMatchingService } from "src/notifications/notification-matching.service";
import { NotificationTargetService } from "src/notifications/notification-target.service";
import { Error } from "src/notifications/enum/error.enum";
import type { CreateNotificationRuleDto } from "src/notifications/dto/create-notification-rule.dto";
import type { CreateWatchedItemQuickAddDto } from "src/notifications/dto/create-watched-item-quick-add.dto";
import type { CreateWatchedItemDto } from "src/notifications/dto/create-watched-item.dto";
import type { UpdateNotificationRuleDto } from "src/notifications/dto/update-notification-rule.dto";
import {
  calculateFirstOccurrenceInTimeZone,
  isValidTimeZone,
} from "src/notifications/utils/notification-schedule-time.util";

const GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT = 10;
const GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS = 15 * 60_000;
const GUILD_NOTIFICATION_MAX_NPCS_PER_RULE = 5;
const USER_NOTIFICATION_RULE_LIMIT = 50;
const USER_WATCHED_ITEM_LIMIT = 20;

@Injectable()
export class NotificationRuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly targetService: NotificationTargetService,
    private readonly jobService: NotificationJobService,
    private readonly contentService: NotificationContentService,
    private readonly matchingService: NotificationMatchingService,
  ) {}

  // ── Guild Rules ──────────────────────────────────────────────────────

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

    const targetIds = await this.targetService.validateTargetIds({
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

    await this.jobService.rebuildJobsForRule(notificationRule.id);

    return this.jobService.getRuleById(notificationRule.id);
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
      ? await this.targetService.validateTargetIds({
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

    await this.jobService.rebuildJobsForRule(ruleId);

    return this.jobService.getRuleById(ruleId);
  }

  async deleteGuildRule(guildId: string, ruleId: number) {
    await this.ensureRule({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
      ruleId,
    });
    await this.jobService.cancelPendingJobs({ ruleId });
    await this.prisma.notificationRule.delete({ where: { id: ruleId } });
    return { success: true };
  }

  async rebuildGuildRuleJobs(guildId: string, ruleId: number) {
    await this.ensureRule({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
      ruleId,
    });

    await this.jobService.rebuildJobsForRule(ruleId);

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
      throw new NotFoundException(Error.NOTIFICATION_RULE_NOT_FOUND);
    }

    if (!notificationRule.enabled) {
      throw new ConflictException(
        Error.ONLY_ENABLED_RULES_CAN_BE_TEST_TRIGGERED,
      );
    }

    const activeTargets = notificationRule.targets
      .map((relation) => relation.target)
      .filter((target) => target.active && target.canSend);

    if (activeTargets.length === 0) {
      throw new ConflictException(
        Error.NOTIFICATION_RULE_REQUIRES_ACTIVE_SENDABLE_TARGET,
      );
    }

    const testTriggerUsage = await this.getRuleTestTriggerUsage(
      notificationRule.id,
    );

    if (testTriggerUsage.remaining <= 0) {
      throw new ConflictException({
        message: Error.TEST_TRIGGER_LIMIT_REACHED_FOR_RULE,
        limit: testTriggerUsage.limit,
        windowSeconds: testTriggerUsage.windowSeconds,
        nextAvailableAt: testTriggerUsage.nextAvailableAt,
      });
    }

    const now = new Date();
    const testEventId = `test:${notificationRule.id}:${randomUUID()}`;
    let createdJobsCount = 0;

    for (const target of activeTargets) {
      const testPayload =
        await this.contentService.buildTestNotificationPayload({
          notificationRule,
          scheduledFor: now,
          targetType: target.targetType,
        });
      const notificationJob = await this.jobService.createNotificationJob({
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
      await this.jobService.enqueueNotificationJob(notificationJob.id, 0);
    }

    if (createdJobsCount === 0) {
      throw new ConflictException(Error.NO_TEST_JOBS_CREATED_FOR_RULE);
    }

    return { success: true };
  }

  // ── User Rules ───────────────────────────────────────────────────────

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
    await this.ensureUserRuleLimitNotExceeded(userId);

    const isScheduledMessage =
      (data.triggerType as DbNotificationTriggerType) ===
      DbNotificationTriggerType.SCHEDULED_MESSAGE;

    if (!isScheduledMessage) {
      this.validateRuleNpcSelection(data);
    }

    const targetIds = await this.targetService.validateTargetIds({
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

    return this.jobService.getRuleById(notificationRule.id);
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
      ? await this.targetService.validateTargetIds({
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

    return this.jobService.getRuleById(ruleId);
  }

  async deleteUserRule(userId: string, ruleId: number) {
    await this.ensureRule({
      ownerType: DbNotificationOwnerType.USER,
      ownerId: userId,
      ruleId,
    });
    await this.jobService.cancelPendingJobs({ ruleId });
    await this.prisma.notificationRule.delete({ where: { id: ruleId } });
    return { success: true };
  }

  // ── Watched Items ────────────────────────────────────────────────────

  async listWatchedItems(userId: string) {
    const watchedItems = await this.prisma.watchedItem.findMany({
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

    const itemIds = [...new Set(watchedItems.map((item) => item.itemId))];

    const snapshots = await this.prisma.itemSnapshot.findMany({
      where: { itemId: { in: itemIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["itemId"],
      select: {
        itemId: true,
        name: true,
        icon: true,
        rarity: true,
        lvl: true,
        itemType: true,
        statRaw: true,
      },
    });

    const snapshotByItemId = new Map(snapshots.map((s) => [s.itemId, s]));

    return watchedItems.map((item) => {
      const snapshot = snapshotByItemId.get(item.itemId);

      return {
        ...item,
        itemSnapshot: snapshot
          ? {
              rarity: snapshot.rarity,
              lvl: snapshot.lvl,
              type: snapshot.itemType,
              stat: snapshot.statRaw,
            }
          : null,
      };
    });
  }

  async createWatchedItem(
    userId: string,
    discordId: string,
    data: CreateWatchedItemDto,
  ) {
    const normalizedGuildIds = await this.validateWatchedItemGuildIds({
      userId,
      discordId,
      guildIds: data.guildIds,
    });
    const existingWatchedItem = await this.prisma.watchedItem.findUnique({
      where: {
        userId_itemId_world: {
          userId,
          itemId: data.itemId,
          world: data.world,
        },
      },
      include: {
        notificationRule: true,
      },
    });

    const targetIds = await this.targetService.getActiveUserTargetIds(userId);
    if (targetIds.length === 0) {
      throw new ConflictException(Error.ACTIVE_DISCORD_DM_TARGET_REQUIRED);
    }

    if (existingWatchedItem?.notificationRuleId) {
      await this.prisma.$transaction(async (tx) => {
        await tx.watchedItem.update({
          where: { id: existingWatchedItem.id },
          data: {
            enabled: true,
            itemName: data.itemName,
            itemIcon: data.itemIcon,
          },
        });
        await tx.notificationRule.update({
          where: { id: existingWatchedItem.notificationRuleId },
          data: {
            enabled: true,
            world: data.world,
            filters: {
              itemId: data.itemId,
              guildIds: normalizedGuildIds,
            },
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

      return this.getWatchedItemByScope({
        userId,
        itemId: data.itemId,
        world: data.world,
      });
    }

    if (!existingWatchedItem) {
      await this.ensureWatchedItemLimitNotExceeded(userId);
    }

    return this.prisma.$transaction(async (tx) => {
      const notificationRule = await tx.notificationRule.create({
        data: {
          ownerType: DbNotificationOwnerType.USER,
          ownerId: userId,
          triggerType: DbNotificationTriggerType.WATCHED_ITEM_DROPPED,
          world: data.world,
          filters: {
            itemId: data.itemId,
            guildIds: normalizedGuildIds,
          },
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
          userId_itemId_world: {
            userId,
            itemId: data.itemId,
            world: data.world,
          },
        },
        create: {
          userId,
          itemId: data.itemId,
          itemName: data.itemName,
          itemIcon: data.itemIcon,
          world: data.world,
          notificationRuleId: notificationRule.id,
        },
        update: {
          enabled: true,
          itemName: data.itemName,
          itemIcon: data.itemIcon,
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

  async quickAddWatchedItem(
    userId: string,
    discordId: string,
    data: CreateWatchedItemQuickAddDto,
  ) {
    const [guildId] = await this.validateWatchedItemGuildIds({
      userId,
      discordId,
      guildIds: [data.guildId],
    });
    const targetIds = await this.targetService.getActiveUserTargetIds(userId);

    if (targetIds.length === 0) {
      throw new ConflictException(Error.ACTIVE_DISCORD_DM_TARGET_REQUIRED);
    }

    const existingWatchedItem = await this.prisma.watchedItem.findUnique({
      where: {
        userId_itemId_world: {
          userId,
          itemId: data.itemId,
          world: data.world,
        },
      },
      include: {
        notificationRule: true,
      },
    });

    if (existingWatchedItem?.notificationRuleId) {
      const existingFilters = this.matchingService.parseFilters(
        existingWatchedItem.notificationRule?.filters ?? {},
      );
      const mergedGuildIds = [
        ...new Set([...(existingFilters.guildIds ?? []), guildId]),
      ].sort();

      await this.prisma.$transaction(async (tx) => {
        await tx.watchedItem.update({
          where: { id: existingWatchedItem.id },
          data: {
            enabled: true,
            itemName: data.itemName,
            itemIcon: data.itemIcon,
          },
        });
        await tx.notificationRule.update({
          where: { id: existingWatchedItem.notificationRuleId },
          data: {
            enabled: true,
            world: data.world,
            filters: {
              itemId: data.itemId,
              guildIds: mergedGuildIds,
            },
          },
        });
        await tx.notificationRuleTarget.createMany({
          data: targetIds.map((targetId) => ({
            ruleId: existingWatchedItem.notificationRuleId!,
            targetId,
          })),
          skipDuplicates: true,
        });
      });

      return this.getWatchedItemByScope({
        userId,
        itemId: data.itemId,
        world: data.world,
      });
    }

    if (!existingWatchedItem) {
      await this.ensureWatchedItemLimitNotExceeded(userId);
    }

    return this.prisma.$transaction(async (tx) => {
      const notificationRule = await tx.notificationRule.create({
        data: {
          ownerType: DbNotificationOwnerType.USER,
          ownerId: userId,
          triggerType: DbNotificationTriggerType.WATCHED_ITEM_DROPPED,
          world: data.world,
          filters: {
            itemId: data.itemId,
            guildIds: [guildId],
          },
          enabled: true,
          dedupeWindowSeconds: 0,
          targets: {
            createMany: {
              data: targetIds.map((targetId) => ({ targetId })),
            },
          },
        },
      });

      return tx.watchedItem.upsert({
        where: {
          userId_itemId_world: {
            userId,
            itemId: data.itemId,
            world: data.world,
          },
        },
        create: {
          userId,
          itemId: data.itemId,
          itemName: data.itemName,
          itemIcon: data.itemIcon,
          world: data.world,
          notificationRuleId: notificationRule.id,
        },
        update: {
          enabled: true,
          itemName: data.itemName,
          itemIcon: data.itemIcon,
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
      throw new NotFoundException(Error.WATCHED_ITEM_NOT_FOUND);
    }

    if (watchedItem.notificationRuleId) {
      await this.jobService.cancelPendingJobs({
        ruleId: watchedItem.notificationRuleId,
      });
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

  // ── Private helpers ──────────────────────────────────────────────────

  private async ensureGuildNotificationPermissions(guildId: string) {
    const syncState = await this.guildsService.getGuildDiscordSyncStatus(
      guildId,
      {
        refreshIfStale: true,
      },
    );

    if (!syncState.hasRequiredPermissions) {
      throw new ConflictException({
        message: Error.DISCORD_BOT_MISSING_REQUIRED_PERMISSIONS,
        missingPermissions: syncState.missingPermissions,
        syncState,
      });
    }

    return syncState;
  }

  private async ensureGuildRuleLimitNotExceeded(guildId: string) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      select: { notificationRuleLimit: true },
    });

    if (!guild) {
      throw new NotFoundException(Error.GUILD_NOT_FOUND);
    }

    const currentRuleCount = await this.prisma.notificationRule.count({
      where: {
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
      },
    });

    if (currentRuleCount >= guild.notificationRuleLimit) {
      throw new ConflictException({
        message: Error.GUILD_NOTIFICATION_RULE_LIMIT_REACHED,
        ruleLimit: guild.notificationRuleLimit,
        ruleCount: currentRuleCount,
      });
    }
  }

  private async ensureUserRuleLimitNotExceeded(userId: string) {
    const currentRuleCount = await this.prisma.notificationRule.count({
      where: {
        ownerType: DbNotificationOwnerType.USER,
        ownerId: userId,
      },
    });

    if (currentRuleCount >= USER_NOTIFICATION_RULE_LIMIT) {
      throw new ConflictException({
        message: Error.USER_NOTIFICATION_RULE_LIMIT_REACHED,
        ruleLimit: USER_NOTIFICATION_RULE_LIMIT,
        ruleCount: currentRuleCount,
      });
    }
  }

  private async ensureWatchedItemLimitNotExceeded(userId: string) {
    const currentWatchedItemCount = await this.prisma.watchedItem.count({
      where: {
        userId,
      },
    });

    if (currentWatchedItemCount >= USER_WATCHED_ITEM_LIMIT) {
      throw new ConflictException({
        message: Error.USER_WATCHED_ITEM_LIMIT_REACHED,
        watchedItemLimit: USER_WATCHED_ITEM_LIMIT,
        watchedItemCount: currentWatchedItemCount,
      });
    }
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
      throw new NotFoundException(Error.NOTIFICATION_RULE_NOT_FOUND);
    }

    return notificationRule;
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
      throw new BadRequestException({
        message: Error.NOTIFICATION_RULE_MAX_NPCS_EXCEEDED,
        maxNpcsPerRule: GUILD_NOTIFICATION_MAX_NPCS_PER_RULE,
      });
    }
  }

  private buildFilters(
    data: Pick<
      CreateNotificationRuleDto | UpdateNotificationRuleDto,
      "npcId" | "npcIds" | "itemId" | "itemIds"
    > & {
      guildIds?: string[];
    },
  ): Prisma.InputJsonObject {
    const filters: Record<string, Prisma.InputJsonValue> = {};

    if (data.guildIds !== undefined) {
      filters.guildIds = data.guildIds;
    }

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

  private normalizeContentTemplate(contentTemplate?: string | null) {
    if (typeof contentTemplate !== "string") {
      return null;
    }

    const trimmedContentTemplate = contentTemplate.trim();

    return trimmedContentTemplate.length > 0 ? trimmedContentTemplate : null;
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
        Error.TIMER_NOTIFICATION_REQUIRES_SPAWN_WINDOW_RELATIVE_STRATEGY,
      );
    }

    if (
      scheduleAnchor !== DbNotificationScheduleAnchor.MIN_SPAWN &&
      scheduleAnchor !== DbNotificationScheduleAnchor.MAX_SPAWN
    ) {
      throw new BadRequestException(
        Error.TIMER_NOTIFICATION_REQUIRES_VALID_SCHEDULE_ANCHOR,
      );
    }

    if (scheduleOffsetMinutes === null || scheduleOffsetMinutes < 0) {
      throw new BadRequestException(
        Error.TIMER_NOTIFICATION_REQUIRES_NON_NEGATIVE_SCHEDULE_OFFSET,
      );
    }

    return {
      scheduleStrategy,
      scheduleAnchor,
      scheduleOffsetMinutes,
    };
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
        Error.RECURRING_USER_SCHEDULED_MESSAGES_REQUIRE_TIMEZONE,
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
        throw new BadRequestException(
          Error.INVALID_NOTIFICATION_SCHEDULE_TIMEZONE,
        );
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

  private async validateWatchedItemGuildIds(params: {
    userId: string;
    discordId: string;
    guildIds: string[];
  }) {
    const normalizedGuildIds = [...new Set(params.guildIds)].sort();

    if (normalizedGuildIds.length === 0) {
      throw new BadRequestException(Error.AT_LEAST_ONE_GUILD_REQUIRED);
    }

    const availableGuildIds = new Set(
      (
        await this.guildsService.getUserGuilds(params.discordId, params.userId)
      ).map((guild) => guild.id),
    );
    const invalidGuildIds = normalizedGuildIds.filter(
      (guildId) => !availableGuildIds.has(guildId),
    );

    if (invalidGuildIds.length > 0) {
      throw new BadRequestException(
        Error.SELECTED_GUILDS_NOT_AVAILABLE_FOR_AUTHENTICATED_USER,
      );
    }

    return normalizedGuildIds;
  }

  private getWatchedItemByScope(params: {
    userId: string;
    itemId: number;
    world: string;
  }) {
    return this.prisma.watchedItem.findUnique({
      where: {
        userId_itemId_world: {
          userId: params.userId,
          itemId: params.itemId,
          world: params.world,
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
