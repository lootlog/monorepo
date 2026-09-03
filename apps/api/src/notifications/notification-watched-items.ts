import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, count, desc, eq, inArray, or } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  itemSnapshotTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
  watchedItemTable,
} from "#src/database/drizzle/schema";
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import type {
  CreateWatchedItemDto,
  CreateWatchedItemQuickAddDto,
} from "#src/http-api/contracts/notifications/schemas";
import {
  NotificationFiltersResponse,
  WatchedItemSnapshotResponse,
} from "./notification-response.schema.js";
import { Error as NotificationError } from "./enum/error.enum.js";
import type { JsonValue } from "./notification-database.types.js";
import {
  NotificationOwnerType,
  NotificationTargetType,
} from "./notification-enums.js";

const WATCHED_ITEM_LIMIT = 20;

export interface NotificationWatchedItemGuilds {
  readonly list: (
    discordId: string,
    userId: string,
  ) => Effect.Effect<
    readonly { readonly id: string; readonly vanityUrl: string | null }[],
    unknown
  >;
}

export interface NotificationWatchedItemJobs {
  readonly cancel: (filters: {
    readonly ruleId: number;
  }) => Effect.Effect<unknown, unknown>;
}

export class NotificationWatchedItemFailure extends TaggedErrorClass<NotificationWatchedItemFailure>()(
  "NotificationWatchedItemFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeNotificationWatchedItems = (
  database: ApiDatabaseValue,
  guilds: NotificationWatchedItemGuilds,
  jobs: NotificationWatchedItemJobs,
) => {
  const databaseFailure = (operation: string) => (cause: unknown) =>
    new NotificationWatchedItemFailure({ operation, cause });

  const targetsForRules = (ruleIds: number[]) =>
    Effect.gen(function* () {
      if (ruleIds.length === 0) return new Map<number, unknown[]>();
      const rows = yield* database
        .select({
          link: notificationRuleTargetTable,
          target: notificationTargetTable,
        })
        .from(notificationRuleTargetTable)
        .innerJoin(
          notificationTargetTable,
          eq(notificationRuleTargetTable.targetId, notificationTargetTable.id),
        )
        .where(inArray(notificationRuleTargetTable.ruleId, ruleIds));
      const result = new Map<number, unknown[]>();
      for (const { link, target } of rows) {
        const values = result.get(link.ruleId) ?? [];
        values.push({
          ...link,
          target: { ...target, metadata: target.metadata as JsonValue | null },
        });
        result.set(link.ruleId, values);
      }
      return result;
    }).pipe(
      Effect.mapError(databaseFailure("notifications.watchedItems.targets")),
    );

  const mapRule = (
    rule: typeof notificationRuleTable.$inferSelect,
    targets: unknown[],
  ) => ({
    ...rule,
    filters:
      rule.filters === null
        ? null
        : Schema.decodeUnknownSync(NotificationFiltersResponse)(rule.filters),
    targets,
  });

  const findByScope = (discordId: string, itemId: number, world: string) =>
    Effect.gen(function* () {
      const rows = yield* database
        .select({ watchedItem: watchedItemTable, rule: notificationRuleTable })
        .from(watchedItemTable)
        .leftJoin(
          notificationRuleTable,
          eq(watchedItemTable.notificationRuleId, notificationRuleTable.id),
        )
        .where(
          and(
            eq(watchedItemTable.userId, discordId),
            eq(watchedItemTable.itemId, itemId),
            eq(watchedItemTable.world, world),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      const targets = row.rule
        ? yield* targetsForRules([row.rule.id])
        : new Map<number, unknown[]>();
      return {
        ...row.watchedItem,
        notificationRule: row.rule
          ? mapRule(row.rule, targets.get(row.rule.id) ?? [])
          : null,
      };
    }).pipe(
      Effect.mapError(databaseFailure("notifications.watchedItems.find")),
    );

  const list = Effect.fn("notifications.watchedItems.list")(function* (
    discordId: string,
  ) {
    const rows = yield* database
      .select({ watchedItem: watchedItemTable, rule: notificationRuleTable })
      .from(watchedItemTable)
      .leftJoin(
        notificationRuleTable,
        eq(watchedItemTable.notificationRuleId, notificationRuleTable.id),
      )
      .where(eq(watchedItemTable.userId, discordId))
      .orderBy(desc(watchedItemTable.updatedAt))
      .pipe(
        Effect.mapError(databaseFailure("notifications.watchedItems.list")),
      );
    const ruleIds = rows.flatMap(({ rule }) => (rule ? [rule.id] : []));
    const targets = yield* targetsForRules(ruleIds);
    const pairs = [
      ...new Map(
        rows.map(({ watchedItem }) => [
          `${watchedItem.itemId}:${watchedItem.itemName}`,
          { itemId: watchedItem.itemId, itemName: watchedItem.itemName },
        ]),
      ).values(),
    ];
    const snapshots =
      pairs.length === 0
        ? []
        : yield* database
            .selectDistinctOn(
              [itemSnapshotTable.itemId, itemSnapshotTable.name],
              {
                itemId: itemSnapshotTable.itemId,
                name: itemSnapshotTable.name,
                icon: itemSnapshotTable.icon,
                rarity: itemSnapshotTable.rarity,
                lvl: itemSnapshotTable.lvl,
                itemType: itemSnapshotTable.itemType,
                statRaw: itemSnapshotTable.statRaw,
              },
            )
            .from(itemSnapshotTable)
            .where(
              or(
                ...pairs.map(({ itemId, itemName }) =>
                  and(
                    eq(itemSnapshotTable.itemId, itemId),
                    eq(itemSnapshotTable.name, itemName),
                  ),
                ),
              ),
            )
            .orderBy(
              itemSnapshotTable.itemId,
              itemSnapshotTable.name,
              desc(itemSnapshotTable.createdAt),
            )
            .pipe(
              Effect.mapError(
                databaseFailure("notifications.watchedItems.snapshots"),
              ),
            );
    const snapshotByKey = new Map(
      snapshots.map((snapshot) => [
        `${snapshot.itemId}:${snapshot.name}`,
        snapshot,
      ]),
    );
    return rows.map(({ watchedItem, rule }) => {
      const snapshot = snapshotByKey.get(
        `${watchedItem.itemId}:${watchedItem.itemName}`,
      );
      return {
        ...watchedItem,
        notificationRule: rule
          ? mapRule(rule, targets.get(rule.id) ?? [])
          : null,
        itemSnapshot: snapshot
          ? Schema.decodeUnknownSync(WatchedItemSnapshotResponse)({
              name: snapshot.name,
              icon: snapshot.icon,
              rarity: snapshot.rarity,
              lvl: snapshot.lvl,
              type: snapshot.itemType,
              stat: snapshot.statRaw,
            })
          : null,
      };
    });
  });

  const resolveGuildIds = Effect.fn("notifications.watchedItems.guilds")(
    function* (discordId: string, userId: string, inputIds: readonly string[]) {
      const uniqueIds = [...new Set(inputIds)];
      if (uniqueIds.length === 0) {
        return yield* Effect.fail(
          new InvalidRequestError(
            NotificationError.AT_LEAST_ONE_GUILD_REQUIRED,
          ),
        );
      }
      const available = yield* guilds.list(discordId, userId);
      const resolved = uniqueIds.map(
        (input) =>
          available.find(
            (guild) => guild.id === input || guild.vanityUrl === input,
          )?.id ?? null,
      );
      if (resolved.some((id) => id === null)) {
        return yield* Effect.fail(
          new InvalidRequestError(
            NotificationError.SELECTED_GUILDS_NOT_AVAILABLE_FOR_AUTHENTICATED_USER,
          ),
        );
      }
      return [...new Set(resolved as string[])].sort();
    },
  );

  const activeTargetIds = (discordId: string) =>
    database
      .select({ id: notificationTargetTable.id })
      .from(notificationTargetTable)
      .where(
        and(
          eq(notificationTargetTable.ownerType, NotificationOwnerType.USER),
          eq(notificationTargetTable.ownerId, discordId),
          eq(notificationTargetTable.targetType, NotificationTargetType.DM),
          eq(notificationTargetTable.active, true),
          eq(notificationTargetTable.canSend, true),
        ),
      )
      .pipe(
        Effect.mapError(
          databaseFailure("notifications.watchedItems.activeTargets"),
        ),
        Effect.map((rows) => rows.map(({ id }) => id)),
      );

  const upsert = Effect.fn("notifications.watchedItems.upsert")(function* (
    discordId: string,
    params: {
      readonly itemId: number;
      readonly itemName: string;
      readonly world: string;
      readonly guildIds: readonly string[];
      readonly mergeGuilds: boolean;
    },
  ) {
    const targetIds = yield* activeTargetIds(discordId);
    if (targetIds.length === 0) {
      return yield* Effect.fail(
        new ResourceConflictError(
          NotificationError.ACTIVE_DISCORD_DM_TARGET_REQUIRED,
        ),
      );
    }
    const existing = yield* findByScope(discordId, params.itemId, params.world);
    const currentFilters =
      existing?.notificationRule?.filters &&
      typeof existing.notificationRule.filters === "object" &&
      !Array.isArray(existing.notificationRule.filters)
        ? existing.notificationRule.filters
        : null;
    const guildIds = params.mergeGuilds
      ? [
          ...new Set([
            ...((currentFilters?.guildIds as string[] | undefined) ?? []),
            ...params.guildIds,
          ]),
        ].sort()
      : [...params.guildIds];
    if (!existing) {
      const rows = yield* database
        .select({ value: count() })
        .from(watchedItemTable)
        .where(eq(watchedItemTable.userId, discordId));
      const currentCount = rows[0]?.value ?? 0;
      if (currentCount >= WATCHED_ITEM_LIMIT) {
        return yield* Effect.fail(
          new ResourceConflictError({
            message: NotificationError.USER_WATCHED_ITEM_LIMIT_REACHED,
            watchedItemLimit: WATCHED_ITEM_LIMIT,
            watchedItemCount: currentCount,
          }),
        );
      }
    }
    yield* database
      .transaction((transaction) =>
        Effect.gen(function* () {
          const now = new Date(yield* Clock.currentTimeMillis);
          let ruleId = existing?.notificationRuleId ?? null;
          if (ruleId === null) {
            const rules = yield* transaction
              .insert(notificationRuleTable)
              .values({
                ownerType: NotificationOwnerType.USER,
                ownerId: discordId,
                triggerType: "WATCHED_ITEM_DROPPED",
                world: params.world,
                filters: { itemId: params.itemId, guildIds },
                enabled: true,
                dedupeWindowSeconds: 0,
                createdAt: now,
                updatedAt: now,
              })
              .returning({ id: notificationRuleTable.id });
            ruleId = rules[0]?.id ?? null;
            if (ruleId === null) return yield* Effect.fail("rule-not-returned");
            yield* transaction
              .insert(watchedItemTable)
              .values({
                userId: discordId,
                itemId: params.itemId,
                itemName: params.itemName,
                world: params.world,
                notificationRuleId: ruleId,
                createdAt: now,
                updatedAt: now,
              })
              .onConflictDoUpdate({
                target: [
                  watchedItemTable.userId,
                  watchedItemTable.itemId,
                  watchedItemTable.world,
                ],
                set: {
                  enabled: true,
                  itemName: params.itemName,
                  notificationRuleId: ruleId,
                  updatedAt: now,
                },
              });
          } else {
            yield* transaction
              .update(watchedItemTable)
              .set({ enabled: true, itemName: params.itemName, updatedAt: now })
              .where(eq(watchedItemTable.id, existing.id));
            yield* transaction
              .update(notificationRuleTable)
              .set({
                enabled: true,
                world: params.world,
                filters: { itemId: params.itemId, guildIds },
                updatedAt: now,
              })
              .where(eq(notificationRuleTable.id, ruleId));
          }
          yield* transaction
            .insert(notificationRuleTargetTable)
            .values(targetIds.map((targetId) => ({ ruleId, targetId })))
            .onConflictDoNothing();
        }),
      )
      .pipe(
        Effect.mapError(databaseFailure("notifications.watchedItems.upsert")),
        Effect.withSpan("notifications.watchedItems.upsert.transaction", {
          attributes: { adapter: "notifications.drizzle", retryCount: 0 },
        }),
      );
    return yield* findByScope(discordId, params.itemId, params.world);
  });

  const create = (
    discordId: string,
    userId: string,
    data: CreateWatchedItemDto,
  ) =>
    Effect.flatMap(
      resolveGuildIds(discordId, userId, data.guildIds),
      (guildIds) =>
        upsert(discordId, { ...data, guildIds, mergeGuilds: false }),
    );

  const quickAdd = (
    discordId: string,
    userId: string,
    data: CreateWatchedItemQuickAddDto,
  ) =>
    Effect.flatMap(
      resolveGuildIds(discordId, userId, [data.guildId]),
      (guildIds) => upsert(discordId, { ...data, guildIds, mergeGuilds: true }),
    );

  const remove = Effect.fn("notifications.watchedItems.delete")(function* (
    discordId: string,
    watchedItemId: number,
  ) {
    const rows = yield* database
      .select()
      .from(watchedItemTable)
      .where(
        and(
          eq(watchedItemTable.id, watchedItemId),
          eq(watchedItemTable.userId, discordId),
        ),
      )
      .limit(1)
      .pipe(
        Effect.mapError(databaseFailure("notifications.watchedItems.findById")),
      );
    const item = rows[0];
    if (!item) {
      return yield* Effect.fail(
        new ResourceNotFoundError(NotificationError.WATCHED_ITEM_NOT_FOUND),
      );
    }
    if (item.notificationRuleId !== null) {
      yield* jobs.cancel({ ruleId: item.notificationRuleId });
    }
    yield* database
      .transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction
            .delete(watchedItemTable)
            .where(eq(watchedItemTable.id, item.id));
          if (item.notificationRuleId !== null) {
            yield* transaction
              .delete(notificationRuleTable)
              .where(eq(notificationRuleTable.id, item.notificationRuleId));
          }
        }),
      )
      .pipe(
        Effect.mapError(databaseFailure("notifications.watchedItems.delete")),
        Effect.withSpan("notifications.watchedItems.delete.transaction", {
          attributes: { adapter: "notifications.drizzle", retryCount: 0 },
        }),
      );
    return { success: true as const };
  });

  return { create, list, quickAdd, remove };
};

export type NotificationWatchedItems = ReturnType<
  typeof makeNotificationWatchedItems
>;
