import type { LogActionType, LogEntryStatus } from "@/store/logs.store";

export const LOG_STATUS_VALUES = [
  "all",
  "success",
  "partial",
  "error",
] as const;

export type LogStatusFilter = (typeof LOG_STATUS_VALUES)[number];

export const ACTION_TYPE_LABEL_KEYS: Record<LogActionType, string> = {
  create_kill: "settings.logs.actionTypes.create_kill",
  create_battle: "settings.logs.actionTypes.create_battle",
  create_loot: "settings.logs.actionTypes.create_loot",
  update_loot: "settings.logs.actionTypes.update_loot",
  create_timer: "settings.logs.actionTypes.create_timer",
  create_manual_timer: "settings.logs.actionTypes.create_manual_timer",
  delete_timer: "settings.logs.actionTypes.delete_timer",
  reset_timer: "settings.logs.actionTypes.reset_timer",
  send_chat_message: "settings.logs.actionTypes.send_chat_message",
  create_notification: "settings.logs.actionTypes.create_notification",
  volunteer: "settings.logs.actionTypes.volunteer",
  create_party_gathering: "settings.logs.actionTypes.create_party_gathering",
  cancel_party_gathering: "settings.logs.actionTypes.cancel_party_gathering",
  update_timer_settings: "settings.logs.actionTypes.update_timer_settings",
  update_guild_timer_settings:
    "settings.logs.actionTypes.update_guild_timer_settings",
  migrate_timer_settings: "settings.logs.actionTypes.migrate_timer_settings",
  update_sound_settings: "settings.logs.actionTypes.update_sound_settings",
  update_user_preferences: "settings.logs.actionTypes.update_user_preferences",
  update_user_game_account_preferences:
    "settings.logs.actionTypes.update_user_game_account_preferences",
  update_lootlog_characters_config:
    "settings.logs.actionTypes.update_lootlog_characters_config",
};

export const STATUS_LABEL_KEYS: Record<LogEntryStatus, string> = {
  success: "settings.logs.statuses.success",
  partial: "settings.logs.statuses.partial",
  error: "settings.logs.statuses.error",
};
