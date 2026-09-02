import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import {
  DiscordGuildSyncStatus,
  type DiscordGuildChannelSnapshot,
  type DiscordGuildSyncState,
} from "@lootlog/schema/notifications";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  discordGuildChannelSnapshotTable,
  discordGuildSyncStateTable,
  guildTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";

type SyncFailure = {
  status: DiscordGuildSyncState["status"];
  lastAttemptAt: string;
  lastError: string | null;
};

type WriteDatabase = Pick<
  typeof ApiDatabase.Service,
  "delete" | "insert" | "update"
>;

@Injectable()
export class ChannelsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async guildExists(guildId: string) {
    const rows = await this.run((database) =>
      database
        .select({ id: guildTable.id })
        .from(guildTable)
        .where(eq(guildTable.id, guildId))
        .limit(1),
    );
    return rows.length > 0;
  }

  async loadGuildDiscordState(guildId: string) {
    const [channels, syncStates] = await Promise.all([
      this.run((database) =>
        database
          .select()
          .from(discordGuildChannelSnapshotTable)
          .where(eq(discordGuildChannelSnapshotTable.guildId, guildId))
          .orderBy(
            asc(discordGuildChannelSnapshotTable.position),
            asc(discordGuildChannelSnapshotTable.name),
          ),
      ),
      this.run((database) =>
        database
          .select()
          .from(discordGuildSyncStateTable)
          .where(eq(discordGuildSyncStateTable.guildId, guildId))
          .limit(1),
      ),
    ]);
    return { channels, syncState: syncStates[0] ?? null };
  }

  listChannelIds(guildId: string) {
    return this.run((database) =>
      database
        .select({ channelId: discordGuildChannelSnapshotTable.channelId })
        .from(discordGuildChannelSnapshotTable)
        .where(eq(discordGuildChannelSnapshotTable.guildId, guildId)),
    );
  }

  markGuildSyncStale(guildId: string, lastError: string | null) {
    const now = new Date();
    return this.run((database) =>
      database
        .insert(discordGuildSyncStateTable)
        .values({
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
          lastError,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: discordGuildSyncStateTable.guildId,
          set: {
            status: DiscordGuildSyncStatus.STALE,
            lastError,
            updatedAt: now,
          },
        }),
    );
  }

  upsertSyncState(guildId: string, state: DiscordGuildSyncState) {
    return this.run((database) =>
      this.upsertSyncStateQuery(database, guildId, state),
    );
  }

  upsertFailure(guildId: string, failure: SyncFailure) {
    const now = new Date();
    const lastAttemptAt = new Date(failure.lastAttemptAt);
    return this.run((database) =>
      database
        .insert(discordGuildSyncStateTable)
        .values({
          guildId,
          status: failure.status,
          hasRequiredPermissions: false,
          requiredPermissions: [],
          grantedPermissions: [],
          missingPermissions: [],
          channelCount: 0,
          selectableChannelCount: 0,
          lastAttemptAt,
          lastSuccessAt: null,
          lastError: failure.lastError,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: discordGuildSyncStateTable.guildId,
          set: {
            status: failure.status,
            lastAttemptAt,
            lastError: failure.lastError,
            updatedAt: now,
          },
        }),
    );
  }

  upsertChannel(
    guildId: string,
    channel: DiscordGuildChannelSnapshot,
    syncState: DiscordGuildSyncState,
  ) {
    return this.transaction((transaction) =>
      this.upsertChannelQuery(transaction, guildId, channel).pipe(
        Effect.andThen(() =>
          this.syncNotificationTargetQuery(transaction, guildId, channel),
        ),
        Effect.andThen(() =>
          this.upsertSyncStateQuery(transaction, guildId, syncState),
        ),
      ),
    );
  }

  deleteChannel(
    guildId: string,
    channelId: string,
    syncState: DiscordGuildSyncState,
  ) {
    return this.transaction((transaction) =>
      transaction
        .delete(discordGuildChannelSnapshotTable)
        .where(
          and(
            eq(discordGuildChannelSnapshotTable.guildId, guildId),
            eq(discordGuildChannelSnapshotTable.channelId, channelId),
          ),
        )
        .pipe(
          Effect.andThen(() =>
            this.upsertSyncStateQuery(transaction, guildId, syncState),
          ),
        ),
    );
  }

  reconcile(
    guildId: string,
    channels: ReadonlyArray<DiscordGuildChannelSnapshot>,
    removedChannelIds: ReadonlyArray<string>,
    syncState: DiscordGuildSyncState,
  ) {
    return this.transaction((transaction) => {
      const operations: Array<Effect.Effect<unknown, unknown, never>> = [];
      for (const channel of channels) {
        operations.push(
          this.upsertChannelQuery(transaction, guildId, channel),
          this.syncNotificationTargetQuery(transaction, guildId, channel),
        );
      }
      if (removedChannelIds.length > 0) {
        operations.push(
          transaction
            .delete(discordGuildChannelSnapshotTable)
            .where(
              and(
                eq(discordGuildChannelSnapshotTable.guildId, guildId),
                inArray(discordGuildChannelSnapshotTable.channelId, [
                  ...removedChannelIds,
                ]),
              ),
            ),
        );
      }
      operations.push(
        this.upsertSyncStateQuery(transaction, guildId, syncState),
      );
      return Effect.all(operations, { concurrency: 1, discard: true });
    });
  }

  private upsertChannelQuery(
    database: WriteDatabase,
    guildId: string,
    channel: DiscordGuildChannelSnapshot,
  ) {
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
      requiredPermissions: channel.requiredPermissions,
      grantedPermissions: channel.grantedPermissions,
      missingPermissions: channel.missingPermissions,
      lastSyncedAt: new Date(channel.lastSyncedAt),
      updatedAt: now,
    };
    return database
      .insert(discordGuildChannelSnapshotTable)
      .values({ ...values, createdAt: now })
      .onConflictDoUpdate({
        target: [
          discordGuildChannelSnapshotTable.guildId,
          discordGuildChannelSnapshotTable.channelId,
        ],
        set: values,
      });
  }

  private syncNotificationTargetQuery(
    database: WriteDatabase,
    guildId: string,
    channel: DiscordGuildChannelSnapshot,
  ) {
    return database
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
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationTargetTable.ownerType, "GUILD"),
          eq(notificationTargetTable.ownerId, guildId),
          eq(notificationTargetTable.provider, "DISCORD"),
          eq(notificationTargetTable.targetType, "CHANNEL"),
          eq(notificationTargetTable.externalId, channel.channelId),
        ),
      );
  }

  private upsertSyncStateQuery(
    database: WriteDatabase,
    guildId: string,
    state: DiscordGuildSyncState,
  ) {
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
      requiredPermissions: state.requiredPermissions,
      grantedPermissions: state.grantedPermissions,
      missingPermissions: state.missingPermissions,
      channelCount: state.channelCount,
      selectableChannelCount: state.selectableChannelCount,
      lastAttemptAt,
      lastError: state.lastError,
      ...(state.status === DiscordGuildSyncStatus.SYNCED
        ? { lastSuccessAt }
        : {}),
      updatedAt: now,
    };
    return database
      .insert(discordGuildSyncStateTable)
      .values({
        guildId,
        ...values,
        lastSuccessAt,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: discordGuildSyncStateTable.guildId,
        set: values,
      });
  }

  private transaction<A, E>(
    body: (database: WriteDatabase) => Effect.Effect<A, E, never>,
  ) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) => database.transaction(body)),
    );
  }

  private run<A, E>(
    query: (database: typeof ApiDatabase.Service) => Effect.Effect<A, E, never>,
  ) {
    return this.databaseRuntime.runPromise(Effect.flatMap(ApiDatabase, query));
  }
}
