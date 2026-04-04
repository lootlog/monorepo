// oxlint-disable-next-line consistent-type-imports
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type {
  DiscordGuildChannelDeletedEvent,
  DiscordGuildChannelSnapshot,
  DiscordGuildChannelUpsertedEvent,
  DiscordGuildChannelsSyncFailedEvent,
  DiscordGuildChannelsSyncedEvent,
  DiscordGuildSyncState,
  DiscordGuildSyncStateUpdatedEvent,
} from "@lootlog/types";
import { DiscordGuildSyncStatus } from "@lootlog/types";
import { isDiscordAdministrator } from "@lootlog/nest-shared";
import {
  ChannelType,
  Client,
  DiscordAPIError,
  PermissionsBitField,
  type Collection,
  type Guild,
  type GuildBasedChannel,
  type GuildMember,
  type Role,
} from "discord.js";
import { RoutingKey } from "src/bot/enums/routing-key.enum";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { REQUIRED_NOTIFICATION_PERMISSIONS } from "./constants/required-notification-permissions.constant";

type ChannelPermissionsState = {
  canView: boolean;
  canSend: boolean;
  hasRequiredPermissions: boolean;
  requiredPermissions: string[];
  grantedPermissions: string[];
  missingPermissions: string[];
};

type SyncableGuildChannel = GuildBasedChannel & {
  name: string;
  parentId: string | null;
  rawPosition: number;
};

type GuildSyncContext = {
  botMember: GuildMember;
  syncedAt: string;
  channels: SyncableGuildChannel[];
  channelPermissions: ChannelPermissionsState[];
};

type ResolveGuildResult =
  | {
      kind: "found";
      guild: Guild;
    }
  | {
      kind: "not_found";
      lastError: string;
    }
  | {
      kind: "failed";
      error: unknown;
      lastError: string;
    };

@Injectable()
export class DiscordSyncService {
  private readonly logger = new Logger(DiscordSyncService.name);

  constructor(
    private readonly amqpConnection: AmqpConnection,
    @Inject(Client) private readonly client: Client,
  ) {}

  async handleClientReady(client: Client) {
    this.logger.log(`Bot is ready and logged in as ${client.user.username}`);
  }

  async handleGuildCreate(guild: Guild) {
    this.logger.log(
      `handleGuildCreate called for guild ${guild.id} (${guild.name}), owner: ${guild.ownerId}`,
    );

    const roles = await guild.roles.fetch();

    await this.publishGuildCreated(guild, roles);
  }

  async handleGuildUpdate(oldGuild: Guild, newGuild: Guild) {
    this.logger.log(
      `Guild ${oldGuild.name} has been updated to ${newGuild.name}`,
    );

    await this.publishGuildUpdated(newGuild);
  }

  async handleGuildDelete(guild: Guild) {
    this.logger.log(`Bot has been removed from guild ${guild.name}`);

    await this.publishGuildDeleted(guild.id);

    const syncState = this.createUnavailableSyncState(guild.id, {
      status: DiscordGuildSyncStatus.NOT_FOUND,
      lastError: "Bot no longer has access to this guild",
    });

    await this.publishGuildChannelsSyncFailed({
      guildId: guild.id,
      status: syncState.status,
      lastAttemptAt: syncState.lastAttemptAt ?? new Date().toISOString(),
      lastError:
        syncState.lastError ?? "Bot no longer has access to this guild",
    });
  }

  async handleGuildRoleCreate(role: Role) {
    this.logger.log(`Role ${role.name} has been created.`);

    await this.publishGuildRoleCreated(role);
    await this.publishStaleGuildSyncState(role.guild);
  }

  async handleGuildRoleUpdate(oldRole: Role, newRole: Role) {
    this.logger.log(`Role ${oldRole.name} has been updated to ${newRole.name}`);

    await this.publishGuildRoleUpdated(newRole);
    await this.publishStaleGuildSyncState(newRole.guild);
  }

  async handleGuildRoleDelete(role: Role) {
    this.logger.log(`Role ${role.name} has been deleted.`);

    await this.publishGuildRoleDeleted(role);
    await this.publishStaleGuildSyncState(role.guild);
  }

