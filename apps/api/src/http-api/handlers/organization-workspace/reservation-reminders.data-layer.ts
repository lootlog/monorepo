import { RESERVATION_REMINDER_RULE_NAME } from "#src/notifications/rules/reservation-reminder";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
} from "#src/database/drizzle/notification.schema";
import { NotificationJobKind } from "#src/notifications/notification-enums";
import { formatDiscordRelativeTimestamp } from "#src/notifications/content/discord-timestamp";
import { InvalidEntityError } from "#src/shared/http/http-errors";

/** Delivery queue operations a reservation reminder needs. */
export interface ReservationReminderPorts {
  readonly enqueueNotification: (
    notificationJobId: string,
    delayMs: number,
  ) => Effect.Effect<unknown, unknown>;
  readonly removeNotification: (
    notificationJobId: string,
  ) => Effect.Effect<unknown, unknown>;
}

export type ReminderContext = {
  readonly target: {
    readonly id: number;
    readonly externalId: string;
    readonly targetType: "CHANNEL" | "DM";
    readonly active: boolean;
    readonly canSend: boolean;
  };
  readonly scheduledFor: Date;
};

const RESERVATION_SOURCE_ENTITY_TYPE = "reservation";

export const prepareReminder = (
  database: typeof ApiDatabase.Service,
  options: {
    readonly discordId: string;
    readonly startsAt: Date;
    readonly reminderMinutesBefore: number | null;
  },
): Effect.Effect<ReminderContext | null, unknown> =>
  Effect.gen(function* () {
    if (options.reminderMinutesBefore === null) return null;

    const scheduledFor = new Date(
      options.startsAt.getTime() - options.reminderMinutesBefore * 60_000,
    );

    if (scheduledFor.getTime() <= (yield* Clock.currentTimeMillis)) {
      return yield* Effect.fail(
        new InvalidEntityError({ code: "REMINDER_TIME_ELAPSED" }),
      );
    }

    const targets = yield* database
      .select()
      .from(notificationTargetTable)
      .where(
        and(
          eq(notificationTargetTable.ownerType, "USER"),
          eq(notificationTargetTable.ownerId, options.discordId),
          eq(notificationTargetTable.provider, "DISCORD"),
          eq(notificationTargetTable.targetType, "DM"),
          eq(notificationTargetTable.active, true),
          eq(notificationTargetTable.canSend, true),
        ),
      )
      .orderBy(desc(notificationTargetTable.updatedAt))
      .limit(1);

    const target = targets[0];

    if (!target) {
      return yield* Effect.fail(
        new InvalidEntityError({ code: "DM_TARGET_REQUIRED" }),
      );
    }

    return { target, scheduledFor };
  });

const getOrCreateReminderRule = (
  database: typeof ApiDatabase.Service,
  discordId: string,
) =>
  Effect.gen(function* () {
    const existing = yield* database
      .select()
      .from(notificationRuleTable)
      .where(
        and(
          eq(notificationRuleTable.ownerType, "USER"),
          eq(notificationRuleTable.ownerId, discordId),
          eq(notificationRuleTable.name, RESERVATION_REMINDER_RULE_NAME),
        ),
      )
      .limit(1);

    if (existing[0]) return existing[0];

    return yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const targets = yield* transaction
          .select({ id: notificationTargetTable.id })
          .from(notificationTargetTable)
          .where(
            and(
              eq(notificationTargetTable.ownerType, "USER"),
              eq(notificationTargetTable.ownerId, discordId),
              eq(notificationTargetTable.targetType, "DM"),
              eq(notificationTargetTable.active, true),
              eq(notificationTargetTable.canSend, true),
            ),
          )
          .orderBy(desc(notificationTargetTable.updatedAt))
          .limit(1);

        const target = targets[0];

        if (!target) return null;

        const rules = yield* transaction
          .insert(notificationRuleTable)
          .values({
            ownerType: "USER",
            ownerId: discordId,
            triggerType: "SCHEDULED_MESSAGE",
            name: RESERVATION_REMINDER_RULE_NAME,
            scheduleStrategy: "FIXED_DATETIME",
            enabled: true,
            updatedAt: new Date(yield* Clock.currentTimeMillis),
          })
          .returning();

        const rule = rules[0];

        if (!rule) return null;
        yield* transaction
          .insert(notificationRuleTargetTable)
          .values({ ruleId: rule.id, targetId: target.id });

        return rule;
      }),
    );
  });

