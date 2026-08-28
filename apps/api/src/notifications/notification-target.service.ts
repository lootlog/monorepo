import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { DiscordGuildChannelSnapshot } from "@lootlog/types";
import {
  NotificationJobKind as DbNotificationJobKind,
  NotificationOwnerType as DbNotificationOwnerType,
  NotificationProvider as DbNotificationProvider,
  NotificationScheduleIntervalType as DbNotificationScheduleIntervalType,
  NotificationScheduleStrategy as DbNotificationScheduleStrategy,
  NotificationTargetType as DbNotificationTargetType,
  NotificationTriggerType as DbNotificationTriggerType,
  Prisma,
} from "src/db/domain";
import { ChannelsService } from "src/channels/channels.service";
import { PrismaService } from "src/db/prisma.service";
import { NotificationJobService } from "src/notifications/notification-job.service";
import type { CreateNotificationTargetDto } from "src/notifications/dto/create-notification-target.dto";
import type { UpdateNotificationTargetDto } from "src/notifications/dto/update-notification-target.dto";
import { Error } from "src/notifications/enum/error.enum";
import {
  USER_DM_TEST_MESSAGE,
  USER_DM_TEST_RULE_NAME,
} from "src/notifications/constants/user-dm.constant";
import {
  computeTestTriggerUsage,
  getDefaultTestTriggerUsage,
} from "src/notifications/utils/test-trigger-usage.util";
import { hasOwnField } from "src/shared/utils/has-own-field";

const USER_DM_TEST_TRIGGER_LIMIT = 5;
const USER_DM_TEST_TRIGGER_WINDOW_MS = 15 * 60_000;

