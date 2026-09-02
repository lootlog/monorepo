import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { notificationJobTable } from "#src/database/drizzle/schema";
import type { JsonValue } from "./notification-database.types.js";
import {
  NotificationJobKind,
  NotificationJobStatus,
  type NotificationOwnerType,
  type NotificationTargetType,
  type NotificationTriggerType,
} from "./notification-enums.js";

export interface NotificationQueue {
  readonly remove: (jobId: string) => Effect.Effect<void, unknown, never>;
  readonly add: (
    jobId: string,
    delay: number,
  ) => Effect.Effect<void, unknown, never>;
}

export interface NotificationJobInput {
  readonly notificationRule: {
    readonly id: number;
    readonly ownerType: NotificationOwnerType;
    readonly ownerId: string;
    readonly guildId: string | null;
    readonly triggerType: NotificationTriggerType;
  };
  readonly target: {
    readonly id: number;
    readonly externalId: string;
    readonly targetType: NotificationTargetType;
    readonly active: boolean;
    readonly canSend: boolean;
  };
  readonly jobKind: NotificationJobKind;
  readonly scheduledFor: Date;
  readonly sourceEntityType?: string;
  readonly sourceEntityId?: string;
  readonly sourceEventId?: string;
  readonly payloadSnapshot: JsonValue;
  readonly forceBlocked?: boolean;
}

export interface NotificationCancellationFilters {
  readonly jobId?: string;
  readonly ruleId?: number;
  readonly targetId?: number;
  readonly sourceEntityType?: string;
  readonly sourceEntityId?: string;
}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class NotificationJobSchedulerFailure extends Schema.TaggedError<NotificationJobSchedulerFailure>()(
  "NotificationJobSchedulerFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const notificationJobIdempotencyKey = (options: NotificationJobInput) =>
  options.jobKind === NotificationJobKind.SCHEDULED
    ? [
        "scheduled",
        options.notificationRule.id,
        options.target.id,
        options.sourceEntityType ?? "unknown",
        options.sourceEntityId ?? "unknown",
        options.scheduledFor.toISOString(),
      ].join(":")
    : [
        options.jobKind === NotificationJobKind.TEST ? "test" : "instant",
        options.notificationRule.id,
        options.target.id,
        options.sourceEventId ?? randomUUID(),
      ].join(":");

export const makeNotificationJobScheduler = (
  database: ApiDatabaseValue,
  queue: NotificationQueue,
) => {
  const failure = (operation: string) => (cause: unknown) =>
    new NotificationJobSchedulerFailure({ operation, cause });

  const cancel = Effect.fn("notifications.scheduler.cancel")(function* (
    filters: NotificationCancellationFilters,
  ) {
    const jobs = yield* database
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
          inArray(notificationJobTable.status, [
            NotificationJobStatus.PENDING,
            NotificationJobStatus.BLOCKED,
          ]),
        ),
      )
      .pipe(Effect.mapError(failure("notifications.scheduler.findCancelable")));
    yield* Effect.forEach(jobs, ({ id }) => queue.remove(id), {
      concurrency: "unbounded",
      discard: true,
    });
    if (jobs.length === 0) return;
    const now = new Date();
    yield* database
      .update(notificationJobTable)
      .set({
        status: NotificationJobStatus.CANCELED,
        processedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          inArray(
            notificationJobTable.id,
            jobs.map(({ id }) => id),
          ),
          inArray(notificationJobTable.status, [
            NotificationJobStatus.PENDING,
            NotificationJobStatus.BLOCKED,
          ]),
        ),
      )
      .pipe(Effect.mapError(failure("notifications.scheduler.cancelRows")));
  });

  const create = Effect.fn("notifications.scheduler.create")(function* (
    options: NotificationJobInput,
  ) {
    const idempotencyKey = notificationJobIdempotencyKey(options);
    const now = new Date();
    const values = {
      id: randomUUID(),
      ruleId: options.notificationRule.id,
      targetId: options.target.id,
      ownerType: options.notificationRule.ownerType,
      ownerId: options.notificationRule.ownerId,
      jobKind: options.jobKind,
      scheduledFor: options.scheduledFor,
      status: options.forceBlocked
        ? NotificationJobStatus.BLOCKED
        : NotificationJobStatus.PENDING,
      idempotencyKey,
      sourceEntityType: options.sourceEntityType ?? null,
      sourceEntityId: options.sourceEntityId ?? null,
      sourceEventId: options.sourceEventId ?? null,
      payloadSnapshot: options.payloadSnapshot,
      blockedReason: options.forceBlocked
        ? "Missing Discord bot permissions or target access"
        : null,
      createdAt: now,
      updatedAt: now,
    } as const;
    const rows = yield* database
      .insert(notificationJobTable)
      .values(values)
      .onConflictDoNothing({ target: notificationJobTable.idempotencyKey })
      .returning()
      .pipe(Effect.mapError(failure("notifications.scheduler.createRow")));
    if (rows[0]) return rows[0];
    const existingRows = yield* database
      .select()
      .from(notificationJobTable)
      .where(eq(notificationJobTable.idempotencyKey, idempotencyKey))
      .limit(1)
      .pipe(Effect.mapError(failure("notifications.scheduler.findExisting")));
    const existing = existingRows[0];
    if (!existing || existing.status !== NotificationJobStatus.CANCELED) {
      return null;
    }
    return yield* database
      .transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction
            .update(notificationJobTable)
            .set({
              idempotencyKey: `${idempotencyKey}:canceled:${randomUUID()}`,
            })
            .where(eq(notificationJobTable.id, existing.id));
          const created = yield* transaction
            .insert(notificationJobTable)
            .values(values)
            .returning();
          return created[0] ?? null;
        }),
      )
      .pipe(
        Effect.mapError(failure("notifications.scheduler.recreateCanceled")),
        Effect.withSpan("notifications.scheduler.create.transaction", {
          attributes: { adapter: "notifications.drizzle", retryCount: 0 },
        }),
      );
  });

  const enqueue = Effect.fn("notifications.scheduler.enqueue")(
    (jobId: string, delay: number) => queue.add(jobId, delay),
  );

  return { cancel, create, enqueue };
};

export type NotificationJobScheduler = ReturnType<
  typeof makeNotificationJobScheduler
>;
