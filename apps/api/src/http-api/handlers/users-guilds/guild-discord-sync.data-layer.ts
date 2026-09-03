import { and, asc, eq, inArray } from "drizzle-orm";
import { Clock, Effect } from "effect";
import {
  DiscordGuildSyncStatus,
  type DiscordGuildChannelSnapshot,
  type DiscordGuildSyncState,
} from "@lootlog/schema/notifications";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  discordGuildChannelSnapshotTable,
  discordGuildSyncStateTable,
  guildTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import { RateLimitedError } from "#src/shared/http/http-errors";
import { UsersGuildsOperationError } from "./users-guilds.handlers.js";

type SyncPayload = {
  readonly channels: ReadonlyArray<DiscordGuildChannelSnapshot>;
  readonly syncState: DiscordGuildSyncState;
};

export interface GuildDiscordSyncPorts {
  readonly staleAfterMs: number;
  readonly refresh: (guildId: string) => Effect.Effect<SyncPayload, unknown>;
  readonly publishChannelDeleted: (event: {
    readonly guildId: string;
    readonly channelId: string;
    readonly syncState: DiscordGuildSyncState;
  }) => Effect.Effect<unknown, unknown>;
}

const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

const loadState = (database: typeof ApiDatabase.Service, guildId: string) =>
  database
    .select()
    .from(discordGuildSyncStateTable)
    .where(eq(discordGuildSyncStateTable.guildId, guildId))
    .limit(1)
    .pipe(Effect.map((rows) => rows[0] ?? null));

const guildExists = (database: typeof ApiDatabase.Service, guildId: string) =>
  database
    .select({ id: guildTable.id })
    .from(guildTable)
    .where(eq(guildTable.id, guildId))
    .limit(1)
    .pipe(Effect.map((rows) => rows.length > 0));

const loadChannels = (database: typeof ApiDatabase.Service, guildId: string) =>
  database
    .select()
    .from(discordGuildChannelSnapshotTable)
    .where(eq(discordGuildChannelSnapshotTable.guildId, guildId))
    .orderBy(
      asc(discordGuildChannelSnapshotTable.position),
      asc(discordGuildChannelSnapshotTable.name),
    );

const syncStateWrite = (guildId: string, state: DiscordGuildSyncState) => {
  const now = new Date();
  const lastAttemptAt = state.lastAttemptAt
    ? new Date(state.lastAttemptAt)
    : null;
  const lastSuccessAt = state.lastSuccessAt
    ? new Date(state.lastSuccessAt)
    : lastAttemptAt;
  const values = {
    status: state.status,
    hasRequiredPermissions: state.hasRequiredPermissions,
    requiredPermissions: [...state.requiredPermissions],
    grantedPermissions: [...state.grantedPermissions],
    missingPermissions: [...state.missingPermissions],
    channelCount: state.channelCount,
    selectableChannelCount: state.selectableChannelCount,
    lastAttemptAt,
    lastError: state.lastError,
    ...(state.status === DiscordGuildSyncStatus.SYNCED
      ? { lastSuccessAt }
      : {}),
    updatedAt: now,
  };
  return { now, lastSuccessAt, values, guildId };
};

