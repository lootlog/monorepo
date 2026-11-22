import type { JobsOptions } from "bullmq";

export const NOTIFICATIONS_DISPATCH_QUEUE = "notifications-dispatch";

export const NOTIFICATION_DELIVERY_ATTEMPTS = 4;

export const NOTIFICATION_DISPATCH_JOB_OPTIONS = {
  attempts: NOTIFICATION_DELIVERY_ATTEMPTS,
  backoff: { type: "exponential", delay: 15_000 },
  removeOnComplete: true,
  removeOnFail: true,
} satisfies JobsOptions;
