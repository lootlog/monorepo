import { isObjectRecord } from "@lootlog/schema/records";
import type { DiscordNotificationSendCommand } from "@lootlog/schema/notifications";
import type { NotificationContentModule } from "#src/notifications/content/notification-content.service";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Schema } from "effect";
import type {
  NotificationJobStore,
  NotificationJobWithRelations,
} from "#src/notifications/jobs/notification-job-store";
import type { NotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import {
  NotificationJobStatus,
  NotificationOwnerType,
  NotificationProvider,
} from "#src/notifications/notification-enums";
import type { JsonValue, JsonObject } from "#src/database/json";

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
  readonly publish: (
    payload: DiscordNotificationSendCommand,
  ) => Effect.Effect<void, unknown, never>;
}

export class NotificationJobDispatchFailure extends TaggedErrorClass<NotificationJobDispatchFailure>()(
  "NotificationJobDispatchFailure",
  { operation: Schema.String, jobId: Schema.String, cause: Schema.Defect() },
) {}

const targetBlockedReason = (target: NotificationDispatchJob["target"]) => {
  if (!target.active) return "Notification target is disabled";
  if (target.canSend) return null;
  const metadata = isObjectRecord(target.metadata) ? target.metadata : null;
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

const isPayloadObject = (value: JsonValue): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const parseDispatchPayload = (value: JsonValue) => {
  const payload = isPayloadObject(value) ? value : undefined;
  return {
    content: typeof payload?.content === "string" ? payload.content : undefined,
    title: typeof payload?.title === "string" ? payload.title : "Powiadomienie",
    message:
      typeof payload?.message === "string"
        ? payload.message
        : "Masz nowe powiadomienie",
    metadata: payload,
  };
};

export const makeNotificationJobDispatch = (
  store: NotificationDispatchStore,
  permissions: NotificationDispatchPermissions,
  publisher: NotificationDispatchPublisher,
  scheduler: Pick<NotificationJobScheduler, "enqueue">,
  parseAllowedMentions: NotificationContentModule["parseAllowedMentions"],
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
    const payload = parseDispatchPayload(job.payloadSnapshot);
    const published = yield* publisher
      .publish({
        notificationJobId: job.id,
        provider: NotificationProvider.DISCORD,
        ownerType: job.ownerType,
        ownerId: job.ownerId,
        guildId: job.rule.guildId,
        ...payload,
        allowedMentions: parseAllowedMentions(
          payload.metadata?.allowedMentions,
        ),
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
