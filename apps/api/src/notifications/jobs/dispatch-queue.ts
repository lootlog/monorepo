import type { JobsOptions } from "bullmq";

export const NOTIFICATIONS_DISPATCH_QUEUE = "notifications-dispatch";

/**
 * How many times a notification job may be claimed, counted by its
 * `attemptCount`: AMQP publish retries and Discord delivery retries share it.
 */
export const NOTIFICATION_DELIVERY_ATTEMPTS = 4;

export const NOTIFICATION_DISPATCH_JOB_OPTIONS = {
  attempts: NOTIFICATION_DELIVERY_ATTEMPTS,
  backoff: { type: "exponential", delay: 15_000 },
  removeOnComplete: true,
  removeOnFail: true,
} satisfies JobsOptions;
