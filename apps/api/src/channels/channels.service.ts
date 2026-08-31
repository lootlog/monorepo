import { db as prismaDb } from "#src/prisma/db";
import { and } from "@prisma/orm-family-sql/orm-client";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable } from "@nestjs/common";
import {
  DiscordGuildSyncStatus,
  type DiscordGuildChannelSnapshot,
  type DiscordGuildChannelDeletedEvent,
  type DiscordGuildChannelUpsertedEvent,
  type DiscordGuildChannelsSyncFailedEvent,
  type DiscordGuildChannelsSyncedEvent,
  type DiscordGuildSyncState,
  type DiscordGuildSyncStateUpdatedEvent,
} from "@lootlog/types";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger as WinstonLogger } from "winston";
import { DiscordBotClientService } from "#src/discord-bot-client/discord-bot-client.service";
import { discordBotConfig } from "#src/config/discord-bot.config";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { PrismaService } from "#src/db/prisma.service";
import { RoutingKey } from "#src/enum/routing-key.enum";

const DbNotificationOwnerType =
  prismaDb.nativeEnums.public.NotificationOwnerType.members;
type DbNotificationOwnerType =
  (typeof DbNotificationOwnerType)[keyof typeof DbNotificationOwnerType];
const DbNotificationProvider =
  prismaDb.nativeEnums.public.NotificationProvider.members;
type DbNotificationProvider =
  (typeof DbNotificationProvider)[keyof typeof DbNotificationProvider];
const DbNotificationTargetType =
  prismaDb.nativeEnums.public.NotificationTargetType.members;
type DbNotificationTargetType =
  (typeof DbNotificationTargetType)[keyof typeof DbNotificationTargetType];

type GetGuildDiscordChannelsOptions = {
  forceRefresh?: boolean;
  refreshIfStale?: boolean;
};

type GuildSyncStatePersistenceClient = {
  orm: any;
};

type GuildChannelPersistenceClient = {
  orm: any;
};

