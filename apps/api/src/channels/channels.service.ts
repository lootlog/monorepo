import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable } from "@nestjs/common";
import {
  DiscordGuildSyncStatus,
  type DiscordGuildChannelDeletedEvent,
  type DiscordGuildChannelUpsertedEvent,
  type DiscordGuildChannelsSyncFailedEvent,
  type DiscordGuildChannelsSyncedEvent,
  type DiscordGuildSyncStateUpdatedEvent,
} from "@lootlog/schema/notifications";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import type { Logger as WinstonLogger } from "winston";
import { DiscordBotClientService } from "#src/discord-bot-client/discord-bot-client.service";
import { discordBotConfig } from "#src/config/discord-bot.config";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { ChannelsRepository } from "./channels.repository.js";

type GetGuildDiscordChannelsOptions = {
  forceRefresh?: boolean;
  refreshIfStale?: boolean;
};

@Injectable()
export class ChannelsService {
  private readonly staleAfterMs: number;

  constructor(
    private readonly repository: ChannelsRepository,
    private readonly discordBotClient: DiscordBotClientService,
    private readonly amqpConnection: AmqpConnection,
    @Inject(APPLICATION_LOGGER)
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

    await this.repository.upsertChannel(
      event.guildId,
      event.channel,
      event.syncState,
    );
  }

  async handleGuildChannelDeleted(event: DiscordGuildChannelDeletedEvent) {
    if (!(await this.guildExists(event.guildId))) {
      this.logSkippedSyncEvent(event.guildId, "channel-delete");
      return;
    }

    await this.repository.deleteChannel(
      event.guildId,
      event.channelId,
      event.syncState,
    );
  }

  async handleGuildSyncStateUpdated(event: DiscordGuildSyncStateUpdatedEvent) {
    if (!(await this.guildExists(event.guildId))) {
      this.logSkippedSyncEvent(event.guildId, "sync-state-update");
      return;
    }

    await this.repository.upsertSyncState(event.guildId, event.syncState);
  }

  async handleGuildChannelsSyncFailed(
    event: DiscordGuildChannelsSyncFailedEvent,
  ) {
    if (!(await this.guildExists(event.guildId))) {
      this.logSkippedSyncEvent(event.guildId, "sync-failed");
      return;
    }

    await this.repository.upsertFailure(event.guildId, event);
  }

  private loadGuildDiscordState(guildId: string) {
    return this.repository.loadGuildDiscordState(guildId);
  }

  async markGuildSyncStale(guildId: string, lastError?: string | null) {
    if (!(await this.guildExists(guildId))) {
      return;
    }

    await this.repository.markGuildSyncStale(guildId, lastError ?? null);
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
    const existingChannels = await this.repository.listChannelIds(
      event.guildId,
    );
    const nextChannelIds = new Set(
      event.channels.map((channel) => channel.channelId),
    );
    const removedChannelIds = existingChannels
      .map((channel) => channel.channelId)
      .filter((channelId) => !nextChannelIds.has(channelId));

    await this.repository.reconcile(
      event.guildId,
      event.channels,
      removedChannelIds,
      event.syncState,
    );

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

  private async recordGuildSyncFailure(guildId: string, error: unknown) {
    if (!(await this.guildExists(guildId))) {
      return;
    }

    await this.repository.upsertFailure(guildId, {
      status: DiscordGuildSyncStatus.FAILED,
      lastAttemptAt: new Date().toISOString(),
      lastError: this.getErrorMessage(error),
    });
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown Discord sync error";
  }

  private guildExists(guildId: string) {
    return this.repository.guildExists(guildId);
  }

  private logSkippedSyncEvent(guildId: string, eventType: string) {
    this.winstonLogger.warn({
      message: "Skipped Discord sync event for unknown guild",
      guildId,
      eventType,
    });
  }
}
