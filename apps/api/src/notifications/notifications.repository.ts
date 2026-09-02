import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  or,
} from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  guildTable,
  itemSnapshotTable,
  memberTable,
  memberToRoleTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
  notificationJobTable,
  roleTable,
  timerTable,
  watchedItemTable,
} from "#src/database/drizzle/schema";
import type { JsonValue } from "./notification-database.types.js";
import type { NotificationOwnerType } from "./notification-enums.js";

type RuleTarget = typeof notificationRuleTargetTable.$inferSelect & {
  target: Omit<typeof notificationTargetTable.$inferSelect, "metadata"> & {
    metadata: JsonValue | null;
  };
};

type RuleInsert = Omit<
  typeof notificationRuleTable.$inferInsert,
  "updatedAt"
> & {
  updatedAt?: Date;
};
type WriteDatabase = Pick<
  typeof ApiDatabase.Service,
  "delete" | "insert" | "select" | "update"
>;

export class NotificationsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findActiveMemberships(ownerIds: string[], guildIds: string[]) {
    if (ownerIds.length === 0 || guildIds.length === 0) return [];
    const memberships = await this.run((database) =>
      database
        .select({ member: memberTable, guildOwnerId: guildTable.ownerId })
        .from(memberTable)
        .innerJoin(guildTable, eq(memberTable.guildId, guildTable.id))
        .where(
          and(
            inArray(memberTable.userId, ownerIds),
            inArray(memberTable.guildId, guildIds),
            eq(memberTable.active, true),
          ),
        ),
    );
    const memberIds = memberships.map(({ member }) => member.id);
    const roleRows =
      memberIds.length === 0
        ? []
        : await this.run((database) =>
            database
              .select({ memberId: memberToRoleTable.A, role: roleTable })
              .from(memberToRoleTable)
              .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
              .where(inArray(memberToRoleTable.A, memberIds)),
          );
    return memberships.map(({ member, guildOwnerId }) => ({
      userId: member.userId,
      guildId: member.guildId,
      guild: { ownerId: guildOwnerId },
      roles: roleRows
        .filter(({ memberId }) => memberId === member.id)
        .map(({ role }) => ({
          id: role.id,
          permissions: role.permissions,
          lvlRangeFrom: role.lvlRangeFrom,
          lvlRangeTo: role.lvlRangeTo,
        })),
    }));
  }

  findTimerRules(guildId: string, world: string) {
    return this.run((database) =>
      database
        .select()
        .from(notificationRuleTable)
        .where(
          and(
            eq(notificationRuleTable.ownerType, "GUILD"),
            eq(notificationRuleTable.ownerId, guildId),
            eq(notificationRuleTable.guildId, guildId),
            eq(notificationRuleTable.enabled, true),
            eq(notificationRuleTable.triggerType, "TIMER_BEFORE_SPAWN"),
            or(
              isNull(notificationRuleTable.world),
              eq(notificationRuleTable.world, world),
            ),
          ),
        ),
    );
  }

  async listRules(ownerType: NotificationOwnerType, ownerId: string) {
    const rules = await this.run((database) =>
      database
        .select()
        .from(notificationRuleTable)
        .where(
          and(
            eq(notificationRuleTable.ownerType, ownerType),
            eq(notificationRuleTable.ownerId, ownerId),
          ),
        )
        .orderBy(
          desc(notificationRuleTable.enabled),
          desc(notificationRuleTable.updatedAt),
        ),
    );
    const targets = await this.targetsByRuleIds(rules.map(({ id }) => id));
    return rules.map((rule) => ({
      ...this.mapRule(rule),
      targets: targets.get(rule.id) ?? [],
    }));
  }

  async findRuleWithTargets(
    ownerType: NotificationOwnerType,
    ownerId: string,
    ruleId: number,
  ) {
    const rule = await this.findRule(ownerType, ownerId, ruleId);
    if (!rule) return null;
    const targets = await this.targetsByRuleIds([ruleId]);
    return { ...this.mapRule(rule), targets: targets.get(ruleId) ?? [] };
  }

  createRule(values: RuleInsert, targetIds: number[]) {
    return this.transaction((database) =>
      Effect.gen(function* () {
        const now = new Date();
        const rows = yield* database
          .insert(notificationRuleTable)
          .values({
            ...values,
            createdAt: values.createdAt ?? now,
            updatedAt: now,
          })
          .returning();
        const rule = rows[0];
        if (!rule)
          return yield* Effect.die("Notification rule was not returned");
        if (targetIds.length > 0) {
          yield* database
            .insert(notificationRuleTargetTable)
            .values(
              targetIds.map((targetId) => ({ ruleId: rule.id, targetId })),
            )
            .onConflictDoNothing();
        }
        return rule;
      }),
    );
  }

  updateRule(
    ruleId: number,
    values: Partial<typeof notificationRuleTable.$inferInsert>,
    targetIds: number[] | null,
  ) {
    return this.transaction((database) =>
      Effect.gen(function* () {
        yield* database
          .update(notificationRuleTable)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(notificationRuleTable.id, ruleId));
        if (targetIds) {
          yield* database
            .delete(notificationRuleTargetTable)
            .where(eq(notificationRuleTargetTable.ruleId, ruleId));
          if (targetIds.length > 0) {
            yield* database
              .insert(notificationRuleTargetTable)
              .values(targetIds.map((targetId) => ({ ruleId, targetId })))
              .onConflictDoNothing();
          }
        }
      }),
    );
  }

  deleteRule(ruleId: number) {
    return this.run((database) =>
      database
        .delete(notificationRuleTable)
        .where(eq(notificationRuleTable.id, ruleId)),
    );
  }

  async findRule(
    ownerType: NotificationOwnerType,
    ownerId: string,
    ruleId: number,
  ) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(notificationRuleTable)
        .where(
          and(
            eq(notificationRuleTable.id, ruleId),
            eq(notificationRuleTable.ownerType, ownerType),
            eq(notificationRuleTable.ownerId, ownerId),
          ),
        )
        .limit(1),
    );
    const rule = rows[0];
    return rule ? this.mapRule(rule) : null;
  }

  async getRuleLimit(ownerType: NotificationOwnerType, ownerId: string) {
    const [ruleCounts, guilds] = await Promise.all([
      this.run((database) =>
        database
          .select({ value: count() })
          .from(notificationRuleTable)
          .where(
            and(
              eq(notificationRuleTable.ownerType, ownerType),
              eq(notificationRuleTable.ownerId, ownerId),
            ),
          ),
      ),
      ownerType === "GUILD"
        ? this.run((database) =>
            database
              .select({
                notificationRuleLimit: guildTable.notificationRuleLimit,
              })
              .from(guildTable)
              .where(eq(guildTable.id, ownerId))
              .limit(1),
          )
        : Promise.resolve([]),
    ]);
    return {
      count: ruleCounts[0]?.value ?? 0,
      guild: guilds[0] ?? null,
    };
  }

  async findWatchedItemsForLoot(itemIds: number[], world: string) {
    if (itemIds.length === 0) return [];
    const rows = await this.run((database) =>
      database
        .select({ watchedItem: watchedItemTable, rule: notificationRuleTable })
        .from(watchedItemTable)
        .innerJoin(
          notificationRuleTable,
          eq(watchedItemTable.notificationRuleId, notificationRuleTable.id),
        )
        .where(
          and(
            eq(watchedItemTable.enabled, true),
            inArray(watchedItemTable.itemId, itemIds),
            eq(watchedItemTable.world, world),
            eq(notificationRuleTable.enabled, true),
            eq(notificationRuleTable.triggerType, "WATCHED_ITEM_DROPPED"),
            eq(notificationRuleTable.world, world),
          ),
        ),
    );
    const targetsByRule = await this.targetsByRuleIds(
      rows.map(({ rule }) => rule.id),
    );
    return rows
      .filter(({ rule }) => (targetsByRule.get(rule.id)?.length ?? 0) > 0)
      .map(({ watchedItem, rule }) => ({
        ...watchedItem,
        notificationRule: {
          ...rule,
          targets: targetsByRule.get(rule.id) ?? [],
        },
      }));
  }

  async listWatchedItems(userId: string) {
    const rows = await this.run((database) =>
      database
        .select({ watchedItem: watchedItemTable, rule: notificationRuleTable })
        .from(watchedItemTable)
        .leftJoin(
          notificationRuleTable,
          eq(watchedItemTable.notificationRuleId, notificationRuleTable.id),
        )
        .where(eq(watchedItemTable.userId, userId))
        .orderBy(desc(watchedItemTable.updatedAt)),
    );
    const ruleIds = rows.flatMap(({ rule }) => (rule ? [rule.id] : []));
    const targets = await this.targetsByRuleIds(ruleIds);
    return rows.map(({ watchedItem, rule }) => ({
      ...watchedItem,
      notificationRule: rule
        ? { ...this.mapRule(rule), targets: targets.get(rule.id) ?? [] }
        : null,
    }));
  }

  findLatestItemSnapshots(pairs: Array<{ itemId: number; itemName: string }>) {
    if (pairs.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .selectDistinctOn([itemSnapshotTable.itemId, itemSnapshotTable.name], {
          itemId: itemSnapshotTable.itemId,
          name: itemSnapshotTable.name,
          icon: itemSnapshotTable.icon,
          rarity: itemSnapshotTable.rarity,
          lvl: itemSnapshotTable.lvl,
          itemType: itemSnapshotTable.itemType,
          statRaw: itemSnapshotTable.statRaw,
        })
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
        ),
    );
  }

  async findWatchedItem(userId: string, itemId: number, world: string) {
    const rows = await this.run((database) =>
      database
        .select({ watchedItem: watchedItemTable, rule: notificationRuleTable })
        .from(watchedItemTable)
        .leftJoin(
          notificationRuleTable,
          eq(watchedItemTable.notificationRuleId, notificationRuleTable.id),
        )
        .where(
          and(
            eq(watchedItemTable.userId, userId),
            eq(watchedItemTable.itemId, itemId),
            eq(watchedItemTable.world, world),
          ),
        )
        .limit(1),
    );
    const row = rows[0];
    if (!row) return null;
    const targets = row.rule
      ? await this.targetsByRuleIds([row.rule.id])
      : new Map();
    return {
      ...row.watchedItem,
      notificationRule: row.rule
        ? { ...this.mapRule(row.rule), targets: targets.get(row.rule.id) ?? [] }
        : null,
    };
  }

  updateWatchedItem(options: {
    watchedItemId: number;
    ruleId: number;
    itemId: number;
    itemName: string;
    world: string;
    guildIds: string[];
    targetIds: number[];
  }) {
    return this.transaction((database) =>
      Effect.gen(function* () {
        yield* database
          .update(watchedItemTable)
          .set({
            enabled: true,
            itemName: options.itemName,
            updatedAt: new Date(),
          })
          .where(eq(watchedItemTable.id, options.watchedItemId));
        yield* database
          .update(notificationRuleTable)
          .set({
            enabled: true,
            world: options.world,
            filters: { itemId: options.itemId, guildIds: options.guildIds },
            updatedAt: new Date(),
          })
          .where(eq(notificationRuleTable.id, options.ruleId));
        if (options.targetIds.length > 0) {
          yield* database
            .insert(notificationRuleTargetTable)
            .values(
              options.targetIds.map((targetId) => ({
                ruleId: options.ruleId,
                targetId,
              })),
            )
            .onConflictDoNothing();
        }
      }),
    );
  }

  createWatchedItem(options: {
    userId: string;
    itemId: number;
    itemName: string;
    world: string;
    guildIds: string[];
    targetIds: number[];
  }) {
    return this.transaction((database) =>
      Effect.gen(function* () {
        const now = new Date();
        const rules = yield* database
          .insert(notificationRuleTable)
          .values({
            ownerType: "USER",
            ownerId: options.userId,
            triggerType: "WATCHED_ITEM_DROPPED",
            world: options.world,
            filters: { itemId: options.itemId, guildIds: options.guildIds },
            enabled: true,
            dedupeWindowSeconds: 0,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        const rule = rules[0];
        if (!rule)
          return yield* Effect.die("Notification rule was not returned");
        if (options.targetIds.length > 0) {
          yield* database
            .insert(notificationRuleTargetTable)
            .values(
              options.targetIds.map((targetId) => ({
                ruleId: rule.id,
                targetId,
              })),
            )
            .onConflictDoNothing();
        }
        const watchedItems = yield* database
          .insert(watchedItemTable)
          .values({
            userId: options.userId,
            itemId: options.itemId,
            itemName: options.itemName,
            world: options.world,
            notificationRuleId: rule.id,
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
              itemName: options.itemName,
              notificationRuleId: rule.id,
              updatedAt: now,
            },
          })
          .returning();
        const watchedItem = watchedItems[0];
        if (!watchedItem)
          return yield* Effect.die("Watched item was not returned");
        return { ...watchedItem, notificationRule: { ...rule, targets: [] } };
      }),
    );
  }

  async findWatchedItemById(userId: string, watchedItemId: number) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(watchedItemTable)
        .where(
          and(
            eq(watchedItemTable.id, watchedItemId),
            eq(watchedItemTable.userId, userId),
          ),
        )
        .limit(1),
    );
    return rows[0] ?? null;
  }

  deleteWatchedItem(watchedItemId: number, ruleId: number | null) {
    return this.transaction((database) =>
      Effect.gen(function* () {
        yield* database
          .delete(watchedItemTable)
          .where(eq(watchedItemTable.id, watchedItemId));
        if (ruleId !== null) {
          yield* database
            .delete(notificationRuleTable)
            .where(eq(notificationRuleTable.id, ruleId));
        }
      }),
    );
  }

  async countWatchedItems(userId: string) {
    const rows = await this.run((database) =>
      database
        .select({ value: count() })
        .from(watchedItemTable)
        .where(eq(watchedItemTable.userId, userId)),
    );
    return rows[0]?.value ?? 0;
  }

  findTimersForRule(guildId: string, world: string | null) {
    return this.run((database) =>
      database
        .select({
          npcId: timerTable.npcId,
          world: timerTable.world,
          timerKey: timerTable.timerKey,
          minSpawnTime: timerTable.minSpawnTime,
          maxSpawnTime: timerTable.maxSpawnTime,
          npc: timerTable.npc,
        })
        .from(timerTable)
        .where(
          and(
            eq(timerTable.guildId, guildId),
            isNull(timerTable.deletedAt),
            world ? eq(timerTable.world, world) : undefined,
          ),
        )
        .orderBy(asc(timerTable.minSpawnTime))
        .limit(50),
    );
  }

  async listTargets(ownerType: NotificationOwnerType, ownerId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(notificationTargetTable)
        .where(
          and(
            eq(notificationTargetTable.ownerType, ownerType),
            eq(notificationTargetTable.ownerId, ownerId),
          ),
        )
        .orderBy(
          desc(notificationTargetTable.active),
          desc(notificationTargetTable.updatedAt),
        ),
    );
    return rows.map((target) => this.mapTarget(target));
  }

  async upsertTarget(
    values: Omit<typeof notificationTargetTable.$inferInsert, "updatedAt"> & {
      updatedAt?: Date;
    },
  ) {
    const now = new Date();
    const rows = await this.run((database) =>
      database
        .insert(notificationTargetTable)
        .values({
          ...values,
          createdAt: values.createdAt ?? now,
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
            displayName: values.displayName,
            metadata: values.metadata,
            active: values.active,
            canSend: values.canSend,
            lastSyncedAt: values.lastSyncedAt,
            updatedAt: now,
          },
        })
        .returning(),
    );
    const target = rows[0];
    if (!target) throw new Error("Notification target was not returned");
    return this.mapTarget(target);
  }

  async updateTarget(
    targetId: number,
    values: Partial<typeof notificationTargetTable.$inferInsert>,
  ) {
    const rows = await this.run((database) =>
      database
        .update(notificationTargetTable)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(notificationTargetTable.id, targetId))
        .returning(),
    );
    const target = rows[0];
    return target ? this.mapTarget(target) : null;
  }

  async findTarget(
    ownerType: NotificationOwnerType,
    ownerId: string,
    targetId: number,
  ) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(notificationTargetTable)
        .where(
          and(
            eq(notificationTargetTable.id, targetId),
            eq(notificationTargetTable.ownerType, ownerType),
            eq(notificationTargetTable.ownerId, ownerId),
          ),
        )
        .limit(1),
    );
    const target = rows[0];
    return target ? this.mapTarget(target) : null;
  }

  findTargetIds(options: {
    ownerType: NotificationOwnerType;
    ownerId: string;
    ids?: number[];
    active?: boolean;
    canSend?: boolean;
    externalId?: string;
    targetType?: "CHANNEL" | "DM";
  }) {
    return this.run((database) =>
      database
        .select({ id: notificationTargetTable.id })
        .from(notificationTargetTable)
        .where(
          and(
            eq(notificationTargetTable.ownerType, options.ownerType),
            eq(notificationTargetTable.ownerId, options.ownerId),
            options.ids
              ? inArray(notificationTargetTable.id, options.ids)
              : undefined,
            options.active === undefined
              ? undefined
              : eq(notificationTargetTable.active, options.active),
            options.canSend === undefined
              ? undefined
              : eq(notificationTargetTable.canSend, options.canSend),
            options.externalId
              ? eq(notificationTargetTable.externalId, options.externalId)
              : undefined,
            options.targetType
              ? eq(notificationTargetTable.targetType, options.targetType)
              : undefined,
          ),
        ),
    );
  }

  async findSingleTargetRuleIds(targetId: number) {
    const links = await this.run((database) =>
      database
        .select({ ruleId: notificationRuleTargetTable.ruleId })
        .from(notificationRuleTargetTable)
        .where(eq(notificationRuleTargetTable.targetId, targetId)),
    );
    if (links.length === 0) return [];
    const counts = await this.run((database) =>
      database
        .select({ ruleId: notificationRuleTargetTable.ruleId, value: count() })
        .from(notificationRuleTargetTable)
        .where(
          inArray(
            notificationRuleTargetTable.ruleId,
            links.map(({ ruleId }) => ruleId),
          ),
        )
        .groupBy(notificationRuleTargetTable.ruleId),
    );
    return counts
      .filter(({ value }) => value === 1)
      .map(({ ruleId }) => ruleId);
  }

  async deleteTargetAndRules(targetId: number, ruleIds: number[]) {
    await this.run((database) =>
      database
        .delete(notificationTargetTable)
        .where(eq(notificationTargetTable.id, targetId)),
    );
    if (ruleIds.length > 0) {
      await this.run((database) =>
        database
          .delete(notificationRuleTable)
          .where(inArray(notificationRuleTable.id, ruleIds)),
      );
    }
  }

  async getOrCreateUserDmTestRule(
    discordId: string,
    targetId: number,
    name: string,
  ) {
    const existing = await this.run((database) =>
      database
        .select()
        .from(notificationRuleTable)
        .where(
          and(
            eq(notificationRuleTable.ownerType, "USER"),
            eq(notificationRuleTable.ownerId, discordId),
            eq(notificationRuleTable.triggerType, "SCHEDULED_MESSAGE"),
            eq(notificationRuleTable.name, name),
          ),
        )
        .limit(1),
    );
    let rule = existing[0];
    if (!rule) {
      const now = new Date();
      const rows = await this.run((database) =>
        database
          .insert(notificationRuleTable)
          .values({
            ownerType: "USER",
            ownerId: discordId,
            triggerType: "SCHEDULED_MESSAGE",
            name,
            filters: null,
            scheduleStrategy: "FIXED_DATETIME",
            scheduleIntervalType: "ONCE",
            enabled: false,
            dedupeWindowSeconds: 0,
            createdAt: now,
            updatedAt: now,
          })
          .returning(),
      );
      rule = rows[0];
    }
    if (!rule) throw new Error("Notification rule was not returned");
    await this.attachTargets(rule.id, [targetId]);
    return rule;
  }

  async attachUserTargetToWatchedItemRules(
    discordId: string,
    targetId: number,
  ) {
    const rows = await this.run((database) =>
      database
        .select({ ruleId: watchedItemTable.notificationRuleId })
        .from(watchedItemTable)
        .where(
          and(
            eq(watchedItemTable.userId, discordId),
            isNotNull(watchedItemTable.notificationRuleId),
          ),
        ),
    );
    await this.attachTargetToRules(
      targetId,
      rows.flatMap(({ ruleId }) => (ruleId === null ? [] : [ruleId])),
    );
  }

  findRecentTestJobs(targetIds: number[], threshold: Date) {
    if (targetIds.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .select({
          targetId: notificationJobTable.targetId,
          createdAt: notificationJobTable.createdAt,
        })
        .from(notificationJobTable)
        .where(
          and(
            inArray(notificationJobTable.targetId, targetIds),
            eq(notificationJobTable.jobKind, "TEST"),
            gte(notificationJobTable.createdAt, threshold),
          ),
        )
        .orderBy(asc(notificationJobTable.createdAt)),
    );
  }

  private attachTargets(ruleId: number, targetIds: number[]) {
    if (targetIds.length === 0) return Promise.resolve();
    return this.run((database) =>
      database
        .insert(notificationRuleTargetTable)
        .values(targetIds.map((targetId) => ({ ruleId, targetId })))
        .onConflictDoNothing(),
    );
  }

  private attachTargetToRules(targetId: number, ruleIds: number[]) {
    if (ruleIds.length === 0) return Promise.resolve();
    return this.run((database) =>
      database
        .insert(notificationRuleTargetTable)
        .values(ruleIds.map((ruleId) => ({ ruleId, targetId })))
        .onConflictDoNothing(),
    );
  }

  private async targetsByRuleIds(ruleIds: number[]) {
    if (ruleIds.length === 0) return new Map<number, RuleTarget[]>();
    const rows = await this.run((database) =>
      database
        .select({
          link: notificationRuleTargetTable,
          target: notificationTargetTable,
        })
        .from(notificationRuleTargetTable)
        .innerJoin(
          notificationTargetTable,
          eq(notificationRuleTargetTable.targetId, notificationTargetTable.id),
        )
        .where(inArray(notificationRuleTargetTable.ruleId, ruleIds)),
    );
    const result = new Map<number, RuleTarget[]>();
    for (const { link, target } of rows) {
      const targets = result.get(link.ruleId) ?? [];
      targets.push({ ...link, target: this.mapTarget(target) });
      result.set(link.ruleId, targets);
    }
    return result;
  }

  private mapTarget(target: typeof notificationTargetTable.$inferSelect) {
    return {
      ...target,
      metadata: target.metadata as JsonValue | null,
    };
  }

  private mapRule(rule: typeof notificationRuleTable.$inferSelect) {
    return { ...rule, filters: rule.filters as JsonValue | null };
  }

  private run<A, E>(
    query: (database: typeof ApiDatabase.Service) => Effect.Effect<A, E, never>,
  ) {
    return this.databaseRuntime.runPromise(Effect.flatMap(ApiDatabase, query));
  }

  private transaction<A, E>(
    query: (database: WriteDatabase) => Effect.Effect<A, E, never>,
  ) {
    return this.run((database) => database.transaction(query));
  }
}