  async handleChannelCreate(channel: GuildBasedChannel) {
    if (!this.isSyncableGuildChannel(channel)) {
      return;
    }

    const syncContext = await this.withChannelInSyncContext(
      await this.createGuildSyncContext(channel.guild),
      channel,
    );

    await this.publishGuildChannelUpserted({
      guildId: channel.guild.id,
      channel: this.buildChannelSnapshotFromContext(channel, syncContext),
      syncState: this.createGuildSyncStateFromContext(
        channel.guild.id,
        syncContext,
      ),
    });
  }

  async handleChannelUpdate(
    oldChannel: GuildBasedChannel,
    newChannel: GuildBasedChannel,
  ) {
    const hadSyncableType = this.isSyncableGuildChannel(oldChannel);
    const hasSyncableType = this.isSyncableGuildChannel(newChannel);

    if (hasSyncableType) {
      const syncContext = await this.withChannelInSyncContext(
        await this.createGuildSyncContext(newChannel.guild),
        newChannel,
      );

      await this.publishGuildChannelUpserted({
        guildId: newChannel.guild.id,
        channel: this.buildChannelSnapshotFromContext(newChannel, syncContext),
        syncState: this.createGuildSyncStateFromContext(
          newChannel.guild.id,
          syncContext,
        ),
      });
      return;
    }

    if (!hadSyncableType) {
      return;
    }

    const syncContext = await this.createGuildSyncContext(oldChannel.guild, {
      excludeChannelId: oldChannel.id,
    });

    await this.publishGuildChannelDeleted({
      guildId: oldChannel.guild.id,
      channelId: oldChannel.id,
      syncState: this.createGuildSyncStateFromContext(
        oldChannel.guild.id,
        syncContext,
      ),
    });
  }

  async handleChannelDelete(channel: GuildBasedChannel) {
    if (!this.isSyncableGuildChannel(channel)) {
      return;
    }

    const syncContext = await this.createGuildSyncContext(channel.guild, {
      excludeChannelId: channel.id,
    });

    await this.publishGuildChannelDeleted({
      guildId: channel.guild.id,
      channelId: channel.id,
      syncState: this.createGuildSyncStateFromContext(
        channel.guild.id,
        syncContext,
      ),
    });
  }

  async getGuildChannels(guildId: string) {
    return this.loadGuildChannelsPayload(guildId);
  }

  async refreshGuildChannels(guildId: string) {
    return this.loadGuildChannelsPayload(guildId);
  }

  async getGuildSyncStatus(guildId: string) {
    const resolvedGuild = await this.resolveGuild(guildId);

    if (resolvedGuild.kind === "not_found") {
      return this.createUnavailableSyncState(guildId, {
        status: DiscordGuildSyncStatus.NOT_FOUND,
        lastError: resolvedGuild.lastError,
      });
    }

    if (resolvedGuild.kind === "failed") {
      throw resolvedGuild.error;
    }

    return this.buildLiveGuildSyncStatusFromGuild(resolvedGuild.guild);
  }

  private async loadGuildChannelsPayload(
    guildId: string,
  ): Promise<DiscordGuildChannelsSyncedEvent> {
    const resolvedGuild = await this.resolveGuild(guildId);

    if (resolvedGuild.kind === "not_found") {
      const failedPayload = this.createGuildUnavailablePayload(guildId, {
        status: DiscordGuildSyncStatus.NOT_FOUND,
        lastError: resolvedGuild.lastError,
      });

      return {
        guildId,
        channels: [],
        syncState: this.createUnavailableSyncState(guildId, {
          status: failedPayload.status,
          lastError: failedPayload.lastError,
          lastAttemptAt: failedPayload.lastAttemptAt,
        }),
      };
    }

    if (resolvedGuild.kind === "failed") {
      throw resolvedGuild.error;
    }

    return this.buildGuildChannelsPayload(resolvedGuild.guild);
  }