@Injectable()
export class ChannelsService {
  private readonly staleAfterMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordBotClient: DiscordBotClientService,
    private readonly amqpConnection: AmqpConnection,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly winstonLogger: WinstonLogger,
  ) {
    this.staleAfterMs = discordBotConfig.channelSnapshotStaleSeconds * 1000;
  }

  async getGuildDiscordChannels(
    guildId: string,
    options: GetGuildDiscordChannelsOptions = {},
  ) {
    const { forceRefresh = false, refreshIfStale = true } = options;
    const cachedData = await this.loadGuildDiscordState(guildId);

    if (
      !forceRefresh &&
      !this.shouldRefresh(cachedData.syncState, refreshIfStale)
    ) {
      return cachedData;
    }

    try {
      return await this.refreshGuildDiscordChannels(guildId);
    } catch (error) {
      const fallbackState = cachedData.syncState
        ? {
            ...cachedData.syncState,
            status: DiscordGuildSyncStatus.FAILED,
            lastAttemptAt: new Date(),
            lastError: this.getErrorMessage(error),
            updatedAt: new Date(),
          }
        : null;

      if (cachedData.channels.length > 0 && fallbackState) {
        return {
          channels: cachedData.channels,
          syncState: fallbackState,
        };
      }

      throw error;
    }
  }

  async getSelectableGuildChannels(guildId: string) {
    const result = await this.getGuildDiscordChannels(guildId, {
      refreshIfStale: true,
    });

    return {
      channels: result.channels.filter(
        (channel) => channel.hasRequiredPermissions,
      ),
      syncState: result.syncState,
    };
  }

  async refreshGuildDiscordChannels(guildId: string) {
    try {
      const payload = await this.discordBotClient.refreshGuildChannels(guildId);
      await this.reconcileGuildChannels({
        guildId,
        channels: payload.channels,
        syncState: payload.syncState,
      });

      return this.loadGuildDiscordState(guildId);
    } catch (error) {
      await this.recordGuildSyncFailure(guildId, error);
      throw error;
    }
  }

  async handleGuildChannelsSynced(event: DiscordGuildChannelsSyncedEvent) {
    if (!(await this.guildExists(event.guildId))) {
      this.logSkippedSyncEvent(event.guildId, "full-sync");
      return;
    }

    await this.reconcileGuildChannels(event);
  }

  async handleGuildChannelUpserted(event: DiscordGuildChannelUpsertedEvent) {
    if (!(await this.guildExists(event.guildId))) {
      this.logSkippedSyncEvent(event.guildId, "channel-upsert");
      return;
    }

    await this.prisma.db.transaction(async (tx) => {
      await this.upsertGuildChannelSnapshot(tx, event.guildId, event.channel);
      await this.syncGuildNotificationTarget(tx, event.guildId, event.channel);

      await this.upsertGuildSyncState(tx, event.guildId, event.syncState);
    });
  }

  async handleGuildChannelDeleted(event: DiscordGuildChannelDeletedEvent) {
    if (!(await this.guildExists(event.guildId))) {
      this.logSkippedSyncEvent(event.guildId, "channel-delete");
      return;
    }

    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.DiscordGuildChannelSnapshot.where((row) =>
        and(row.guildId.eq(event.guildId), row.channelId.eq(event.channelId)),
      ).deleteAndCount();

      await this.upsertGuildSyncState(tx, event.guildId, event.syncState);
    });
  }

  async handleGuildSyncStateUpdated(event: DiscordGuildSyncStateUpdatedEvent) {
    if (!(await this.guildExists(event.guildId))) {
      this.logSkippedSyncEvent(event.guildId, "sync-state-update");
      return;
    }

    await this.upsertGuildSyncState(
      this.prisma as unknown as GuildSyncStatePersistenceClient,
      event.guildId,
      event.syncState,
    );
  }

  async handleGuildChannelsSyncFailed(
    event: DiscordGuildChannelsSyncFailedEvent,
  ) {
    if (!(await this.guildExists(event.guildId))) {
      this.logSkippedSyncEvent(event.guildId, "sync-failed");
      return;
    }

    await this.upsertGuildSyncFailureState(
      this.prisma as unknown as GuildSyncStatePersistenceClient,
      event.guildId,
      event,
    );
  }

  private async loadGuildDiscordState(guildId: string) {
    const [channels, syncState] = await Promise.all([
      this.prisma.db.orm.public.DiscordGuildChannelSnapshot.where((row) =>
        row.guildId.eq(guildId),
      )
        .orderBy([(row) => row.position.asc(), (row) => row.name.asc()])
        .all(),
      this.prisma.db.orm.public.DiscordGuildSyncState.where((row) =>
        row.guildId.eq(guildId),
      ).first(),
    ]);

    return { channels, syncState };
  }

  async markGuildSyncStale(guildId: string, lastError?: string | null) {
    if (!(await this.guildExists(guildId))) {
      return;
    }

    await this.prisma.db.orm.public.DiscordGuildSyncState.where((row) =>
      row.guildId.eq(guildId),
    ).upsert({
      create: {
        guildId,
        status: DiscordGuildSyncStatus.STALE,
        hasRequiredPermissions: false,
        requiredPermissions: [],
        grantedPermissions: [],
        missingPermissions: [],
        channelCount: 0,
        selectableChannelCount: 0,
        lastAttemptAt: null,
        lastSuccessAt: null,
        lastError: lastError ?? null,
        updatedAt: new Date(),
      },
      update: {
        status: DiscordGuildSyncStatus.STALE,
        lastError: lastError ?? null,
        updatedAt: new Date(),
      },
    });
  }

  private shouldRefresh(
    syncState: { updatedAt: Date; status: string } | null,
    refreshIfStale: boolean,
  ) {
    if (!refreshIfStale) {
      return false;
    }

    if (!syncState) {
      return true;
    }

    if (syncState.status === DiscordGuildSyncStatus.SYNCING) {
      return false;
    }

    if (syncState.status === DiscordGuildSyncStatus.STALE) {
      return true;
    }

    return Date.now() - syncState.updatedAt.getTime() > this.staleAfterMs;
  }

  private async reconcileGuildChannels(event: DiscordGuildChannelsSyncedEvent) {
    const existingChannels =
      await this.prisma.db.orm.public.DiscordGuildChannelSnapshot.where((row) =>
        row.guildId.eq(event.guildId),
      )
        .select("channelId")
        .all();
    const nextChannelIds = new Set(
      event.channels.map((channel) => channel.channelId),
    );
    const removedChannelIds = existingChannels
      .map((channel) => channel.channelId)
      .filter((channelId) => !nextChannelIds.has(channelId));

    await this.prisma.db.transaction(async (tx) => {
      await Promise.all(
        event.channels.map(async (channel) => {
          await this.upsertGuildChannelSnapshot(tx, event.guildId, channel);
          await this.syncGuildNotificationTarget(tx, event.guildId, channel);
        }),
      );

      if (removedChannelIds.length > 0) {
        await tx.orm.public.DiscordGuildChannelSnapshot.where((row) =>
          and(
            row.guildId.eq(event.guildId),
            row.channelId.in(removedChannelIds),
          ),
        ).deleteAndCount();
      }

      await this.upsertGuildSyncState(tx, event.guildId, event.syncState);
    });

    if (removedChannelIds.length > 0) {
      await Promise.all(
        removedChannelIds.map((channelId) =>
          this.publishGuildChannelDeleted({
            guildId: event.guildId,
            channelId,
            syncState: event.syncState,
          }),
        ),
      );
    }

    this.winstonLogger.log({
      level: "info",
      message: "Discord guild channels synchronized",
      guildId: event.guildId,
      channelCount: event.channels.length,
      removedChannelCount: removedChannelIds.length,
    });
  }

  private async publishGuildChannelDeleted(
    payload: DiscordGuildChannelDeletedEvent,
  ) {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
      payload,
    );
  }

  private async upsertGuildSyncState(
    client: GuildSyncStatePersistenceClient,
    guildId: string,
    syncState: DiscordGuildSyncState,
  ) {
    const lastAttemptAt = syncState.lastAttemptAt
      ? new Date(syncState.lastAttemptAt)
      : null;
    const lastSuccessAt = syncState.lastSuccessAt
      ? new Date(syncState.lastSuccessAt)
      : lastAttemptAt;

    await client.orm.public.DiscordGuildSyncState.where((row) =>
      row.guildId.eq(guildId),
    ).upsert({
      create: {
        guildId,
        status: syncState.status,
        hasRequiredPermissions: syncState.hasRequiredPermissions,
        requiredPermissions: syncState.requiredPermissions,
        grantedPermissions: syncState.grantedPermissions,
        missingPermissions: syncState.missingPermissions,
        channelCount: syncState.channelCount,
        selectableChannelCount: syncState.selectableChannelCount,
        lastAttemptAt,
        lastSuccessAt,
        lastError: syncState.lastError,
        updatedAt: new Date(),
      },
      update: {
        status: syncState.status,
        hasRequiredPermissions: syncState.hasRequiredPermissions,
        requiredPermissions: syncState.requiredPermissions,
        grantedPermissions: syncState.grantedPermissions,
        missingPermissions: syncState.missingPermissions,
        channelCount: syncState.channelCount,
        selectableChannelCount: syncState.selectableChannelCount,
        lastAttemptAt,
        lastError: syncState.lastError,
        ...(syncState.status === DiscordGuildSyncStatus.SYNCED
          ? { lastSuccessAt }
          : {}),
        updatedAt: new Date(),
      },
    });
  }

  private async upsertGuildSyncFailureState(
    client: GuildSyncStatePersistenceClient,
    guildId: string,
    failure: Pick<
      DiscordGuildChannelsSyncFailedEvent,
      "status" | "lastAttemptAt" | "lastError"
    >,
  ) {
    await client.orm.public.DiscordGuildSyncState.where((row) =>
      row.guildId.eq(guildId),
    ).upsert({
      create: {
        guildId,
        status: failure.status,
        hasRequiredPermissions: false,
        requiredPermissions: [],
        grantedPermissions: [],
        missingPermissions: [],
        channelCount: 0,
        selectableChannelCount: 0,
        lastAttemptAt: new Date(failure.lastAttemptAt),
        lastSuccessAt: null,
        lastError: failure.lastError,
        updatedAt: new Date(),
      },
      update: {
        status: failure.status,
        lastAttemptAt: new Date(failure.lastAttemptAt),
        lastError: failure.lastError,
        updatedAt: new Date(),
      },
    });
  }

  private async recordGuildSyncFailure(guildId: string, error: unknown) {
    if (!(await this.guildExists(guildId))) {
      return;
    }

    await this.upsertGuildSyncFailureState(
      this.prisma as unknown as GuildSyncStatePersistenceClient,
      guildId,
      {
        status: DiscordGuildSyncStatus.FAILED,
        lastAttemptAt: new Date().toISOString(),
        lastError: this.getErrorMessage(error),
      },
    );
  }

  private async upsertGuildChannelSnapshot(
    client: GuildChannelPersistenceClient,
    guildId: string,
    channel: DiscordGuildChannelSnapshot,
  ) {
    const channelData = this.createGuildChannelSnapshotData(guildId, channel);

    await client.orm.public.DiscordGuildChannelSnapshot.where((row) =>
      and(row.guildId.eq(guildId), row.channelId.eq(channel.channelId)),
    ).upsert({
      create: channelData,
      update: channelData,
    });
  }

  private async syncGuildNotificationTarget(
    client: GuildChannelPersistenceClient,
    guildId: string,
    channel: DiscordGuildChannelSnapshot,
  ) {
    await client.orm.public.NotificationTarget.where((row) =>
      and(
        row.ownerType.eq(DbNotificationOwnerType.GUILD),
        row.ownerId.eq(guildId),
        row.provider.eq(DbNotificationProvider.DISCORD),
        row.targetType.eq(DbNotificationTargetType.CHANNEL),
        row.externalId.eq(channel.channelId),
      ),
    ).updateAndCount({
      canSend: channel.hasRequiredPermissions,
      lastSyncedAt: new Date(channel.lastSyncedAt),
      metadata: this.createGuildChannelTargetMetadata(channel),
      updatedAt: new Date(),
    });
  }

  private createGuildChannelSnapshotData(
    guildId: string,
    channel: DiscordGuildChannelSnapshot,
  ) {
    return {
      guildId,
      channelId: channel.channelId,
      name: channel.name,
      channelType: channel.channelType,
      parentId: channel.parentId,
      position: channel.position,
      active: channel.active,
      canView: channel.canView,
      canSend: channel.canSend,
      hasRequiredPermissions: channel.hasRequiredPermissions,
      requiredPermissions: channel.requiredPermissions,
      grantedPermissions: channel.grantedPermissions,
      missingPermissions: channel.missingPermissions,
      lastSyncedAt: new Date(channel.lastSyncedAt),
      updatedAt: new Date(),
    };
  }

  private createGuildChannelTargetMetadata(
    channel: DiscordGuildChannelSnapshot,
  ) {
    return {
      channelType: channel.channelType,
      requiredPermissions: channel.requiredPermissions,
      grantedPermissions: channel.grantedPermissions,
      missingPermissions: channel.missingPermissions,
      hasRequiredPermissions: channel.hasRequiredPermissions,
    };
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown Discord sync error";
  }

  private async guildExists(guildId: string) {
    const guild = await this.prisma.db.orm.public.Guild.where((row) =>
      row.id.eq(guildId),
    )
      .select("id")
      .first();

    return guild !== null;
  }

  private logSkippedSyncEvent(guildId: string, eventType: string) {
    this.winstonLogger.warn({
      message: "Skipped Discord sync event for unknown guild",
      guildId,
      eventType,
    });
  }
}
