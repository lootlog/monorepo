import type { JobsOptions } from "bullmq";

export const NOTIFICATIONS_DISPATCH_QUEUE = "notifications-dispatch";

export const NOTIFICATION_DISPATCH_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: "exponential", delay: 15_000 },
  removeOnComplete: true,
  removeOnFail: true,
} satisfies JobsOptions;