@Injectable()
export class NotificationTargetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channelsService: ChannelsService,
    // Shallow circular dependency: this service needs jobService for
    // canceling/creating jobs, while jobService's module imports this service.
    @Inject(forwardRef(() => NotificationJobService))
    private readonly jobService: NotificationJobService,
  ) {}

  listGuildTargets(guildId: string) {
    return this.prisma.orm.public.NotificationTarget.findMany({
      where: {
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
      },
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    });
  }

  async createGuildTarget(guildId: string, data: CreateNotificationTargetDto) {
    if (data.targetType !== DbNotificationTargetType.CHANNEL) {
      throw new BadRequestException(Error.GUILD_TARGETS_MUST_BE_CHANNELS);
    }

    if (!data.externalId) {
      throw new BadRequestException(
        Error.GUILD_CHANNEL_TARGET_REQUIRES_EXTERNAL_ID,
      );
    }

    const { channels } =
      await this.channelsService.getSelectableGuildChannels(guildId);
    const selectedChannel = channels.find(
      (channel) => channel.channelId === data.externalId,
    );

    if (!selectedChannel) {
      throw new BadRequestException(
        Error.SELECTED_DISCORD_CHANNEL_NOT_AVAILABLE,
      );
    }

    return this.prisma.orm.public.NotificationTarget.upsert({
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
    await this.ensureTarget(DbNotificationOwnerType.GUILD, guildId, targetId);

    const updated = await this.prisma.orm.public.NotificationTarget.update({
      where: { id: targetId },
      data: {
        ...this.getDisplayNameUpdate(data),
        active: data.active,
      },
    });

    if (data.active === false) {
      await this.jobService.cancelPendingJobs({ targetId });
    }

    return updated;
  }

  async deleteGuildTarget(guildId: string, targetId: number) {
    await this.ensureTarget(DbNotificationOwnerType.GUILD, guildId, targetId);
    await this.deleteTargetAndOrphanedRules(targetId);
    return { success: true };
  }

  async listUserTargets(discordId: string) {
    const targets = await this.prisma.orm.public.NotificationTarget.findMany({
      where: {
        ownerType: DbNotificationOwnerType.USER,
        ownerId: discordId,
      },
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    });

    const targetIds = targets.map((t) => t.id);
    const testTriggerUsageMap =
      await this.getUserDmTestTriggerUsageForTargets(targetIds);

    return targets.map((target) => ({
      ...target,
      testTrigger: testTriggerUsageMap.get(target.id) ?? {
        limit: USER_DM_TEST_TRIGGER_LIMIT,
        used: 0,
        remaining: USER_DM_TEST_TRIGGER_LIMIT,
        windowSeconds: Math.floor(USER_DM_TEST_TRIGGER_WINDOW_MS / 1000),
        nextAvailableAt: null,
      },
    }));
  }

  async createUserTarget(discordId: string, data: CreateNotificationTargetDto) {
    if (data.targetType !== DbNotificationTargetType.DM) {
      throw new BadRequestException(Error.USER_TARGETS_MUST_BE_DISCORD_DMS);
    }

    if (data.externalId && data.externalId !== discordId) {
      throw new BadRequestException(
        Error.USER_DM_TARGET_MUST_USE_AUTHENTICATED_DISCORD_ACCOUNT,
      );
    }

    const target = await this.prisma.orm.public.NotificationTarget.upsert({
      where: {
        ownerType_ownerId_provider_targetType_externalId: {
          ownerType: DbNotificationOwnerType.USER,
          ownerId: discordId,
          provider: DbNotificationProvider.DISCORD,
          targetType: DbNotificationTargetType.DM,
          externalId: discordId,
        },
      },
      create: {
        ownerType: DbNotificationOwnerType.USER,
        ownerId: discordId,
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

    await this.attachUserTargetToWatchedItemRules(discordId, target.id);

    return target;
  }

  async updateUserTarget(
    discordId: string,
    targetId: number,
    data: UpdateNotificationTargetDto,
  ) {
    await this.ensureTarget(DbNotificationOwnerType.USER, discordId, targetId);

    return this.prisma.orm.public.NotificationTarget.update({
      where: { id: targetId },
      data: {
        ...this.getDisplayNameUpdate(data),
        active: data.active,
      },
    });
  }

  async triggerUserTargetTest(discordId: string, targetId: number) {
    const target = await this.ensureTarget(
      DbNotificationOwnerType.USER,
      discordId,
      targetId,
    );

    if (target.targetType !== DbNotificationTargetType.DM) {
      throw new BadRequestException(Error.USER_TEST_TARGET_MUST_BE_DISCORD_DM);
    }

    if (!target.active || !target.canSend) {
      throw new ConflictException(
        Error.USER_DISCORD_DM_TARGET_MUST_BE_ACTIVE_AND_CAN_SEND,
      );
    }

    const testTriggerUsage = await this.getUserDmTestTriggerUsage(targetId);

    if (testTriggerUsage.remaining <= 0) {
      throw new ConflictException({
        message: Error.USER_DM_TEST_TRIGGER_LIMIT_REACHED,
        limit: testTriggerUsage.limit,
        windowSeconds: testTriggerUsage.windowSeconds,
        nextAvailableAt: testTriggerUsage.nextAvailableAt,
      });
    }

    const testRule = await this.getOrCreateUserDmTestRule(discordId, target.id);
    const scheduledFor = new Date();
    const notificationJob = await this.jobService.createNotificationJob({
      notificationRule: {
        id: testRule.id,
        ownerType: testRule.ownerType,
        ownerId: testRule.ownerId,
        guildId: testRule.guildId,
        triggerType: testRule.triggerType,
      },
      target: {
        id: target.id,
        externalId: target.externalId,
        targetType: target.targetType,
        active: target.active,
        canSend: target.canSend,
      },
      jobKind: DbNotificationJobKind.TEST,
      scheduledFor,
      sourceEntityType: "user-dm-test",
      sourceEntityId: String(target.id),
      payloadSnapshot: {
        title: "Powiadomienie testowe",
        message: USER_DM_TEST_MESSAGE,
        content: USER_DM_TEST_MESSAGE,
        source: "user-dm-test",
        testTriggeredAt: scheduledFor.toISOString(),
      } satisfies Prisma.InputJsonObject,
    });

    if (!notificationJob) {
      throw new ConflictException(Error.NO_TEST_JOB_CREATED_FOR_TARGET);
    }

    await this.jobService.enqueueNotificationJob(notificationJob.id, 0);

    return { success: true };
  }

  async deleteUserTarget(discordId: string, targetId: number) {
    await this.ensureTarget(DbNotificationOwnerType.USER, discordId, targetId);
    await this.deleteTargetAndOrphanedRules(targetId);
    return { success: true };
  }

  async validateTargetIds(params: {
    ownerType: DbNotificationOwnerType;
    ownerId: string;
    targetIds: number[];
  }) {
    if (params.targetIds.length === 0) {
      throw new BadRequestException(Error.AT_LEAST_ONE_TARGET_REQUIRED);
    }

    const targets = await this.prisma.orm.public.NotificationTarget.findMany({
      where: {
        id: { in: params.targetIds },
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        active: true,
      },
      select: { id: true },
    });

    if (targets.length !== params.targetIds.length) {
      throw new BadRequestException(Error.INVALID_NOTIFICATION_TARGETS);
    }

    return params.targetIds;
  }

  async getActiveUserTargetIds(discordId: string) {
    const targets = await this.prisma.orm.public.NotificationTarget.findMany({
      where: {
        ownerType: DbNotificationOwnerType.USER,
        ownerId: discordId,
        active: true,
        canSend: true,
      },
      select: { id: true },
    });

    return targets.map((target) => target.id);
  }

  async handleGuildChannelDeleted(event: {
    guildId: string;
    channelId: string;
  }) {
    const targets = await this.prisma.orm.public.NotificationTarget.findMany({
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
      targets.map((target) => this.deleteTargetAndOrphanedRules(target.id)),
    );
  }

  private async ensureTarget(
    ownerType: DbNotificationOwnerType,
    ownerId: string,
    targetId: number,
  ) {
    const target = await this.prisma.orm.public.NotificationTarget.findFirst({
      where: {
        id: targetId,
        ownerType,
        ownerId,
      },
    });

    if (!target) {
      throw new NotFoundException(Error.NOTIFICATION_TARGET_NOT_FOUND);
    }

    return target;
  }

  private async deleteTargetAndOrphanedRules(targetId: number) {
    const singleTargetRuleIds =
      await this.prisma.orm.public.NotificationRuleTarget.findMany({
        where: { targetId },
        select: {
          ruleId: true,
          rule: {
            select: {
              _count: { select: { targets: true } },
            },
          },
        },
      }).then((entries) =>
        entries
          .filter((entry) => entry.rule._count.targets === 1)
          .map((entry) => entry.ruleId),
      );

    await this.jobService.cancelPendingJobs({ targetId });

    await Promise.all(
      singleTargetRuleIds.map((ruleId) =>
        this.jobService.cancelPendingJobs({ ruleId }),
      ),
    );

    await this.prisma.orm.public.NotificationTarget.delete({
      where: { id: targetId },
    });

    if (singleTargetRuleIds.length > 0) {
      await this.prisma.orm.public.NotificationRule.deleteMany({
        where: { id: { in: singleTargetRuleIds } },
      });
    }
  }

  private getDisplayNameUpdate(
    data: Pick<UpdateNotificationTargetDto, "displayName">,
  ): Pick<Prisma.NotificationTargetUpdateInput, "displayName"> {
    if (!hasOwnField(data, "displayName")) {
      return {};
    }

    return { displayName: data.displayName ?? null };
  }

  private async getOrCreateUserDmTestRule(discordId: string, targetId: number) {
    let notificationRule =
      await this.prisma.orm.public.NotificationRule.findFirst({
        where: {
          ownerType: DbNotificationOwnerType.USER,
          ownerId: discordId,
          triggerType: DbNotificationTriggerType.SCHEDULED_MESSAGE,
          name: USER_DM_TEST_RULE_NAME,
        },
      });

    if (!notificationRule) {
      notificationRule = await this.prisma.orm.public.NotificationRule.create({
        data: {
          ownerType: DbNotificationOwnerType.USER,
          ownerId: discordId,
          triggerType: DbNotificationTriggerType.SCHEDULED_MESSAGE,
          guildId: null,
          world: null,
          name: USER_DM_TEST_RULE_NAME,
          filters: Prisma.DbNull,
          contentTemplate: null,
          scheduleStrategy: DbNotificationScheduleStrategy.FIXED_DATETIME,
          scheduleAnchor: null,
          scheduleOffsetMinutes: null,
          scheduledAt: null,
          scheduleIntervalType: DbNotificationScheduleIntervalType.ONCE,
          scheduleIntervalValue: null,
          scheduleWeekday: null,
          scheduleTimeOfDay: null,
          scheduledUntil: null,
          scheduleTimezone: null,
          enabled: false,
          dedupeWindowSeconds: 0,
        },
      });
    }

    await this.prisma.orm.public.NotificationRuleTarget.createMany({
      data: [{ ruleId: notificationRule.id, targetId }],
      skipDuplicates: true,
    });

    return notificationRule;
  }

  createGuildChannelTargetMetadata(
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

  private async attachUserTargetToWatchedItemRules(
    discordId: string,
    targetId: number,
  ) {
    const watchedRules = await this.prisma.orm.public.WatchedItem.findMany({
      where: {
        userId: discordId,
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

    await this.prisma.orm.public.NotificationRuleTarget.createMany({
      data: watchedRules
        .map((watchedItem) => watchedItem.notificationRuleId)
        .filter((ruleId): ruleId is number => ruleId !== null)
        .map((ruleId) => ({ ruleId, targetId })),
      skipDuplicates: true,
    });
  }

  private async getUserDmTestTriggerUsage(targetId: number) {
    const usageMap = await this.getUserDmTestTriggerUsageForTargets([targetId]);

    return (
      usageMap.get(targetId) ??
      getDefaultTestTriggerUsage(
        USER_DM_TEST_TRIGGER_LIMIT,
        USER_DM_TEST_TRIGGER_WINDOW_MS,
      )
    );
  }

  private getUserDmTestTriggerUsageForTargets(targetIds: number[]) {
    return computeTestTriggerUsage(
      this.prisma,
      targetIds,
      USER_DM_TEST_TRIGGER_LIMIT,
      USER_DM_TEST_TRIGGER_WINDOW_MS,
    );
  }
}