  private async buildGuildChannelsPayload(
    guild: Guild,
  ): Promise<DiscordGuildChannelsSyncedEvent> {
    const syncContext = await this.createGuildSyncContext(guild);
    const channels = syncContext.channels
      .map((channel) =>
        this.createGuildChannelSnapshot(
          channel,
          syncContext.botMember.user.id,
          syncContext.syncedAt,
        ),
      )
      .sort(
        (firstChannel, secondChannel) =>
          firstChannel.position - secondChannel.position ||
          firstChannel.name.localeCompare(secondChannel.name),
      );

    return {
      guildId: guild.id,
      channels,
      syncState: this.createGuildSyncStateFromContext(guild.id, syncContext),
    };
  }

  private createGuildChannelSnapshot(
    channel: SyncableGuildChannel,
    botUserId: string,
    syncedAt: string,
  ): DiscordGuildChannelSnapshot {
    const permissionsState = this.getChannelPermissionsState(
      channel,
      botUserId,
    );

    return {
      guildId: channel.guild.id,
      channelId: channel.id,
      name: channel.name,
      channelType:
        channel.type === ChannelType.GuildAnnouncement
          ? "GuildAnnouncement"
          : "GuildText",
      parentId: channel.parentId ?? null,
      position: channel.rawPosition,
      active: true,
      canView: permissionsState.canView,
      canSend: permissionsState.canSend,
      hasRequiredPermissions: permissionsState.hasRequiredPermissions,
      requiredPermissions: permissionsState.requiredPermissions,
      grantedPermissions: permissionsState.grantedPermissions,
      missingPermissions: permissionsState.missingPermissions,
      lastSyncedAt: syncedAt,
    };
  }

  private async buildLiveGuildSyncStatusFromGuild(
    guild: Guild,
    options?: {
      status?: DiscordGuildSyncStatus;
      excludeChannelId?: string;
    },
  ) {
    const syncContext = await this.createGuildSyncContext(guild, {
      excludeChannelId: options?.excludeChannelId,
    });

    return this.createGuildSyncStateFromContext(guild.id, syncContext, {
      status: options?.status,
    });
  }

  private createGuildSyncState(options: {
    guildId: string;
    botPermissions: Readonly<PermissionsBitField>;
    channelPermissions: ChannelPermissionsState[];
    syncedAt: string;
    status: DiscordGuildSyncStatus;
    lastError?: string | null;
  }): DiscordGuildSyncState {
    const permissionState = this.getPermissionState(options.botPermissions);
    const lastSuccessAt =
      options.status === DiscordGuildSyncStatus.SYNCED
        ? options.syncedAt
        : null;

    return {
      guildId: options.guildId,
      status: options.status,
      hasRequiredPermissions: permissionState.hasRequiredPermissions,
      requiredPermissions: permissionState.requiredPermissions,
      grantedPermissions: permissionState.grantedPermissions,
      missingPermissions: permissionState.missingPermissions,
      channelCount: options.channelPermissions.length,
      selectableChannelCount: options.channelPermissions.filter(
        (channel) => channel.hasRequiredPermissions,
      ).length,
      lastAttemptAt: options.syncedAt,
      lastSuccessAt,
      lastError: options.lastError ?? null,
      updatedAt: options.syncedAt,
    };
  }

  private getChannelPermissionsState(
    channel: GuildBasedChannel,
    botUserId: string,
  ): ChannelPermissionsState {
    const permissions = channel.permissionsFor(botUserId);
    const permissionState = this.getPermissionState(permissions);

    return {
      canView: permissions?.has(PermissionsBitField.Flags.ViewChannel) ?? false,
      canSend:
        permissions?.has(PermissionsBitField.Flags.SendMessages) ?? false,
      hasRequiredPermissions: permissionState.hasRequiredPermissions,
      requiredPermissions: permissionState.requiredPermissions,
      grantedPermissions: permissionState.grantedPermissions,
      missingPermissions: permissionState.missingPermissions,
    };
  }

  private isSupportedChannelType(channelType: ChannelType) {
    return (
      channelType === ChannelType.GuildText ||
      channelType === ChannelType.GuildAnnouncement
    );
  }

