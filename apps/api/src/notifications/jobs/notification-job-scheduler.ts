import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { notificationJobTable } from "#src/database/drizzle/schema";
import type { JsonObject, JsonValue } from "#src/database/json";
import {
  NotificationJobKind,
  NotificationJobStatus,
  type NotificationOwnerType,
  type NotificationTargetType,
  type NotificationTriggerType,
} from "#src/notifications/notification-enums";

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
  /**
   * When a scheduled occurrence was due, if it was due before it could be
   * planned and `scheduledFor` moved it to now. It keys the job, so planning
   * the same past-due occurrence again cannot send it a second time.
   */
  readonly occurrenceAt?: Date;
  /**
   * Payload fields that identify a past-due occurrence. A sent job of the
   * same rule, target and source whose payload contains them is that
   * occurrence under an earlier key, so it is not created again.
   */
  readonly occurrence?: JsonObject;
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

export class NotificationJobSchedulerFailure extends TaggedErrorClass<NotificationJobSchedulerFailure>()(
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
        (options.occurrenceAt ?? options.scheduledFor).toISOString(),
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
    const now = new Date(yield* Clock.currentTimeMillis);
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

  // A past-due occurrence already sent or being sent under an earlier key,
  // such as one keyed by its moved time before `occurrenceAt` existed.
  const alreadyDelivered = (options: NotificationJobInput) =>
    options.occurrence &&
    options.occurrenceAt &&
    options.occurrenceAt < options.scheduledFor &&
    options.sourceEntityType &&
    options.sourceEntityId
      ? database
          .select({ id: notificationJobTable.id })
          .from(notificationJobTable)
          .where(
            and(
              eq(notificationJobTable.ruleId, options.notificationRule.id),
              eq(notificationJobTable.targetId, options.target.id),
              eq(
                notificationJobTable.sourceEntityType,
                options.sourceEntityType,
              ),
              eq(notificationJobTable.sourceEntityId, options.sourceEntityId),
              // Drizzle has no jsonb containment operator.
              sql`${notificationJobTable.payloadSnapshot} @> ${JSON.stringify(options.occurrence)}::jsonb`,
              inArray(notificationJobTable.status, [
                NotificationJobStatus.SENT,
                NotificationJobStatus.PROCESSING,
              ]),
            ),
          )
          .limit(1)
          .pipe(
            Effect.map((rows) => rows.length > 0),
            Effect.mapError(failure("notifications.scheduler.findDelivered")),
          )
      : Effect.succeed(false);

  const create = Effect.fn("notifications.scheduler.create")(function* (
    options: NotificationJobInput,
  ) {
    if (yield* alreadyDelivered(options)) return null;

    const idempotencyKey = notificationJobIdempotencyKey(options);
    const now = new Date(yield* Clock.currentTimeMillis);

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

    if (options.jobKind === NotificationJobKind.INSTANT && existing) {
      return existing.status === NotificationJobStatus.PENDING
        ? existing
        : null;
    }

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

export const enqueuePendingNotificationJob = (
  scheduler: Pick<NotificationJobScheduler, "enqueue">,
  job: Pick<typeof notificationJobTable.$inferSelect, "id" | "status"> | null,
  scheduledFor: Date,
) =>
  job?.status === NotificationJobStatus.PENDING
    ? scheduler.enqueue(
        job.id,
        Math.max(0, scheduledFor.getTime() - Date.now()),
      )
    : Effect.void;