export const cancelReminder = (
  database: typeof ApiDatabase.Service,
  ports: ReservationReminderPorts,
  reservationId: number,
) =>
  Effect.gen(function* () {
    const jobs = yield* database
      .select({ id: notificationJobTable.id })
      .from(notificationJobTable)
      .where(
        and(
          eq(
            notificationJobTable.sourceEntityType,
            RESERVATION_SOURCE_ENTITY_TYPE,
          ),
          eq(notificationJobTable.sourceEntityId, String(reservationId)),
          inArray(notificationJobTable.status, ["PENDING", "BLOCKED"]),
        ),
      );

    yield* Effect.forEach(jobs, ({ id }) => ports.removeNotification(id), {
      concurrency: "unbounded",
      discard: true,
    });

    if (jobs.length > 0) {
      yield* database
        .update(notificationJobTable)
        .set({
          status: "CANCELED",
          processedAt: new Date(yield* Clock.currentTimeMillis),
          updatedAt: new Date(yield* Clock.currentTimeMillis),
        })
        .where(
          inArray(
            notificationJobTable.id,
            jobs.map(({ id }) => id),
          ),
        );
    }
  });

export const scheduleReminder = (
  database: typeof ApiDatabase.Service,
  ports: ReservationReminderPorts,
  options: {
    readonly context: ReminderContext | null;
    readonly discordId: string;
    readonly reservationId: number;
    readonly spotName: string;
    readonly organizationName: string;
    readonly startsAt: Date;
  },
) =>
  Effect.gen(function* () {
    if (!options.context) return;
    const rule = yield* getOrCreateReminderRule(database, options.discordId);

    if (!rule) {
      return yield* Effect.fail(
        new InvalidEntityError({ code: "DM_TARGET_REQUIRED" }),
      );
    }

    const startsAtDiscord = formatDiscordRelativeTimestamp(options.startsAt);
    const message = `Rezerwacja ${options.spotName} w ${options.organizationName} rozpoczyna się ${startsAtDiscord}.`;

    const idempotencyKey = [
      "scheduled",
      rule.id,
      options.context.target.id,
      RESERVATION_SOURCE_ENTITY_TYPE,
      options.reservationId,
      options.context.scheduledFor.toISOString(),
    ].join(":");

    const values = {
      id: Bun.randomUUIDv7(),
      ruleId: rule.id,
      targetId: options.context.target.id,
      ownerType: rule.ownerType,
      ownerId: rule.ownerId,
      jobKind: NotificationJobKind.SCHEDULED,
      scheduledFor: options.context.scheduledFor,
      status: "PENDING" as const,
      idempotencyKey,
      sourceEntityType: RESERVATION_SOURCE_ENTITY_TYPE,
      sourceEntityId: String(options.reservationId),
      sourceEventId: null,
      payloadSnapshot: {
        title: "Nadchodząca rezerwacja",
        message,
        content: message,
        source: "reservation-reminder",
        reservationId: options.reservationId,
        spotName: options.spotName,
        organizationName: options.organizationName,
        startsAt: options.startsAt.toISOString(),
      },
      blockedReason: null,
      updatedAt: new Date(yield* Clock.currentTimeMillis),
    };

    const inserted = yield* database
      .insert(notificationJobTable)
      .values(values)
      .onConflictDoNothing({ target: notificationJobTable.idempotencyKey })
      .returning();

    let job = inserted[0] ?? null;

    if (!job) {
      const existing = yield* database
        .select()
        .from(notificationJobTable)
        .where(eq(notificationJobTable.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existing[0]?.status === "CANCELED") {
        job = yield* database.transaction((transaction) =>
          Effect.gen(function* () {
            yield* transaction
              .update(notificationJobTable)
              .set({
                idempotencyKey: `${idempotencyKey}:canceled:${randomUUID()}`,
              })
              .where(eq(notificationJobTable.id, existing[0].id));

            const created = yield* transaction
              .insert(notificationJobTable)
              .values(values)
              .returning();

            return created[0] ?? null;
          }),
        );
      }
    }

    if (!job) return;
    yield* ports
      .enqueueNotification(
        job.id,
        Math.max(
          0,
          options.context.scheduledFor.getTime() -
            (yield* Clock.currentTimeMillis),
        ),
      )
      .pipe(
        Effect.tapError(() =>
          cancelReminder(database, ports, options.reservationId),
        ),
      );
  });
