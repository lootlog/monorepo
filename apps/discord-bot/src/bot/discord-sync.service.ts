import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { RabbitRoutingKey as RoutingKey } from "@lootlog/protocol/rabbit/topology";
import {
  DiscordGuildSyncStatus,
  type DiscordGuildChannelDeletedEvent,
  type DiscordGuildChannelSnapshot,
  type DiscordGuildChannelUpsertedEvent,
  type DiscordGuildChannelsSyncFailedEvent,
  type DiscordGuildChannelsSyncedEvent,
  type DiscordGuildSyncState,
  type DiscordGuildSyncStateUpdatedEvent,
} from "@lootlog/schema/notifications";
import { Clock, Effect, Schema } from "effect";
import { ChannelType, DiscordAPIError, PermissionsBitField } from "discord.js";
import type {
  Client,
  Collection,
  Guild,
  GuildBasedChannel,
  GuildMember,
  Role,
} from "discord.js";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { AppLogger } from "#src/shared/logger";
import { REQUIRED_NOTIFICATION_PERMISSIONS } from "./constants/required-notification-permissions.constant.js";
import { discordSdkRead } from "./discord-sdk-read.js";
import type { RabbitPublisher } from "./rabbit-publisher.js";

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
  | { kind: "found"; guild: Guild }
  | { kind: "not_found"; lastError: string }
  | { kind: "failed"; cause: unknown };

export class DiscordSyncFailure extends TaggedErrorClass<DiscordSyncFailure>()(
  "DiscordSyncFailure",
  {
    operation: Schema.String,
    reason: Schema.String,
    cause: Schema.Unknown,
  },
) {}

const failure = (operation: string, cause: unknown) =>
  new DiscordSyncFailure({
    operation,
    reason: cause instanceof Error ? cause.message : String(cause),
    cause,
  });

const isSupportedChannelType = (channelType: ChannelType) =>
  channelType === ChannelType.GuildText ||
  channelType === ChannelType.GuildAnnouncement;

const isSyncableGuildChannel = (
  channel: GuildBasedChannel,
): channel is SyncableGuildChannel => isSupportedChannelType(channel.type);

const permissionState = (
  permissions: Readonly<PermissionsBitField> | null | undefined,
) => {
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
};

const channelPermissionsState = (
  channel: GuildBasedChannel,
  botUserId: string,
): ChannelPermissionsState => {
  const permissions = channel.permissionsFor(botUserId);
  return {
    canView: permissions?.has(PermissionsBitField.Flags.ViewChannel) ?? false,
    canSend: permissions?.has(PermissionsBitField.Flags.SendMessages) ?? false,
    ...permissionState(permissions),
  };
};

const unavailableSyncState = (
  guildId: string,
  options?: {
    status?: DiscordGuildSyncStatus;
    lastAttemptAt?: string | null;
    lastError?: string | null;
  },
): DiscordGuildSyncState => {
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
};

const syncState = (options: {
  guildId: string;
  botPermissions: Readonly<PermissionsBitField>;
  channelPermissions: ChannelPermissionsState[];
  syncedAt: string;
  status: DiscordGuildSyncStatus;
  lastError?: string | null;
}): DiscordGuildSyncState => ({
  guildId: options.guildId,
  status: options.status,
  ...permissionState(options.botPermissions),
  channelCount: options.channelPermissions.length,
  selectableChannelCount: options.channelPermissions.filter(
    (channel) => channel.hasRequiredPermissions,
  ).length,
  lastAttemptAt: options.syncedAt,
  lastSuccessAt:
    options.status === DiscordGuildSyncStatus.SYNCED ? options.syncedAt : null,
  lastError: options.lastError ?? null,
  updatedAt: options.syncedAt,
});

const syncStateFromContext = (
  guildId: string,
  context: GuildSyncContext,
  options?: { status?: DiscordGuildSyncStatus; lastError?: string | null },
) =>
  syncState({
    guildId,
    botPermissions: context.botMember.permissions,
    channelPermissions: context.channelPermissions,
    syncedAt: context.syncedAt,
    status: options?.status ?? DiscordGuildSyncStatus.SYNCED,
    lastError: options?.lastError,
  });

