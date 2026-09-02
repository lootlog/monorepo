import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
  timerTable,
} from "#src/database/drizzle/schema";
import type { JsonValue } from "./notification-database.types.js";
import type {
  NotificationJobStatus,
  NotificationOwnerType,
} from "./notification-enums.js";

type WriteDatabase = Pick<
  typeof ApiDatabase.Service,
  "delete" | "insert" | "select" | "update"
>;
type MappedTarget = Omit<
  typeof notificationTargetTable.$inferSelect,
  "metadata"
> & { metadata: JsonValue | null };
type MappedRule = Omit<typeof notificationRuleTable.$inferSelect, "filters"> & {
  filters: JsonValue | null;
};

export class NotificationJobsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  findCancelableJobIds(filters: {
    jobId?: string;
    ruleId?: number;
    targetId?: number;
    sourceEntityType?: string;
    sourceEntityId?: string;
  }) {
    return this.run((database) =>
      database
        .select({ id: notificationJobTable.id })
        .from(notificationJobTable)
        .where(
          and(
            filters.jobId
              ? eq(notificationJobTable.id, filters.jobId)
              : undefined,
            filters.ruleId === undefined
              ? undefined
              : eq(notificationJobTable.ruleId, filters.ruleId),
            filters.targetId === undefined
              ? undefined
              : eq(notificationJobTable.targetId, filters.targetId),
            filters.sourceEntityType
              ? eq(
                  notificationJobTable.sourceEntityType,
                  filters.sourceEntityType,
                )
              : undefined,
            filters.sourceEntityId
              ? eq(notificationJobTable.sourceEntityId, filters.sourceEntityId)
              : undefined,
            inArray(notificationJobTable.status, ["PENDING", "BLOCKED"]),
          ),
        ),
    );
  }

  cancelJobs(ids: string[]) {
    if (ids.length === 0) return Promise.resolve();
    return this.run((database) =>
      database
        .update(notificationJobTable)
        .set({
          status: "CANCELED",
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(notificationJobTable.id, ids),
            inArray(notificationJobTable.status, ["PENDING", "BLOCKED"]),
          ),
        ),
    );
  }

  async createJob(
    values: Omit<typeof notificationJobTable.$inferInsert, "updatedAt"> & {
      updatedAt?: Date;
    },
  ) {
    const now = new Date();
    const insertValues = {
      ...values,
      createdAt: values.createdAt ?? now,
      updatedAt: values.updatedAt ?? now,
    };
    const rows = await this.run((database) =>
      database
        .insert(notificationJobTable)
        .values(insertValues)
        .onConflictDoNothing({ target: notificationJobTable.idempotencyKey })
        .returning(),
    );
    if (rows[0]) return this.mapJob(rows[0]);
    const existing = await this.findJobByIdempotencyKey(values.idempotencyKey);
    if (!existing || existing.status !== "CANCELED") return null;
    return this.transaction((database) =>
      Effect.gen(function* () {
        yield* database
          .update(notificationJobTable)
          .set({
            idempotencyKey: `${values.idempotencyKey}:canceled:${randomUUID()}`,
          })
          .where(eq(notificationJobTable.id, existing.id));
        const created = yield* database
          .insert(notificationJobTable)
          .values(insertValues)
          .returning();
        const job = created[0];
        if (!job) return yield* Effect.die("Notification job was not returned");
        return job;
      }),
    );
  }

  async findJob(jobId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(notificationJobTable)
        .where(eq(notificationJobTable.id, jobId))
        .limit(1),
    );
    return rows[0] ? this.mapJob(rows[0]) : null;
  }

  async findJobWithRelations(jobId: string) {
    const rows = await this.run((database) =>
      database
        .select({
          job: notificationJobTable,
          rule: notificationRuleTable,
          target: notificationTargetTable,
        })
        .from(notificationJobTable)
        .innerJoin(
          notificationRuleTable,
          eq(notificationJobTable.ruleId, notificationRuleTable.id),
        )
        .innerJoin(
          notificationTargetTable,
          eq(notificationJobTable.targetId, notificationTargetTable.id),
        )
        .where(eq(notificationJobTable.id, jobId))
        .limit(1),
    );
    const row = rows[0];
    return row
      ? {
          ...this.mapJob(row.job),
          rule: this.mapRule(row.rule),
          target: this.mapTarget(row.target),
        }
      : null;
  }

  updateJob(
    jobId: string,
    values: Partial<typeof notificationJobTable.$inferInsert>,
  ) {
    return this.run((database) =>
      database
        .update(notificationJobTable)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(notificationJobTable.id, jobId)),
    );
  }

  async claimJob(jobId: string) {
    const rows = await this.run((database) =>
      database
        .update(notificationJobTable)
        .set({
          status: "PROCESSING",
          blockedReason: null,
          attemptCount: sql`${notificationJobTable.attemptCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notificationJobTable.id, jobId),
            inArray(notificationJobTable.status, ["PENDING", "BLOCKED"]),
          ),
        )
        .returning({ id: notificationJobTable.id }),
    );
    return rows.length > 0;
  }

  recordDelivery(options: {
    jobId: string;
    targetId: number;
    job: Partial<typeof notificationJobTable.$inferInsert>;
    target: Partial<typeof notificationTargetTable.$inferInsert>;
    targetFirst?: boolean;
  }) {
    return this.transaction((database) =>
      Effect.gen(function* () {
        const updateTarget = database
          .update(notificationTargetTable)
          .set({ ...options.target, updatedAt: new Date() })
          .where(eq(notificationTargetTable.id, options.targetId));
        const updateJob = database
          .update(notificationJobTable)
          .set({ ...options.job, updatedAt: new Date() })
          .where(eq(notificationJobTable.id, options.jobId));
        if (options.targetFirst ?? true) {
          yield* updateTarget;
          yield* updateJob;
        } else {
          yield* updateJob;
          yield* updateTarget;
        }
      }),
    );
  }

  async findRuleById(
    ruleId: number,
    includeTargets: true,
  ): Promise<
    | (MappedRule & {
        targets: Array<{
          ruleId: number;
          targetId: number;
          createdAt: Date;
          target: MappedTarget;
        }>;
      })
    | null
  >;
  async findRuleById(
    ruleId: number,
    includeTargets?: false,
  ): Promise<MappedRule | null>;
  async findRuleById(ruleId: number, includeTargets = false) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(notificationRuleTable)
        .where(eq(notificationRuleTable.id, ruleId))
        .limit(1),
    );
    const rule = rows[0];
    if (!rule) return null;
    if (!includeTargets) return this.mapRule(rule);
    const targets = await this.targetsByRuleIds([ruleId]);
    return { ...this.mapRule(rule), targets: targets.get(ruleId) ?? [] };
  }

  findTimers(guildId: string, world: string | null) {
    return this.run((database) =>
      database
        .select({
          guildId: timerTable.guildId,
          world: timerTable.world,
          npcId: timerTable.npcId,
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
        ),
    );
  }

  findCycleJobStatuses(ruleId: number, scheduledFor: Date) {
    return this.run((database) =>
      database
        .select({ status: notificationJobTable.status })
        .from(notificationJobTable)
        .where(
          and(
            eq(notificationJobTable.ruleId, ruleId),
            eq(notificationJobTable.scheduledFor, scheduledFor),
            eq(notificationJobTable.sourceEntityType, "scheduled-message"),
          ),
        ),
    );
  }

  async advanceRuleSchedule(ruleId: number, current: Date, next: Date) {
    const rows = await this.run((database) =>
      database
        .update(notificationRuleTable)
        .set({ scheduledAt: next, updatedAt: new Date() })
        .where(
          and(
            eq(notificationRuleTable.id, ruleId),
            eq(notificationRuleTable.scheduledAt, current),
          ),
        )
        .returning({ id: notificationRuleTable.id }),
    );
    return rows.length > 0;
  }

  async listJobsForOwner(
    ownerType: NotificationOwnerType,
    ownerId: string,
    statuses: NotificationJobStatus[],
    options: { history?: boolean; limit?: number; offset?: number } = {},
  ) {
    const rows = await this.run((database) => {
      const query = database
        .select({
          job: notificationJobTable,
          rule: notificationRuleTable,
          target: notificationTargetTable,
        })
        .from(notificationJobTable)
        .innerJoin(
          notificationRuleTable,
          eq(notificationJobTable.ruleId, notificationRuleTable.id),
        )
        .innerJoin(
          notificationTargetTable,
          eq(notificationJobTable.targetId, notificationTargetTable.id),
        )
        .where(
          and(
            eq(notificationJobTable.ownerType, ownerType),
            eq(notificationJobTable.ownerId, ownerId),
            inArray(notificationJobTable.status, statuses),
          ),
        )
        .orderBy(
          options.history
            ? desc(notificationJobTable.updatedAt)
            : asc(notificationJobTable.scheduledFor),
        );
      return options.limit === undefined
        ? query
        : query.limit(options.limit).offset(options.offset ?? 0);
    });
    return rows.map(({ job, rule, target }) => ({
      ...this.mapJob(job),
      rule: this.mapRule(rule),
      target: this.mapTarget(target),
    }));
  }

  async deleteStaleJobs(
    ownerType: NotificationOwnerType,
    ownerId: string,
    statuses: NotificationJobStatus[],
    offset: number,
  ) {
    const stale = await this.run((database) =>
      database
        .select({ id: notificationJobTable.id })
        .from(notificationJobTable)
        .where(
          and(
            eq(notificationJobTable.ownerType, ownerType),
            eq(notificationJobTable.ownerId, ownerId),
            inArray(notificationJobTable.status, statuses),
          ),
        )
        .orderBy(desc(notificationJobTable.updatedAt))
        .offset(offset),
    );
    if (stale.length > 0) {
      await this.run((database) =>
        database.delete(notificationJobTable).where(
          inArray(
            notificationJobTable.id,
            stale.map(({ id }) => id),
          ),
        ),
      );
    }
  }

  async findGuildJob(guildId: string, jobId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(notificationJobTable)
        .where(
          and(
            eq(notificationJobTable.id, jobId),
            eq(notificationJobTable.ownerType, "GUILD"),
            eq(notificationJobTable.ownerId, guildId),
          ),
        )
        .limit(1),
    );
    return rows[0] ? this.mapJob(rows[0]) : null;
  }

  private async findJobByIdempotencyKey(idempotencyKey: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(notificationJobTable)
        .where(eq(notificationJobTable.idempotencyKey, idempotencyKey))
        .limit(1),
    );
    return rows[0] ? this.mapJob(rows[0]) : null;
  }

  private async targetsByRuleIds(ruleIds: number[]) {
    if (ruleIds.length === 0)
      return new Map<
        number,
        Array<{
          ruleId: number;
          targetId: number;
          createdAt: Date;
          target: MappedTarget;
        }>
      >();
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
    const result = new Map<
      number,
      Array<{
        ruleId: number;
        targetId: number;
        createdAt: Date;
        target: MappedTarget;
      }>
    >();
    for (const { link, target } of rows) {
      const entries = result.get(link.ruleId) ?? [];
      entries.push({ ...link, target: this.mapTarget(target) });
      result.set(link.ruleId, entries);
    }
    return result;
  }

  private mapJob(job: typeof notificationJobTable.$inferSelect) {
    return { ...job, payloadSnapshot: job.payloadSnapshot as JsonValue };
  }

  private mapRule(rule: typeof notificationRuleTable.$inferSelect) {
    return { ...rule, filters: rule.filters as JsonValue | null };
  }

  private mapTarget(target: typeof notificationTargetTable.$inferSelect) {
    return { ...target, metadata: target.metadata as JsonValue | null };
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