const reconcile = (
  database: typeof ApiDatabase.Service,
  guildId: string,
  payload: SyncPayload,
) =>
  Effect.gen(function* () {
    const existing = yield* database
      .select({ channelId: discordGuildChannelSnapshotTable.channelId })
      .from(discordGuildChannelSnapshotTable)
      .where(eq(discordGuildChannelSnapshotTable.guildId, guildId));
    const nextIds = new Set(payload.channels.map(({ channelId }) => channelId));
    const removedIds = existing
      .map(({ channelId }) => channelId)
      .filter((channelId) => !nextIds.has(channelId));

    yield* database.transaction((transaction) => {
      const operations: Array<Effect.Effect<unknown, unknown>> = [];
      for (const channel of payload.channels) {
        const now = new Date();
        const values = {
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
          requiredPermissions: [...channel.requiredPermissions],
          grantedPermissions: [...channel.grantedPermissions],
          missingPermissions: [...channel.missingPermissions],
          lastSyncedAt: new Date(channel.lastSyncedAt),
          updatedAt: now,
        };
        operations.push(
          transaction
            .insert(discordGuildChannelSnapshotTable)
            .values({ ...values, createdAt: now })
            .onConflictDoUpdate({
              target: [
                discordGuildChannelSnapshotTable.guildId,
                discordGuildChannelSnapshotTable.channelId,
              ],
              set: values,
            }),
          transaction
            .update(notificationTargetTable)
            .set({
              canSend: channel.hasRequiredPermissions,
              lastSyncedAt: new Date(channel.lastSyncedAt),
              metadata: {
                channelType: channel.channelType,
                requiredPermissions: channel.requiredPermissions,
                grantedPermissions: channel.grantedPermissions,
                missingPermissions: channel.missingPermissions,
                hasRequiredPermissions: channel.hasRequiredPermissions,
              },
              updatedAt: now,
            })
            .where(
              and(
                eq(notificationTargetTable.ownerType, "GUILD"),
                eq(notificationTargetTable.ownerId, guildId),
                eq(notificationTargetTable.provider, "DISCORD"),
                eq(notificationTargetTable.targetType, "CHANNEL"),
                eq(notificationTargetTable.externalId, channel.channelId),
              ),
            ),
        );
      }
      if (removedIds.length > 0) {
        operations.push(
          transaction
            .delete(discordGuildChannelSnapshotTable)
            .where(
              and(
                eq(discordGuildChannelSnapshotTable.guildId, guildId),
                inArray(discordGuildChannelSnapshotTable.channelId, removedIds),
              ),
            ),
        );
      }
      const state = syncStateWrite(guildId, payload.syncState);
      operations.push(
        transaction
          .insert(discordGuildSyncStateTable)
          .values({
            guildId,
            ...state.values,
            lastSuccessAt: state.lastSuccessAt,
            createdAt: state.now,
          })
          .onConflictDoUpdate({
            target: discordGuildSyncStateTable.guildId,
            set: state.values,
          }),
      );
      return Effect.all(operations, { concurrency: 1, discard: true });
    });
    return removedIds;
  });

const recordFailure = (
  database: typeof ApiDatabase.Service,
  guildId: string,
  error: unknown,
) =>
  Effect.gen(function* () {
    const guild = yield* database
      .select({ id: guildTable.id })
      .from(guildTable)
      .where(eq(guildTable.id, guildId))
      .limit(1);
    if (!guild[0]) return;
    const now = new Date(yield* Clock.currentTimeMillis);
    yield* database
      .insert(discordGuildSyncStateTable)
      .values({
        guildId,
        status: DiscordGuildSyncStatus.FAILED,
        hasRequiredPermissions: false,
        requiredPermissions: [],
        grantedPermissions: [],
        missingPermissions: [],
        channelCount: 0,
        selectableChannelCount: 0,
        lastAttemptAt: now,
        lastSuccessAt: null,
        lastError:
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : "Unknown Discord sync error",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: discordGuildSyncStateTable.guildId,
        set: {
          status: DiscordGuildSyncStatus.FAILED,
          lastAttemptAt: now,
          lastError:
            typeof error === "string"
              ? error
              : error instanceof Error
                ? error.message
                : "Unknown Discord sync error",
          updatedAt: now,
        },
      });
  });