  private isSyncableGuildChannel(
    channel: GuildBasedChannel,
  ): channel is SyncableGuildChannel {
    return this.isSupportedChannelType(channel.type);
  }

  private async resolveGuild(guildId: string): Promise<ResolveGuildResult> {
    const cachedGuild = this.client.guilds.cache.get(guildId);

    if (cachedGuild) {
      return {
        kind: "found",
        guild: cachedGuild,
      };
    }

    try {
      const guild = await this.client.guilds.fetch(guildId);

      return {
        kind: "found",
        guild,
      };
    } catch (error) {
      if (this.isGuildNotFoundError(error)) {
        return {
          kind: "not_found",
          lastError: "Guild not found by Discord bot",
        };
      }

      return {
        kind: "failed",
        error,
        lastError: this.getErrorMessage(error),
      };
    }
  }

  private createGuildUnavailablePayload(
    guildId: string,
    options?: {
      status?: DiscordGuildSyncStatus;
      lastError?: string;
    },
  ): DiscordGuildChannelsSyncFailedEvent {
    return {
      guildId,
      status: options?.status ?? DiscordGuildSyncStatus.NOT_FOUND,
      lastAttemptAt: new Date().toISOString(),
      lastError: options?.lastError ?? "Guild not found by Discord bot",
    };
  }

  private createUnavailableSyncState(
    guildId: string,
    options?: {
      status?: DiscordGuildSyncStatus;
      lastAttemptAt?: string | null;
      lastError?: string | null;
    },
  ): DiscordGuildSyncState {
    const updatedAt = options?.lastAttemptAt ?? new Date().toISOString();

    return {
      guildId,
      status: options?.status ?? DiscordGuildSyncStatus.STALE,
      hasRequiredPermissions: false,
      requiredPermissions: REQUIRED_NOTIFICATION_PERMISSIONS.map(
        (permission) => permission.name,
      ),
      grantedPermissions: [],
      missingPermissions: REQUIRED_NOTIFICATION_PERMISSIONS.map(
        (permission) => permission.name,
      ),
      channelCount: 0,
      selectableChannelCount: 0,
      lastAttemptAt: options?.lastAttemptAt ?? updatedAt,
      lastSuccessAt: null,
      lastError: options?.lastError ?? "Discord sync status is unavailable",
      updatedAt,
    };
  }

  private async createGuildSyncContext(
    guild: Guild,
    options?: {
      excludeChannelId?: string;
      syncedAt?: string;
    },
  ): Promise<GuildSyncContext> {
    const syncedAt = options?.syncedAt ?? new Date().toISOString();
    const botMember = guild.members.me ?? (await guild.members.fetchMe());
    const fetchedChannels = (await guild.channels.fetch(undefined, {
      force: true,
    })) as unknown as Collection<string, GuildBasedChannel | null>;
    const channels = Array.from(fetchedChannels.values()).filter(
      (channel): channel is SyncableGuildChannel =>
        channel !== null &&
        this.isSyncableGuildChannel(channel) &&
        channel.id !== options?.excludeChannelId,
    );

    return {
      botMember,
      syncedAt,
      channels,
      channelPermissions: channels.map((channel) =>
        this.getChannelPermissionsState(channel, botMember.user.id),
      ),
    };
  }

  private createGuildSyncStateFromContext(
    guildId: string,
    syncContext: GuildSyncContext,
    options?: {
      status?: DiscordGuildSyncStatus;
      lastError?: string | null;
    },
  ) {
    return this.createGuildSyncState({
      guildId,
      botPermissions: syncContext.botMember.permissions,
      channelPermissions: syncContext.channelPermissions,
      syncedAt: syncContext.syncedAt,
      status: options?.status ?? DiscordGuildSyncStatus.SYNCED,
      lastError: options?.lastError,
    });
  }

