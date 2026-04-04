import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import type {
  DiscordGuildChannelDeletedEvent,
  DiscordGuildChannelUpsertedEvent,
  DiscordGuildChannelsSyncFailedEvent,
  DiscordGuildChannelsSyncedEvent,
  DiscordGuildSyncStateUpdatedEvent,
} from "@lootlog/types";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";
import { ChannelsService } from "src/channels/channels.service";

@Injectable()
export class ChannelsEventsHandler {
  private readonly logger = new Logger(ChannelsEventsHandler.name);

  constructor(private readonly channelsService: ChannelsService) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.DISCORD_GUILD_CHANNELS_SYNCED,
    queue: "backend-discord-guild-channels-synced",
    queueOptions: {
      durable: true,
    },
  })
  async handleDiscordGuildChannelsSynced(
    event: DiscordGuildChannelsSyncedEvent,
  ) {
    await this.channelsService.handleGuildChannelsSynced(event);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED,
    queue: "backend-discord-guild-channel-upserted",
    queueOptions: {
      durable: true,
    },
  })
  async handleDiscordGuildChannelUpserted(
    event: DiscordGuildChannelUpsertedEvent,
  ) {
    await this.channelsService.handleGuildChannelUpserted(event);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
    queue: "backend-discord-guild-channel-deleted",
    queueOptions: {
      durable: true,
    },
  })
  async handleDiscordGuildChannelDeleted(
    event: DiscordGuildChannelDeletedEvent,
  ) {
    await this.channelsService.handleGuildChannelDeleted(event);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.DISCORD_GUILD_CHANNELS_SYNC_FAILED,
    queue: "backend-discord-guild-channels-sync-failed",
    queueOptions: {
      durable: true,
    },
  })
  async handleDiscordGuildChannelsSyncFailed(
    event: DiscordGuildChannelsSyncFailedEvent,
  ) {
    this.logger.warn(
      `Discord channel sync failed for guild ${event.guildId}: ${event.lastError}`,
    );
    await this.channelsService.handleGuildChannelsSyncFailed(event);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.DISCORD_GUILD_SYNC_STATE_UPDATED,
    queue: "backend-discord-guild-sync-state-updated",
    queueOptions: {
      durable: true,
    },
  })
  async handleDiscordGuildSyncStateUpdated(
    event: DiscordGuildSyncStateUpdatedEvent,
  ) {
    await this.channelsService.handleGuildSyncStateUpdated(event);
  }
}
