export enum Queue {
  // guilds
  GUILDS_CREATE = "backend-guilds-create",
  GUILDS_CREATE_DLQ = "backend-guilds-create.dlq",
  GUILDS_CREATE_RETRY = "backend-guilds-create.retry",
  GUILDS_DELETE = "backend-guilds-delete",
  GUILDS_DELETE_DLQ = "backend-guilds-delete.dlq",
  GUILDS_DELETE_RETRY = "backend-guilds-delete.retry",
  GUILDS_UPDATE = "backend-guilds-update",
  GUILDS_UPDATE_DLQ = "backend-guilds-update.dlq",
  GUILDS_UPDATE_RETRY = "backend-guilds-update.retry",
  // roles
  GUILDS_CREATE_ROLE = "backend-guilds-create-role",
  GUILDS_CREATE_ROLE_DLQ = "backend-guilds-create-role.dlq",
  GUILDS_CREATE_ROLE_RETRY = "backend-guilds-create-role.retry",
  GUILDS_UPDATE_ROLE = "backend-guilds-update-role",
  GUILDS_UPDATE_ROLE_DLQ = "backend-guilds-update-role.dlq",
  GUILDS_UPDATE_ROLE_RETRY = "backend-guilds-update-role.retry",
  GUILDS_DELETE_ROLE = "backend-guilds-delete-role",
  GUILDS_DELETE_ROLE_DLQ = "backend-guilds-delete-role.dlq",
  GUILDS_DELETE_ROLE_RETRY = "backend-guilds-delete-role.retry",
  // events
  PRESENCE_COVERAGE_CHECK = "backend-presence-coverage-check",
  PRESENCE_COVERAGE_CHECK_DLQ = "backend-presence-coverage-check.dlq",
  PRESENCE_COVERAGE_CHECK_RETRY = "backend-presence-coverage-check.retry",
  // game
  GAME_CHARACTER_OFFLINE = "backend-game-character-offline",
  GAME_CHARACTER_OFFLINE_DLQ = "backend-game-character-offline.dlq",
  GAME_CHARACTER_OFFLINE_RETRY = "backend-game-character-offline.retry",
  // notifications
  NOTIFICATIONS_LOOT_CREATED = "backend-notifications-loot-created",
  NOTIFICATIONS_LOOT_CREATED_DLQ = "backend-notifications-loot-created.dlq",
  NOTIFICATIONS_LOOT_CREATED_RETRY = "backend-notifications-loot-created.retry",
}
