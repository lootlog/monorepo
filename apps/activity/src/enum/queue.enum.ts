export enum Queue {
  // activity
  ACTIVITY_LOG_CREATE = "activity-log-create",
  ACTIVITY_LOG_CREATE_DLQ = "activity-log-create.dlq",
  ACTIVITY_LOG_CREATE_RETRY = "activity-log-create.retry",

  GUILDS_MEMBERS_REMOVE = "guilds-members-remove",
  GUILDS_MEMBERS_REMOVE_DLQ = "guilds-members-remove.dlq",
  GUILDS_MEMBERS_REMOVE_RETRY = "guilds-members-remove.retry",
}