export const makeGuildDiscordSyncData = (
  database: typeof ApiDatabase.Service,
  ports: GuildDiscordSyncPorts,
) => {
  const synchronize = Effect.fn("synchronizeGuildDiscord")(function* (
    guildId: string,
  ) {
    const payload = yield* ports
      .refresh(guildId)
      .pipe(
        Effect.tapError((error) => recordFailure(database, guildId, error)),
      );
    const removedIds = yield* reconcile(database, guildId, payload);
    yield* Effect.forEach(
      removedIds,
      (channelId) =>
        ports.publishChannelDeleted({
          guildId,
          channelId,
          syncState: payload.syncState,
        }),
      { concurrency: "unbounded", discard: true },
    );
    return (yield* loadState(database, guildId)) ?? payload.syncState;
  });

  const refresh = Effect.fn("refreshGuildDiscordSync")(function* (
    guildId: string,
  ) {
    const current = yield* loadState(database, guildId);
    if (
      current &&
      (yield* Clock.currentTimeMillis) - current.updatedAt.getTime() <
        REFRESH_COOLDOWN_MS
    ) {
      return yield* Effect.fail(
        new RateLimitedError(
          "Discord sync can only be refreshed once every 5 minutes",
        ),
      );
    }
    return yield* synchronize(guildId);
  });

  const get = Effect.fn("getGuildDiscordSyncStatus")(function* (
    guildId: string,
  ) {
    const current = yield* loadState(database, guildId);
    if (!current) {
      return yield* synchronize(guildId).pipe(
        Effect.catch((error) =>
          loadState(database, guildId).pipe(
            Effect.flatMap((latest) =>
              latest ? Effect.succeed(latest) : Effect.fail(error),
            ),
          ),
        ),
      );
    }
    if (
      current.status === DiscordGuildSyncStatus.NOT_FOUND ||
      current.status === DiscordGuildSyncStatus.FAILED ||
      current.status === DiscordGuildSyncStatus.SYNCING
    ) {
      return current;
    }
    const stale =
      current.status === DiscordGuildSyncStatus.STALE ||
      (yield* Clock.currentTimeMillis) - current.updatedAt.getTime() >
        ports.staleAfterMs;
    return stale
      ? {
          ...current,
          status: DiscordGuildSyncStatus.STALE,
          lastError: current.lastError ?? "Discord sync status is stale",
        }
      : current;
  });

  const mapError = <A>(effect: Effect.Effect<A, unknown>) =>
    effect.pipe(
      Effect.mapError((cause) => new UsersGuildsOperationError({ cause })),
    );
  const handleSynced = Effect.fn("handleGuildChannelsSynced")(function* (
    event: { readonly guildId: string } & SyncPayload,
  ) {
    if (!(yield* guildExists(database, event.guildId))) return;
    const removedIds = yield* reconcile(database, event.guildId, event);
    yield* Effect.forEach(
      removedIds,
      (channelId) =>
        ports.publishChannelDeleted({
          guildId: event.guildId,
          channelId,
          syncState: event.syncState,
        }),
      { concurrency: "unbounded", discard: true },
    );
  });

  const handleUpserted = Effect.fn("handleGuildChannelUpserted")(
    function* (event: {
      readonly guildId: string;
      readonly channel: DiscordGuildChannelSnapshot;
      readonly syncState: DiscordGuildSyncState;
    }) {
      if (!(yield* guildExists(database, event.guildId))) return;
      yield* database.transaction((transaction) =>
        transaction
          .insert(discordGuildChannelSnapshotTable)
          .values({
            guildId: event.guildId,
            channelId: event.channel.channelId,
            name: event.channel.name,
            channelType: event.channel.channelType,
            parentId: event.channel.parentId,
            position: event.channel.position,
            active: event.channel.active,
            canView: event.channel.canView,
            canSend: event.channel.canSend,
            hasRequiredPermissions: event.channel.hasRequiredPermissions,
            requiredPermissions: [...event.channel.requiredPermissions],
            grantedPermissions: [...event.channel.grantedPermissions],
            missingPermissions: [...event.channel.missingPermissions],
            lastSyncedAt: new Date(event.channel.lastSyncedAt),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              discordGuildChannelSnapshotTable.guildId,
              discordGuildChannelSnapshotTable.channelId,
            ],
            set: {
              name: event.channel.name,
              channelType: event.channel.channelType,
              parentId: event.channel.parentId,
              position: event.channel.position,
              active: event.channel.active,
              canView: event.channel.canView,
              canSend: event.channel.canSend,
              hasRequiredPermissions: event.channel.hasRequiredPermissions,
              requiredPermissions: [...event.channel.requiredPermissions],
              grantedPermissions: [...event.channel.grantedPermissions],
              missingPermissions: [...event.channel.missingPermissions],
              lastSyncedAt: new Date(event.channel.lastSyncedAt),
              updatedAt: new Date(),
            },
          })
          .pipe(
            Effect.andThen(() =>
              transaction
                .update(notificationTargetTable)
                .set({
                  canSend: event.channel.hasRequiredPermissions,
                  lastSyncedAt: new Date(event.channel.lastSyncedAt),
                  metadata: {
                    channelType: event.channel.channelType,
                    requiredPermissions: event.channel.requiredPermissions,
                    grantedPermissions: event.channel.grantedPermissions,
                    missingPermissions: event.channel.missingPermissions,
                    hasRequiredPermissions:
                      event.channel.hasRequiredPermissions,
                  },
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(notificationTargetTable.ownerType, "GUILD"),
                    eq(notificationTargetTable.ownerId, event.guildId),
                    eq(notificationTargetTable.provider, "DISCORD"),
                    eq(notificationTargetTable.targetType, "CHANNEL"),
                    eq(
                      notificationTargetTable.externalId,
                      event.channel.channelId,
                    ),
                  ),
                ),
            ),
            Effect.andThen(() => {
              const state = syncStateWrite(event.guildId, event.syncState);
              return transaction
                .insert(discordGuildSyncStateTable)
                .values({
                  guildId: event.guildId,
                  ...state.values,
                  lastSuccessAt: state.lastSuccessAt,
                  createdAt: state.now,
                })
                .onConflictDoUpdate({
                  target: discordGuildSyncStateTable.guildId,
                  set: state.values,
                });
            }),
          ),
      );
    },
  );

  const handleDeleted = Effect.fn("handleGuildChannelDeleted")(
    function* (event: {
      readonly guildId: string;
      readonly channelId: string;
      readonly syncState: DiscordGuildSyncState;
    }) {
      if (!(yield* guildExists(database, event.guildId))) return;
      yield* database.transaction((transaction) => {
        const state = syncStateWrite(event.guildId, event.syncState);
        return transaction
          .delete(discordGuildChannelSnapshotTable)
          .where(
            and(
              eq(discordGuildChannelSnapshotTable.guildId, event.guildId),
              eq(discordGuildChannelSnapshotTable.channelId, event.channelId),
            ),
          )
          .pipe(
            Effect.andThen(() =>
              transaction
                .insert(discordGuildSyncStateTable)
                .values({
                  guildId: event.guildId,
                  ...state.values,
                  lastSuccessAt: state.lastSuccessAt,
                  createdAt: state.now,
                })
                .onConflictDoUpdate({
                  target: discordGuildSyncStateTable.guildId,
                  set: state.values,
                }),
            ),
          );
      });
    },
  );

  const handleStateUpdated = Effect.fn("handleGuildSyncStateUpdated")(
    function* (event: {
      readonly guildId: string;
      readonly syncState: DiscordGuildSyncState;
    }) {
      if (!(yield* guildExists(database, event.guildId))) return;
      const state = syncStateWrite(event.guildId, event.syncState);
      yield* database
        .insert(discordGuildSyncStateTable)
        .values({
          guildId: event.guildId,
          ...state.values,
          lastSuccessAt: state.lastSuccessAt,
          createdAt: state.now,
        })
        .onConflictDoUpdate({
          target: discordGuildSyncStateTable.guildId,
          set: state.values,
        });
    },
  );

  const selectable = Effect.fn("getSelectableGuildChannels")(function* (
    guildId: string,
  ) {
    let syncState = yield* get(guildId);
    if (syncState.status === DiscordGuildSyncStatus.STALE) {
      syncState = yield* synchronize(guildId);
    }
    const channels = yield* loadChannels(database, guildId);
    return {
      channels: channels.filter((channel) => channel.hasRequiredPermissions),
      syncState,
    };
  });

  return {
    getGuildDiscordSyncStatus: (guildId: string) => mapError(get(guildId)),
    refreshGuildDiscordSync: (guildId: string) => mapError(refresh(guildId)),
    getSelectableGuildChannels: selectable,
    hasRequiredGuildPermissions: (guildId: string) =>
      get(guildId).pipe(Effect.map((state) => state.hasRequiredPermissions)),
    handleGuildChannelsSynced: handleSynced,
    handleGuildChannelUpserted: handleUpserted,
    handleGuildChannelDeleted: handleDeleted,
    handleGuildSyncStateUpdated: handleStateUpdated,
    handleGuildChannelsSyncFailed: (event: {
      readonly guildId: string;
      readonly status: DiscordGuildSyncState["status"];
      readonly lastAttemptAt: string;
      readonly lastError: string | null;
    }) => recordFailure(database, event.guildId, event.lastError),
  };
};
