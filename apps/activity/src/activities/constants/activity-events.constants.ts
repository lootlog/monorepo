export const ACTIVITY_LOG_CREATE_QUEUE = "activity-log-create";
export const ACTIVITY_LOG_CREATE_DLQ_QUEUE = "activity-log-create.dlq";
export const ACTIVITY_LOG_CREATE_RETRY_QUEUE = "activity-log-create.retry";

export const ACTIVITY_LOG_CREATE_ROUTING_KEY = "activity.log.create";
export const ACTIVITY_LOG_CREATE_DLQ_ROUTING_KEY = "activity.log.create.dlq";
export const ACTIVITY_LOG_CREATE_RETRY_ROUTING_KEY =
  "activity.log.create.retry";

export const DEFAULT_EXCHANGE_NAME = "default";
export const DEAD_LETTER_EXCHANGE_NAME = "dlx";
export const RETRY_EXCHANGE_NAME = "retry";
export const ACTIVITY_RETRY_DELAY_MS = 30000;