const channelSnapshot = (
  channel: SyncableGuildChannel,
  botUserId: string,
  syncedAt: string,
): DiscordGuildChannelSnapshot => {
  const permissions = channelPermissionsState(channel, botUserId);
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
    canView: permissions.canView,
    canSend: permissions.canSend,
    hasRequiredPermissions: permissions.hasRequiredPermissions,
    requiredPermissions: permissions.requiredPermissions,
    grantedPermissions: permissions.grantedPermissions,
    missingPermissions: permissions.missingPermissions,
    lastSyncedAt: syncedAt,
  };
};

const isGuildNotFoundError = (error: unknown) =>
  error instanceof DiscordAPIError &&
  [10_004, 50_001].includes(Number(error.code));

const unwrapSdkFailure = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "_tag" in error &&
  error._tag === "DiscordSdkReadFailure" &&
  "cause" in error
    ? error.cause
    : error;

export const makeDiscordSync = (publisher: RabbitPublisher, client: Client) => {
  const logger = new AppLogger("DiscordSync");

  const publish = (
    routingKey: Parameters<RabbitPublisher["publish"]>[1],
    payload: unknown,
  ) =>
    publisher.publish(DEFAULT_EXCHANGE_NAME, routingKey, payload).pipe(
      Effect.mapError((cause) => failure(`publish:${routingKey}`, cause)),
      Effect.withSpan("DiscordSync_publish", {
        attributes: { adapter: "rabbitmq", retryCount: 0, routingKey },
      }),
    );

  const resolveGuild = (guildId: string): Effect.Effect<ResolveGuildResult> => {
    const cachedGuild = client.guilds.cache.get(guildId);
    if (cachedGuild) {
      return Effect.succeed({ kind: "found", guild: cachedGuild });
    }

    return discordSdkRead("fetchGuild", () =>
      client.guilds.fetch(guildId),
    ).pipe(
      Effect.map((guild): ResolveGuildResult => ({ kind: "found", guild })),
      Effect.catch((error) => {
        const cause = unwrapSdkFailure(error);
        return Effect.succeed(
          isGuildNotFoundError(cause)
            ? {
                kind: "not_found" as const,
                lastError: "Guild not found by Discord bot",
              }
            : { kind: "failed" as const, cause },
        );
      }),
    );
  };

  const createSyncContext = (
    guild: Guild,
    options?: { excludeChannelId?: string; syncedAt?: string },
  ) =>
    Effect.gen(function* () {
      const syncedAt =
        options?.syncedAt ??
        new Date(yield* Clock.currentTimeMillis).toISOString();
      const botMember =
        guild.members.me ??
        (yield* discordSdkRead("fetchBotMember", () =>
          guild.members.fetchMe(),
        ));
      const fetchedChannels = (yield* discordSdkRead("fetchGuildChannels", () =>
        guild.channels.fetch(undefined, { force: true }),
      )) as unknown as Collection<string, GuildBasedChannel | null>;
      const channels = Array.from(fetchedChannels.values()).filter(
        (channel): channel is SyncableGuildChannel =>
          channel !== null &&
          isSyncableGuildChannel(channel) &&
          channel.id !== options?.excludeChannelId,
      );
      return {
        botMember,
        syncedAt,
        channels,
        channelPermissions: channels.map((channel) =>
          channelPermissionsState(channel, botMember.user.id),
        ),
      } satisfies GuildSyncContext;
    });

  const liveSyncStatus = (
    guild: Guild,
    options?: { status?: DiscordGuildSyncStatus; excludeChannelId?: string },
  ) =>
    createSyncContext(guild, {
      excludeChannelId: options?.excludeChannelId,
    }).pipe(
      Effect.map((context) =>
        syncStateFromContext(guild.id, context, { status: options?.status }),
      ),
    );

  const guildChannelsPayload = (guild: Guild) =>
    createSyncContext(guild).pipe(
      Effect.map(
        (context): DiscordGuildChannelsSyncedEvent => ({
          guildId: guild.id,
          channels: context.channels
            .map((channel) =>
              channelSnapshot(
                channel,
                context.botMember.user.id,
                context.syncedAt,
              ),
            )
            .sort(
              (first, second) =>
                first.position - second.position ||
                first.name.localeCompare(second.name),
            ),
          syncState: syncStateFromContext(guild.id, context),
        }),
      ),
    );

  const loadGuildChannelsPayload = (guildId: string) =>
    Effect.gen(function* () {
      const resolved = yield* resolveGuild(guildId);
      if (resolved.kind === "failed") {
        return yield* Effect.fail(failure("resolveGuild", resolved.cause));
      }
      if (resolved.kind === "not_found") {
        return {
          guildId,
          channels: [],
          syncState: unavailableSyncState(guildId, {
            status: DiscordGuildSyncStatus.NOT_FOUND,
            lastError: resolved.lastError,
          }),
        } satisfies DiscordGuildChannelsSyncedEvent;
      }
      return yield* guildChannelsPayload(resolved.guild).pipe(
        Effect.mapError((cause) => failure("loadGuildChannels", cause)),
      );
    });

  const handleClientReady = (readyClient: Client) =>
    Effect.sync(() => {
      logger.log(
        `Bot is ready and logged in as ${readyClient.user?.username ?? "unknown"}`,
      );
    });

  const handleGuildCreate = (guild: Guild) =>
    Effect.gen(function* () {
      logger.log(
        `handleGuildCreate called for guild ${guild.id} (${guild.name}), owner: ${guild.ownerId}`,
      );
      const roles = yield* discordSdkRead("fetchGuildRoles", () =>
        guild.roles.fetch(),
      );
      yield* publish(RoutingKey.GUILDS_CREATE, {
        guildId: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        ownerId: guild.ownerId,
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          admin: (role.permissions.bitfield & 0x8n) === 0x8n,
          position: role.position,
        })),
      });
    }).pipe(
      Effect.mapError((cause) =>
        cause instanceof DiscordSyncFailure
          ? cause
          : failure("handleGuildCreate", cause),
      ),
    );

  const handleGuildUpdate = (oldGuild: Guild, newGuild: Guild) =>
    Effect.sync(() =>
      logger.log(`Guild ${oldGuild.name} has been updated to ${newGuild.name}`),
    ).pipe(
      Effect.andThen(
        publish(RoutingKey.GUILDS_UPDATE, {
          guildId: newGuild.id,
          name: newGuild.name,
          icon: newGuild.iconURL(),
          ownerId: newGuild.ownerId,
        }),
      ),
    );

  const handleGuildDelete = (guild: Guild) =>
    Effect.gen(function* () {
      logger.log(`Bot has been removed from guild ${guild.name}`);
      yield* publish(RoutingKey.GUILDS_DELETE, { guildId: guild.id });
      const state = unavailableSyncState(guild.id, {
        status: DiscordGuildSyncStatus.NOT_FOUND,
        lastError: "Bot no longer has access to this guild",
      });
      yield* publish(RoutingKey.DISCORD_GUILD_CHANNELS_SYNC_FAILED, {
        guildId: guild.id,
        status: state.status,
        lastAttemptAt:
          state.lastAttemptAt ??
          new Date(yield* Clock.currentTimeMillis).toISOString(),
        lastError: state.lastError ?? "Bot no longer has access to this guild",
      } satisfies DiscordGuildChannelsSyncFailedEvent);
    });

  const publishStaleGuildSyncState = (guild: Guild) =>
    liveSyncStatus(guild, { status: DiscordGuildSyncStatus.STALE }).pipe(
      Effect.mapError((cause) => failure("buildGuildSyncStatus", cause)),
      Effect.flatMap((state) =>
        publish(RoutingKey.DISCORD_GUILD_SYNC_STATE_UPDATED, {
          guildId: guild.id,
          syncState: state,
        } satisfies DiscordGuildSyncStateUpdatedEvent),
      ),
    );

  const rolePayload = (role: Role) => ({
    guildId: role.guild.id,
    id: role.id,
    name: role.name,
    color: role.color,
    position: role.position,
    admin: (role.permissions.bitfield & 0x8n) === 0x8n,
  });

  const handleGuildRoleCreate = (role: Role) =>
    Effect.gen(function* () {
      logger.log(`Role ${role.name} has been created.`);
      yield* publish(RoutingKey.GUILDS_CREATE_ROLE, rolePayload(role));
      yield* publishStaleGuildSyncState(role.guild);
    });

  const handleGuildRoleUpdate = (oldRole: Role, newRole: Role) =>
    Effect.gen(function* () {
      logger.log(`Role ${oldRole.name} has been updated to ${newRole.name}`);
      yield* publish(RoutingKey.GUILDS_UPDATE_ROLE, rolePayload(newRole));
      yield* publishStaleGuildSyncState(newRole.guild);
    });

  const handleGuildRoleDelete = (role: Role) =>
    Effect.gen(function* () {
      logger.log(`Role ${role.name} has been deleted.`);
      yield* publish(RoutingKey.GUILDS_DELETE_ROLE, {
        guildId: role.guild.id,
        id: role.id,
      });
      yield* publishStaleGuildSyncState(role.guild);
    });

  const contextWithChannel = (
    context: GuildSyncContext,
    channel: SyncableGuildChannel,
  ): GuildSyncContext =>
    context.channels.some((item) => item.id === channel.id)
      ? context
      : {
          ...context,
          channels: [...context.channels, channel],
          channelPermissions: [
            ...context.channelPermissions,
            channelPermissionsState(channel, context.botMember.user.id),
          ],
        };

  const snapshotFromContext = (
    channel: SyncableGuildChannel,
    context: GuildSyncContext,
  ) =>
    channelSnapshot(
      context.channels.find((item) => item.id === channel.id) ?? channel,
      context.botMember.user.id,
      context.syncedAt,
    );

  const handleChannelCreate = (channel: GuildBasedChannel) => {
    if (!isSyncableGuildChannel(channel)) return Effect.void;
    return createSyncContext(channel.guild).pipe(
      Effect.mapError((cause) => failure("handleChannelCreate", cause)),
      Effect.flatMap((initialContext) => {
        const context = contextWithChannel(initialContext, channel);
        return publish(RoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED, {
          guildId: channel.guild.id,
          channel: snapshotFromContext(channel, context),
          syncState: syncStateFromContext(channel.guild.id, context),
        } satisfies DiscordGuildChannelUpsertedEvent);
      }),
    );
  };

  const handleChannelUpdate = (
    oldChannel: GuildBasedChannel,
    newChannel: GuildBasedChannel,
  ) => {
    const hadSyncableType = isSyncableGuildChannel(oldChannel);
    const hasSyncableType = isSyncableGuildChannel(newChannel);
    if (hasSyncableType) {
      return createSyncContext(newChannel.guild).pipe(
        Effect.mapError((cause) => failure("handleChannelUpdate", cause)),
        Effect.flatMap((initialContext) => {
          const context = contextWithChannel(initialContext, newChannel);
          return publish(RoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED, {
            guildId: newChannel.guild.id,
            channel: snapshotFromContext(newChannel, context),
            syncState: syncStateFromContext(newChannel.guild.id, context),
          } satisfies DiscordGuildChannelUpsertedEvent);
        }),
      );
    }
    if (!hadSyncableType) return Effect.void;
    return createSyncContext(oldChannel.guild, {
      excludeChannelId: oldChannel.id,
    }).pipe(
      Effect.mapError((cause) => failure("handleChannelUpdate", cause)),
      Effect.flatMap((context) =>
        publish(RoutingKey.DISCORD_GUILD_CHANNEL_DELETED, {
          guildId: oldChannel.guild.id,
          channelId: oldChannel.id,
          syncState: syncStateFromContext(oldChannel.guild.id, context),
        } satisfies DiscordGuildChannelDeletedEvent),
      ),
    );
  };

  const handleChannelDelete = (channel: GuildBasedChannel) => {
    if (!isSyncableGuildChannel(channel)) return Effect.void;
    return createSyncContext(channel.guild, {
      excludeChannelId: channel.id,
    }).pipe(
      Effect.mapError((cause) => failure("handleChannelDelete", cause)),
      Effect.flatMap((context) =>
        publish(RoutingKey.DISCORD_GUILD_CHANNEL_DELETED, {
          guildId: channel.guild.id,
          channelId: channel.id,
          syncState: syncStateFromContext(channel.guild.id, context),
        } satisfies DiscordGuildChannelDeletedEvent),
      ),
    );
  };

  const getGuildSyncStatus = (guildId: string) =>
    Effect.gen(function* () {
      const resolved = yield* resolveGuild(guildId);
      if (resolved.kind === "not_found") {
        return unavailableSyncState(guildId, {
          status: DiscordGuildSyncStatus.NOT_FOUND,
          lastError: resolved.lastError,
        });
      }
      if (resolved.kind === "failed") {
        return yield* Effect.fail(failure("resolveGuild", resolved.cause));
      }
      return yield* liveSyncStatus(resolved.guild).pipe(
        Effect.mapError((cause) => failure("getGuildSyncStatus", cause)),
      );
    });

  const withOperationSpan = <A, E>(
    operationId: string,
    effect: Effect.Effect<A, E>,
  ) =>
    effect.pipe(
      Effect.withSpan(operationId, {
        attributes: { adapter: "discord-sdk", retryCount: 0 },
      }),
    );

  return {
    handleClientReady: (readyClient: Client) =>
      withOperationSpan(
        "DiscordSync_handleClientReady",
        handleClientReady(readyClient),
      ),
    handleGuildCreate: (guild: Guild) =>
      withOperationSpan(
        "DiscordSync_handleGuildCreate",
        handleGuildCreate(guild),
      ),
    handleGuildUpdate: (oldGuild: Guild, newGuild: Guild) =>
      withOperationSpan(
        "DiscordSync_handleGuildUpdate",
        handleGuildUpdate(oldGuild, newGuild),
      ),
    handleGuildDelete: (guild: Guild) =>
      withOperationSpan(
        "DiscordSync_handleGuildDelete",
        handleGuildDelete(guild),
      ),
    handleGuildRoleCreate: (role: Role) =>
      withOperationSpan(
        "DiscordSync_handleGuildRoleCreate",
        handleGuildRoleCreate(role),
      ),
    handleGuildRoleUpdate: (oldRole: Role, newRole: Role) =>
      withOperationSpan(
        "DiscordSync_handleGuildRoleUpdate",
        handleGuildRoleUpdate(oldRole, newRole),
      ),
    handleGuildRoleDelete: (role: Role) =>
      withOperationSpan(
        "DiscordSync_handleGuildRoleDelete",
        handleGuildRoleDelete(role),
      ),
    handleChannelCreate: (channel: GuildBasedChannel) =>
      withOperationSpan(
        "DiscordSync_handleChannelCreate",
        handleChannelCreate(channel),
      ),
    handleChannelUpdate: (
      oldChannel: GuildBasedChannel,
      newChannel: GuildBasedChannel,
    ) =>
      withOperationSpan(
        "DiscordSync_handleChannelUpdate",
        handleChannelUpdate(oldChannel, newChannel),
      ),
    handleChannelDelete: (channel: GuildBasedChannel) =>
      withOperationSpan(
        "DiscordSync_handleChannelDelete",
        handleChannelDelete(channel),
      ),
    getGuildChannels: (guildId: string) =>
      withOperationSpan(
        "DiscordBotGetGuildChannels",
        loadGuildChannelsPayload(guildId),
      ),
    refreshGuildChannels: (guildId: string) =>
      withOperationSpan(
        "DiscordBotRefreshGuildChannels",
        loadGuildChannelsPayload(guildId),
      ),
    getGuildSyncStatus: (guildId: string) =>
      withOperationSpan(
        "DiscordBotGetGuildSyncStatus",
        getGuildSyncStatus(guildId),
      ),
  };
};

export type DiscordSync = ReturnType<typeof makeDiscordSync>;
