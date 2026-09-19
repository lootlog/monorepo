import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type {
  CanonicalRabbitEvent,
  CanonicalRabbitEventRoutingKey,
  GuildCreated,
  GuildDeleted,
  GuildRoleChanged,
  GuildRoleDeleted,
  GuildUpdated,
} from "@lootlog/protocol/rabbit/events";
import {
  RabbitExchange,
  RabbitRoutingKey as RoutingKey,
} from "@lootlog/protocol/rabbit/topology";
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
import { Clock, Deferred, Effect, Schema, Semaphore } from "effect";
import {
  ChannelType,
  DiscordAPIError,
  PermissionsBitField,
  type Client,
  type Guild,
  type GuildBasedChannel,
  type GuildMember,
  type Role,
} from "discord.js";
import { AppLogger } from "#src/logger";
import { REQUIRED_NOTIFICATION_PERMISSIONS } from "./required-notification-permissions.js";
import { DiscordSdkReadFailure, discordSdkRead } from "./discord-sdk-read.js";
import type { RabbitPublisher } from "./rabbit-publisher.js";

type ChannelPermissionsState = {
  canView: boolean;
  canSend: boolean;
  hasRequiredPermissions: boolean;
  requiredPermissions: string[];
  grantedPermissions: string[];
  missingPermissions: string[];
};

type SyncableGuildChannel = Extract<
  GuildBasedChannel,
  { type: ChannelType.GuildText | ChannelType.GuildAnnouncement }
>;

type GuildSyncContext = {
  botMember: GuildMember;
  syncedAt: string;
  channels: SyncableGuildChannel[];
  channelPermissions: ChannelPermissionsState[];
};

type ChannelSource = "cache" | "rest";

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

const errorReason = (cause: unknown): string => {
  if (cause instanceof DiscordSdkReadFailure) return errorReason(cause.cause);

  if (cause instanceof DiscordSyncFailure) return cause.reason;

  return cause instanceof Error ? cause.message : String(cause);
};

