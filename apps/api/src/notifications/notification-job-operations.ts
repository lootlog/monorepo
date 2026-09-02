import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import {
  BadRequestException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import {
  NotificationFiltersResponseDto,
  NotificationJobPayloadSnapshotResponseDto,
} from "./dto/notification-response.dto.js";
import { Error as NotificationError } from "./enum/error.enum.js";
import type { JsonValue } from "./notification-database.types.js";
import { NOTIFICATIONS_HISTORY_RESPONSE_LIMIT } from "./constants/notifications-history.constant.js";
import {
  NotificationJobStatus,
  NotificationOwnerType,
  type NotificationJobStatus as NotificationJobStatusValue,
  type NotificationOwnerType as NotificationOwnerTypeValue,
} from "./notification-enums.js";

const cancelableStatuses = [
  NotificationJobStatus.PENDING,
  NotificationJobStatus.PROCESSING,
  NotificationJobStatus.BLOCKED,
] as const;
const finalStatuses = [
  NotificationJobStatus.SENT,
  NotificationJobStatus.FAILED,
  NotificationJobStatus.CANCELED,
] as const;

export interface NotificationJobCancellation {
  readonly cancel: (filters: {
    readonly jobId: string;
  }) => Effect.Effect<unknown, unknown>;
}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class NotificationJobOperationFailure extends Schema.TaggedError<NotificationJobOperationFailure>()(
  "NotificationJobOperationFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeNotificationJobOperations = (
  database: ApiDatabaseValue,
  cancellation: NotificationJobCancellation,
) => {
  const databaseFailure = (operation: string) => (cause: unknown) =>
    new NotificationJobOperationFailure({ operation, cause });

  const listByStatuses = (
    ownerType: NotificationOwnerTypeValue,
    ownerId: string,
    statuses: readonly NotificationJobStatusValue[],
    history: boolean,
  ) => {
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
          inArray(notificationJobTable.status, [...statuses]),
        ),
      )
      .orderBy(
        history
          ? desc(notificationJobTable.updatedAt)
          : asc(notificationJobTable.scheduledFor),
      );
    return (
      history ? query.limit(NOTIFICATIONS_HISTORY_RESPONSE_LIMIT) : query
    ).pipe(
      Effect.mapError(databaseFailure("notifications.jobs.list")),
      Effect.map((rows) =>
        rows.map(({ job, rule, target }) => ({
          ...job,
          payloadSnapshot:
            NotificationJobPayloadSnapshotResponseDto.schema.parse(
              job.payloadSnapshot as JsonValue | null,
            ),
          rule: {
            ...rule,
            filters:
              rule.filters === null
                ? null
                : NotificationFiltersResponseDto.schema.parse(rule.filters),
          },
          target: {
            ...target,
            metadata: target.metadata as JsonValue | null,
          },
        })),
      ),
    );
  };

  const list = Effect.fn("notifications.jobs.listOwner")(function* (
    ownerType: NotificationOwnerTypeValue,
    ownerId: string,
  ) {
    const [pending, history] = yield* Effect.all(
      [
        listByStatuses(ownerType, ownerId, cancelableStatuses, false),
        listByStatuses(ownerType, ownerId, finalStatuses, true),
      ],
      { concurrency: 2 },
    );
    return { pending, history };
  });

  const cancelGuild = Effect.fn("notifications.jobs.cancelGuild")(function* (
    guildId: string,
    jobId: string,
  ) {
    const rows = yield* database
      .select({ status: notificationJobTable.status })
      .from(notificationJobTable)
      .where(
        and(
          eq(notificationJobTable.id, jobId),
          eq(notificationJobTable.ownerType, NotificationOwnerType.GUILD),
          eq(notificationJobTable.ownerId, guildId),
        ),
      )
      .limit(1)
      .pipe(Effect.mapError(databaseFailure("notifications.jobs.findGuild")));
    const job = rows[0];
    if (!job) {
      return yield* Effect.fail(
        new NotFoundException(NotificationError.NOTIFICATION_JOB_NOT_FOUND),
      );
    }
    if (!cancelableStatuses.includes(job.status as never)) {
      return yield* Effect.fail(
        new BadRequestException(
          NotificationError.ONLY_PENDING_NOTIFICATION_JOBS_CAN_BE_CANCELED,
        ),
      );
    }
    yield* cancellation.cancel({ jobId });
    return { success: true as const };
  });

  return {
    cancelGuild,
    listGuild: (guildId: string) =>
      list(NotificationOwnerType.GUILD, guildId).pipe(
        Effect.withSpan("notifications.jobs.listGuild"),
      ),
    listUser: (discordId: string) =>
      list(NotificationOwnerType.USER, discordId).pipe(
        Effect.withSpan("notifications.jobs.listUser"),
      ),
  };
};

export type NotificationJobOperations = ReturnType<
  typeof makeNotificationJobOperations
>;