  private buildChannelSnapshotFromContext(
    channel: SyncableGuildChannel,
    syncContext: GuildSyncContext,
  ) {
    const syncedChannel = this.findSyncableChannel(
      syncContext.channels,
      channel.id,
    );

    return this.createGuildChannelSnapshot(
      syncedChannel ?? channel,
      syncContext.botMember.user.id,
      syncContext.syncedAt,
    );
  }

  private findSyncableChannel(
    channels: SyncableGuildChannel[],
    channelId: string,
  ) {
    return channels.find((channel) => channel.id === channelId);
  }

  private async withChannelInSyncContext(
    syncContext: GuildSyncContext,
    channel: SyncableGuildChannel,
  ): Promise<GuildSyncContext> {
    if (this.findSyncableChannel(syncContext.channels, channel.id)) {
      return syncContext;
    }

    return {
      ...syncContext,
      channels: [...syncContext.channels, channel],
      channelPermissions: [
        ...syncContext.channelPermissions,
        this.getChannelPermissionsState(channel, syncContext.botMember.user.id),
      ],
    };
  }

  private getPermissionState(
    permissions: Readonly<PermissionsBitField> | null | undefined,
  ) {
    const grantedPermissions = REQUIRED_NOTIFICATION_PERMISSIONS.filter(
      (permission) => permissions?.has(permission.flag) ?? false,
    ).map((permission) => permission.name);
    const missingPermissions = REQUIRED_NOTIFICATION_PERMISSIONS.filter(
      (permission) => !(permissions?.has(permission.flag) ?? false),
    ).map((permission) => permission.name);

    return {
      hasRequiredPermissions: missingPermissions.length === 0,
      requiredPermissions: REQUIRED_NOTIFICATION_PERMISSIONS.map(
        (permission) => permission.name,
      ),
      grantedPermissions,
      missingPermissions,
    };
  }

  private isGuildNotFoundError(error: unknown) {
    return (
      error instanceof DiscordAPIError &&
      [10_004, 50_001].includes(Number(error.code))
    );
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown Discord sync error";
  }

  private async publishGuildChannelUpserted(
    payload: DiscordGuildChannelUpsertedEvent,
  ) {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED,
      payload,
    );
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

  private async publishGuildSyncStateUpdated(
    payload: DiscordGuildSyncStateUpdatedEvent,
  ) {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.DISCORD_GUILD_SYNC_STATE_UPDATED,
      payload,
    );
  }

  private async publishGuildChannelsSyncFailed(
    payload: DiscordGuildChannelsSyncFailedEvent,
  ) {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.DISCORD_GUILD_CHANNELS_SYNC_FAILED,
      payload,
    );
  }

  private async publishGuildCreated(
    guild: Guild,
    roles: Awaited<ReturnType<Guild["roles"]["fetch"]>>,
  ) {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_CREATE,
      {
        guildId: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        ownerId: guild.ownerId,
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          admin: isDiscordAdministrator(role.permissions.bitfield),
          position: role.position,
        })),
      },
    );
  }

  private async publishGuildUpdated(guild: Guild) {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_UPDATE,
      {
        guildId: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        ownerId: guild.ownerId,
      },
    );
  }

  private async publishGuildDeleted(guildId: string) {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_DELETE,
      {
        guildId,
      },
    );
  }

  private async publishGuildRoleCreated(role: Role) {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_CREATE_ROLE,
      {
        guildId: role.guild.id,
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        admin: isDiscordAdministrator(role.permissions.bitfield),
      },
    );
  }

  private async publishGuildRoleUpdated(role: Role) {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_UPDATE_ROLE,
      {
        guildId: role.guild.id,
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        admin: isDiscordAdministrator(role.permissions.bitfield),
      },
    );
  }

  private async publishGuildRoleDeleted(role: Role) {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_DELETE_ROLE,
      {
        guildId: role.guild.id,
        id: role.id,
      },
    );
  }

  private async publishStaleGuildSyncState(guild: Guild) {
    await this.publishGuildSyncStateUpdated({
      guildId: guild.id,
      syncState: await this.buildLiveGuildSyncStatusFromGuild(guild, {
        status: DiscordGuildSyncStatus.STALE,
      }),
    });
  }
}