const failure = (operation: string, cause: unknown) =>
  new DiscordSyncFailure({
    operation:
      cause instanceof DiscordSdkReadFailure
        ? `${operation}:${cause.operation}`
        : operation,
    reason: errorReason(cause),
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

/**
 * The subset of channel state that reaches the synced projection. Discord
 * emits `channelUpdate` for topic, slowmode, NSFW and similar edits that do not
 * change anything Lootlog stores, so those updates are ignored.
 */
const channelProjectionKey = (channel: SyncableGuildChannel) =>
  JSON.stringify({
    type: channel.type,
    name: channel.name,
    parentId: channel.parentId ?? null,
    position: channel.rawPosition,
    overwrites: Array.from(channel.permissionOverwrites.cache.values())
      .map(
        (overwrite) =>
          `${overwrite.id}:${overwrite.type}:${overwrite.allow.bitfield}:${overwrite.deny.bitfield}`,
      )
      .sort(),
  });

const isGuildNotFoundError = (cause: unknown) =>
  cause instanceof DiscordAPIError &&
  [10_004, 50_001].includes(Number(cause.code));

export const makeDiscordSync = (publisher: RabbitPublisher, client: Client) => {
  const logger = new AppLogger("DiscordSync");
  const guildLocks = new Map<string, Semaphore.Semaphore>();

  const inFlightRefreshes = new Map<
    string,
    Deferred.Deferred<DiscordGuildChannelsSyncedEvent, DiscordSyncFailure>
  >();

  /**
   * Gateway events for one Discord guild are processed one at a time so an
   * update and a delete of the same channel cannot publish out of order.
   */
  const withGuildLock =
    (guildId: string) =>
    <A, E>(effect: Effect.Effect<A, E>) =>
      Effect.suspend(() => {
        let lock = guildLocks.get(guildId);

        if (!lock) {
          lock = Semaphore.makeUnsafe(1);
          guildLocks.set(guildId, lock);
        }

        return lock.withPermit(effect);
      });

  const publish = <Key extends CanonicalRabbitEventRoutingKey>(
    routingKey: Key,
    payload: CanonicalRabbitEvent<Key>,
  ) =>
    publisher.publish(RabbitExchange.DEFAULT, routingKey, payload).pipe(
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
        const cause = error.cause;

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

  /**
   * Gateway-driven handlers read `guild.channels.cache`: with the `Guilds`
   * intent discord.js keeps it current from the same events that trigger the
   * handler, so a forced REST refetch only duplicates work and competes with
   * every other handler for the REST queue. Explicit HTTP refreshes still read
   * from REST so a stale cache can be repaired on demand.
   */
  const createSyncContext = (
    guild: Guild,
    options: {
      source: ChannelSource;
      excludeChannelId?: string;
      syncedAt?: string;
    },
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

      const fetchedChannels =
        options.source === "cache"
          ? guild.channels.cache
          : yield* discordSdkRead("fetchGuildChannels", () =>
              guild.channels.fetch(undefined, { force: true }),
            );

      const channels = Array.from(fetchedChannels.values()).filter(
        (channel): channel is SyncableGuildChannel =>
          channel !== null &&
          isSyncableGuildChannel(channel) &&
          channel.id !== options.excludeChannelId,
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
    options: { source: ChannelSource; status?: DiscordGuildSyncStatus },
  ) =>
    createSyncContext(guild, { source: options.source }).pipe(
      Effect.map((context) =>
        syncStateFromContext(guild.id, context, { status: options.status }),
      ),
    );

  const guildChannelsPayload = (guild: Guild) =>
    createSyncContext(guild, { source: "rest" }).pipe(
      Effect.map((context): DiscordGuildChannelsSyncedEvent => ({
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
      })),
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

  /**
   * Concurrent HTTP refreshes of the same guild share one REST round trip.
   * The load runs in a detached fiber so a caller that disconnects only gives
   * up its own wait instead of interrupting the load every other caller
   * shares.
   */
  const coalescedGuildChannelsPayload = (guildId: string) =>
    Effect.gen(function* () {
      const pending = inFlightRefreshes.get(guildId);

      if (pending) return yield* Deferred.await(pending);

      const deferred = yield* Deferred.make<
        DiscordGuildChannelsSyncedEvent,
        DiscordSyncFailure
      >();

      inFlightRefreshes.set(guildId, deferred);

      yield* loadGuildChannelsPayload(guildId).pipe(
        Effect.onExit((exit) => {
          inFlightRefreshes.delete(guildId);

          return Effect.asVoid(Deferred.done(deferred, exit));
        }),
        Effect.forkDetach,
      );

      return yield* Deferred.await(deferred);
    });

  const publishSyncFailed = (guildId: string, cause: DiscordSyncFailure) =>
    Effect.gen(function* () {
      const state = unavailableSyncState(guildId, {
        status: DiscordGuildSyncStatus.STALE,
        lastAttemptAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
        lastError: `${cause.operation}: ${cause.reason}`,
      });

      yield* publish(RoutingKey.DISCORD_GUILD_CHANNELS_SYNC_FAILED, {
        guildId,
        status: state.status,
        lastAttemptAt: state.lastAttemptAt ?? state.updatedAt,
        lastError: state.lastError ?? cause.reason,
      } satisfies DiscordGuildChannelsSyncFailedEvent);
    });

  /**
   * Serializes a gateway-driven channel sync per guild and reports a failed
   * Discord read downstream, so the Organization sees a stale projection
   * instead of silently keeping the previous state as current. A failed
   * publish is not reported again: RabbitMQ is the path that just failed.
   */
  const channelSync = <A>(
    guildId: string,
    effect: Effect.Effect<A, DiscordSyncFailure>,
  ) =>
    withGuildLock(guildId)(
      effect.pipe(
        Effect.tapError((cause) =>
          cause.operation.startsWith("publish:")
            ? Effect.void
            : publishSyncFailed(guildId, cause).pipe(Effect.ignore),
        ),
      ),
    );

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
      } satisfies GuildCreated);
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
        } satisfies GuildUpdated),
      ),
    );

  const handleGuildDelete = (guild: Guild) =>
    Effect.gen(function* () {
      logger.log(`Bot has been removed from guild ${guild.name}`);
      guildLocks.delete(guild.id);
      yield* publish(RoutingKey.GUILDS_DELETE, {
        guildId: guild.id,
      } satisfies GuildDeleted);

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
    liveSyncStatus(guild, {
      source: "cache",
      status: DiscordGuildSyncStatus.STALE,
    }).pipe(
      Effect.mapError((cause) => failure("buildGuildSyncStatus", cause)),
      Effect.flatMap((state) =>
        publish(RoutingKey.DISCORD_GUILD_SYNC_STATE_UPDATED, {
          guildId: guild.id,
          syncState: state,
        } satisfies DiscordGuildSyncStateUpdatedEvent),
      ),
    );

  const rolePayload = (role: Role): GuildRoleChanged => ({
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
      } satisfies GuildRoleDeleted);
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

    return channelSync(
      channel.guild.id,
      createSyncContext(channel.guild, { source: "cache" }).pipe(
        Effect.mapError((cause) => failure("handleChannelCreate", cause)),
        Effect.flatMap((initialContext) => {
          const context = contextWithChannel(initialContext, channel);

          return publish(RoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED, {
            guildId: channel.guild.id,
            channel: snapshotFromContext(channel, context),
            syncState: syncStateFromContext(channel.guild.id, context),
          } satisfies DiscordGuildChannelUpsertedEvent);
        }),
      ),
    );
  };

  const handleChannelUpdate = (
    oldChannel: GuildBasedChannel,
    newChannel: GuildBasedChannel,
  ) => {
    const hadSyncableType = isSyncableGuildChannel(oldChannel);
    const hasSyncableType = isSyncableGuildChannel(newChannel);

    if (hasSyncableType) {
      if (
        hadSyncableType &&
        channelProjectionKey(oldChannel) === channelProjectionKey(newChannel)
      ) {
        return Effect.void;
      }

      return channelSync(
        newChannel.guild.id,
        createSyncContext(newChannel.guild, { source: "cache" }).pipe(
          Effect.mapError((cause) => failure("handleChannelUpdate", cause)),
          Effect.flatMap((initialContext) => {
            const context = contextWithChannel(initialContext, newChannel);

            return publish(RoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED, {
              guildId: newChannel.guild.id,
              channel: snapshotFromContext(newChannel, context),
              syncState: syncStateFromContext(newChannel.guild.id, context),
            } satisfies DiscordGuildChannelUpsertedEvent);
          }),
        ),
      );
    }

    if (!hadSyncableType) return Effect.void;

    return channelSync(
      oldChannel.guild.id,
      createSyncContext(oldChannel.guild, {
        source: "cache",
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
      ),
    );
  };

  const handleChannelDelete = (channel: GuildBasedChannel) => {
    if (!isSyncableGuildChannel(channel)) return Effect.void;

    return channelSync(
      channel.guild.id,
      createSyncContext(channel.guild, {
        source: "cache",
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

      return yield* liveSyncStatus(resolved.guild, { source: "rest" }).pipe(
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
        coalescedGuildChannelsPayload(guildId),
      ),
    refreshGuildChannels: (guildId: string) =>
      withOperationSpan(
        "DiscordBotRefreshGuildChannels",
        coalescedGuildChannelsPayload(guildId),
      ),
    getGuildSyncStatus: (guildId: string) =>
      withOperationSpan(
        "DiscordBotGetGuildSyncStatus",
        getGuildSyncStatus(guildId),
      ),
  };
};

export type DiscordSync = ReturnType<typeof makeDiscordSync>;
