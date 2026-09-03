import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import type {
  CreateNotificationTargetDto,
  UpdateNotificationTargetDto,
} from "#src/http-api/contracts/notifications/schemas";
import { Error as NotificationError } from "#src/notifications/error";
import {
  NotificationOwnerType,
  NotificationProvider,
  NotificationTargetType,
} from "#src/notifications/notification-enums";
import type { JsonValue } from "#src/notifications/notification-database.types";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { hasOwnField } from "#src/shared/has-own-field";

export interface NotificationGuildChannels {
  readonly selectable: (guildId: string) => Effect.Effect<
    {
      readonly channels: readonly NotificationGuildChannel[];
      readonly syncState: unknown;
    },
    unknown
  >;
}

interface NotificationGuildChannel {
  readonly channelId: string;
  readonly name: string;
  readonly channelType: string;
  readonly requiredPermissions: readonly string[];
  readonly grantedPermissions: readonly string[];
  readonly missingPermissions: readonly string[];
  readonly hasRequiredPermissions: boolean;
  readonly lastSyncedAt: string | Date;
}

export interface NotificationPendingJobs {
  readonly cancel: (filters: {
    readonly targetId?: number;
    readonly ruleId?: number;
  }) => Effect.Effect<unknown, unknown>;
}

export class NotificationGuildTargetFailure extends TaggedErrorClass<NotificationGuildTargetFailure>()(
  "NotificationGuildTargetFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

const mapTarget = (target: typeof notificationTargetTable.$inferSelect) => ({
  ...target,
  metadata: target.metadata as JsonValue | null,
});

const targetMetadata = (
  channel: Pick<
    NotificationGuildChannel,
    | "channelType"
    | "requiredPermissions"
    | "grantedPermissions"
    | "missingPermissions"
    | "hasRequiredPermissions"
  >,
) => ({
  channelType: channel.channelType,
  requiredPermissions: channel.requiredPermissions,
  grantedPermissions: channel.grantedPermissions,
  missingPermissions: channel.missingPermissions,
  hasRequiredPermissions: channel.hasRequiredPermissions,
});

export const makeNotificationGuildTargets = (
  database: ApiDatabaseValue,
  channels: NotificationGuildChannels,
  jobs: NotificationPendingJobs,
) => {
  const databaseFailure = (operation: string) => (cause: unknown) =>
    new NotificationGuildTargetFailure({ operation, cause });

  const find = (guildId: string, targetId: number) =>
    database
      .select()
      .from(notificationTargetTable)
      .where(
        and(
          eq(notificationTargetTable.id, targetId),
          eq(notificationTargetTable.ownerType, NotificationOwnerType.GUILD),
          eq(notificationTargetTable.ownerId, guildId),
        ),
      )
      .limit(1)
      .pipe(
        Effect.mapError(databaseFailure("notifications.targets.find")),
        Effect.flatMap((rows) =>
          rows[0]
            ? Effect.succeed(rows[0])
            : Effect.fail(
                new ResourceNotFoundError(
                  NotificationError.NOTIFICATION_TARGET_NOT_FOUND,
                ),
              ),
        ),
      );

  const list = Effect.fn("notifications.guildTargets.list")(function* (
    guildId: string,
  ) {
    const rows = yield* database
      .select()
      .from(notificationTargetTable)
      .where(
        and(
          eq(notificationTargetTable.ownerType, NotificationOwnerType.GUILD),
          eq(notificationTargetTable.ownerId, guildId),
        ),
      )
      .orderBy(
        desc(notificationTargetTable.active),
        desc(notificationTargetTable.updatedAt),
      )
      .pipe(Effect.mapError(databaseFailure("notifications.targets.list")));
    return rows.map(mapTarget);
  });

  const create = Effect.fn("notifications.guildTargets.create")(function* (
    guildId: string,
    data: CreateNotificationTargetDto,
  ) {
    if (data.targetType !== NotificationTargetType.CHANNEL) {
      return yield* Effect.fail(
        new InvalidRequestError(
          NotificationError.GUILD_TARGETS_MUST_BE_CHANNELS,
        ),
      );
    }
    if (!data.externalId) {
      return yield* Effect.fail(
        new InvalidRequestError(
          NotificationError.GUILD_CHANNEL_TARGET_REQUIRES_EXTERNAL_ID,
        ),
      );
    }
    const available = yield* channels.selectable(guildId);
    const selected = available.channels.find(
      (channel) => channel.channelId === data.externalId,
    );
    if (!selected) {
      return yield* Effect.fail(
        new InvalidRequestError(
          NotificationError.SELECTED_DISCORD_CHANNEL_NOT_AVAILABLE,
        ),
      );
    }
    const now = new Date(yield* Clock.currentTimeMillis);
    const rows = yield* database
      .insert(notificationTargetTable)
      .values({
        ownerType: NotificationOwnerType.GUILD,
        ownerId: guildId,
        provider: NotificationProvider.DISCORD,
        targetType: NotificationTargetType.CHANNEL,
        externalId: data.externalId,
        displayName: data.displayName ?? selected.name,
        guildName: null,
        metadata: targetMetadata(selected),
        active: true,
        canSend: selected.hasRequiredPermissions,
        lastSyncedAt: new Date(selected.lastSyncedAt),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          notificationTargetTable.ownerType,
          notificationTargetTable.ownerId,
          notificationTargetTable.provider,
          notificationTargetTable.targetType,
          notificationTargetTable.externalId,
        ],
        set: {
          displayName: data.displayName ?? selected.name,
          metadata: targetMetadata(selected),
          active: true,
          canSend: selected.hasRequiredPermissions,
          lastSyncedAt: new Date(selected.lastSyncedAt),
          updatedAt: now,
        },
      })
      .returning()
      .pipe(Effect.mapError(databaseFailure("notifications.targets.create")));
    const target = rows[0];
    if (!target) {
      return yield* Effect.fail(
        new NotificationGuildTargetFailure({
          operation: "notifications.targets.create.returning",
          cause: "Notification target was not returned",
        }),
      );
    }
    return mapTarget(target);
  });

  const update = Effect.fn("notifications.guildTargets.update")(function* (
    guildId: string,
    targetId: number,
    data: UpdateNotificationTargetDto,
  ) {
    yield* find(guildId, targetId);
    const displayName = hasOwnField(data, "displayName")
      ? { displayName: data.displayName ?? null }
      : {};
    const rows = yield* database
      .update(notificationTargetTable)
      .set({
        ...displayName,
        active: data.active,
        updatedAt: new Date(yield* Clock.currentTimeMillis),
      })
      .where(
        and(
          eq(notificationTargetTable.id, targetId),
          eq(notificationTargetTable.ownerType, NotificationOwnerType.GUILD),
          eq(notificationTargetTable.ownerId, guildId),
        ),
      )
      .returning()
      .pipe(Effect.mapError(databaseFailure("notifications.targets.update")));
    if (data.active === false) yield* jobs.cancel({ targetId });
    return rows[0] ? mapTarget(rows[0]) : null;
  });

  const removeById = Effect.fn("notifications.guildTargets.deleteById")(
    function* (targetId: number) {
      const links = yield* database
        .select({ ruleId: notificationRuleTargetTable.ruleId })
        .from(notificationRuleTargetTable)
        .where(eq(notificationRuleTargetTable.targetId, targetId))
        .pipe(
          Effect.mapError(databaseFailure("notifications.targets.ruleLinks")),
        );
      const ruleIds = links.map(({ ruleId }) => ruleId);
      const counts =
        ruleIds.length === 0
          ? []
          : yield* database
              .select({
                ruleId: notificationRuleTargetTable.ruleId,
                value: count(),
              })
              .from(notificationRuleTargetTable)
              .where(inArray(notificationRuleTargetTable.ruleId, ruleIds))
              .groupBy(notificationRuleTargetTable.ruleId)
              .pipe(
                Effect.mapError(
                  databaseFailure("notifications.targets.ruleCounts"),
                ),
              );
      const orphanedRuleIds = counts
        .filter(({ value }) => value === 1)
        .map(({ ruleId }) => ruleId);
      yield* jobs.cancel({ targetId });
      yield* Effect.forEach(
        orphanedRuleIds,
        (ruleId) => jobs.cancel({ ruleId }),
        {
          concurrency: "unbounded",
          discard: true,
        },
      );
      yield* database
        .transaction((transaction) =>
          Effect.gen(function* () {
            yield* transaction
              .delete(notificationTargetTable)
              .where(eq(notificationTargetTable.id, targetId));
            if (orphanedRuleIds.length > 0) {
              yield* transaction
                .delete(notificationRuleTable)
                .where(inArray(notificationRuleTable.id, orphanedRuleIds));
            }
          }),
        )
        .pipe(
          Effect.mapError(databaseFailure("notifications.targets.delete")),
          Effect.withSpan("notifications.targets.delete.transaction", {
            attributes: { adapter: "notifications.drizzle", retryCount: 0 },
          }),
        );
      return { success: true as const };
    },
  );

  const remove = Effect.fn("notifications.guildTargets.delete")(function* (
    guildId: string,
    targetId: number,
  ) {
    yield* find(guildId, targetId);
    return yield* removeById(targetId);
  });

  const removeChannel = Effect.fn("notifications.guildTargets.deleteChannel")(
    function* (guildId: string, channelId: string) {
      const rows = yield* database
        .select({ id: notificationTargetTable.id })
        .from(notificationTargetTable)
        .where(
          and(
            eq(notificationTargetTable.ownerType, NotificationOwnerType.GUILD),
            eq(notificationTargetTable.ownerId, guildId),
            eq(
              notificationTargetTable.targetType,
              NotificationTargetType.CHANNEL,
            ),
            eq(notificationTargetTable.externalId, channelId),
          ),
        )
        .pipe(
          Effect.mapError(
            databaseFailure("notifications.targets.findDeletedChannel"),
          ),
        );
      yield* Effect.forEach(rows, ({ id }) => removeById(id), {
        concurrency: 1,
        discard: true,
      });
    },
  );

  return {
    available: channels.selectable,
    create,
    list,
    remove,
    removeChannel,
    update,
  };
};

export type NotificationGuildTargets = ReturnType<
  typeof makeNotificationGuildTargets
>;
