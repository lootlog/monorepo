import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { DiscordGuildChannelSnapshot } from "@lootlog/types";
import {
  NotificationOwnerType as DbNotificationOwnerType,
  NotificationProvider as DbNotificationProvider,
  NotificationTargetType as DbNotificationTargetType,
} from "prisma/generated/client";
import { ChannelsService } from "src/channels/channels.service";
import { PrismaService } from "src/db/prisma.service";
import { NotificationJobService } from "src/notifications/notification-job.service";
import type { CreateNotificationTargetDto } from "src/notifications/dto/create-notification-target.dto";
import type { UpdateNotificationTargetDto } from "src/notifications/dto/update-notification-target.dto";

@Injectable()
export class NotificationTargetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channelsService: ChannelsService,
    @Inject(forwardRef(() => NotificationJobService))
    private readonly jobService: NotificationJobService,
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
      await this.jobService.cancelPendingJobs({ targetId });
    }

    return updated;
  }

  async deleteGuildTarget(guildId: string, targetId: number) {
    await this.ensureGuildTarget(guildId, targetId);
    await this.jobService.cancelPendingJobs({ targetId });
    await this.prisma.notificationTarget.delete({ where: { id: targetId } });
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
    await this.jobService.cancelPendingJobs({ targetId });
    await this.prisma.notificationTarget.delete({ where: { id: targetId } });
    return { success: true };
  }

  async validateTargetIds(params: {
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

  async getActiveUserTargetIds(userId: string) {
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

  async handleGuildChannelDeleted(event: {
    guildId: string;
    channelId: string;
  }) {
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
      targets.map((target) =>
        this.jobService.cancelPendingJobs({ targetId: target.id }),
      ),
    );

    await this.prisma.notificationTarget.deleteMany({
      where: {
        id: {
          in: targets.map((target) => target.id),
        },
      },
    });
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
}
