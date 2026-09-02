import { Effect, Schema } from "effect";
import type {
  NotificationJobStore,
  NotificationJobWithRelations,
} from "./notification-job-store.js";
import type { NotificationJobScheduler } from "./notification-job-scheduler.js";
import {
  NotificationJobStatus,
  NotificationOwnerType,
  NotificationProvider,
} from "./notification-enums.js";
import type { JsonObject } from "./notification-database.types.js";

export type NotificationDispatchJob = NotificationJobWithRelations;

export interface NotificationDispatchStore {
  readonly find: (
    jobId: string,
  ) => Effect.Effect<NotificationDispatchJob | null, unknown, never>;
  readonly update: (
    jobId: string,
    values: Parameters<NotificationJobStore["updateJob"]>[1],
  ) => Effect.Effect<unknown, unknown, never>;
  readonly claim: (jobId: string) => Effect.Effect<boolean, unknown, never>;
}

export interface NotificationDispatchPermissions {
  readonly hasRequiredGuildPermissions: (
    guildId: string,
  ) => Effect.Effect<boolean, unknown, never>;
}

export interface NotificationDispatchPublisher {
  readonly publish: (payload: unknown) => Effect.Effect<void, unknown, never>;
}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class NotificationJobDispatchFailure extends Schema.TaggedError<NotificationJobDispatchFailure>()(
  "NotificationJobDispatchFailure",
  { operation: Schema.String, jobId: Schema.String, cause: Schema.Defect() },
) {}

const targetBlockedReason = (target: NotificationDispatchJob["target"]) => {
  if (!target.active) return "Notification target is disabled";
  if (target.canSend) return null;
  const metadata =
    target.metadata && typeof target.metadata === "object"
      ? (target.metadata as JsonObject)
      : null;
  const missingPermissions = Array.isArray(metadata?.missingPermissions)
    ? metadata.missingPermissions.filter(
        (permission): permission is string => typeof permission === "string",
      )
    : [];
  return missingPermissions.length === 0
    ? "Discord channel is missing required permissions"
    : `Discord channel is missing required permissions: ${missingPermissions.join(", ")}`;
};

const errorMessage = (cause: unknown) =>
  cause && typeof cause === "object" && "message" in cause
    ? String(cause.message)
    : String(cause);

export const makeNotificationJobDispatch = (
  store: NotificationDispatchStore,
  permissions: NotificationDispatchPermissions,
  publisher: NotificationDispatchPublisher,
  scheduler: Pick<NotificationJobScheduler, "enqueue">,
  parseAllowedMentions: (value: unknown) => unknown,
) =>
  Effect.fn("notifications.jobs.dispatch")(function* (jobId: string) {
    const job = yield* store.find(jobId);
    if (!job) return;
    const blockedReason = targetBlockedReason(job.target);
    if (blockedReason) {
      yield* store.update(job.id, {
        status: NotificationJobStatus.BLOCKED,
        blockedReason,
        lastError: blockedReason,
      });
      return;
    }
    if (job.ownerType === NotificationOwnerType.GUILD) {
      const permitted = yield* permissions.hasRequiredGuildPermissions(
        job.ownerId,
      );
      if (!permitted) {
        const missingPermissions = "Missing Discord bot permissions";
        yield* store.update(job.id, {
          status: NotificationJobStatus.BLOCKED,
          blockedReason: missingPermissions,
          lastError: missingPermissions,
        });
        return;
      }
    }
    if (!(yield* store.claim(job.id))) return;
    const payload = job.payloadSnapshot as JsonObject | null | undefined;
    const published = yield* publisher
      .publish({
        notificationJobId: job.id,
        provider: NotificationProvider.DISCORD,
        ownerType: job.ownerType,
        ownerId: job.ownerId,
        guildId: job.rule.guildId,
        content:
          typeof payload?.content === "string" ? payload.content : undefined,
        title:
          typeof payload?.title === "string" ? payload.title : "Powiadomienie",
        message:
          typeof payload?.message === "string"
            ? payload.message
            : "Masz nowe powiadomienie",
        allowedMentions: parseAllowedMentions(payload?.allowedMentions),
        metadata: payload && typeof payload === "object" ? payload : undefined,
        target: {
          targetId: String(job.target.id),
          externalId: job.target.externalId,
          targetType: job.target.targetType,
        },
      })
      .pipe(Effect.result);
    if (published._tag === "Success") return;
    const message = errorMessage(published.failure);
    yield* store.update(job.id, {
      status: NotificationJobStatus.PENDING,
      lastError: `AMQP publish failed: ${message}`,
    });
    yield* scheduler.enqueue(
      job.id,
      Math.min(60_000, job.attemptCount * 15_000),
    );
  });
