export const Queue = {
  ACTIVITY_LOG_CREATE: "activity-log-create",
  ACTIVITY_LOG_CREATE_DLQ: "activity-log-create.dlq",
  ACTIVITY_LOG_CREATE_RETRY: "activity-log-create.retry",
} as const;

export type Queue = (typeof Queue)[keyof typeof Queue];
