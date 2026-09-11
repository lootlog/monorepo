import type {
  LogActionType,
  LogEntryStatus,
  LoggedAction,
  LoggedApiRequest,
} from "@/store/logs.store";

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

export const LOG_STATUS_CHIP_CLASS_NAMES: Record<
  LoggedAction["status"] | LoggedApiRequest["status"],
  string
> = {
  success: "ll:bg-emerald-500/15 ll:text-emerald-300",
  partial: "ll:bg-white/10 ll:text-muted-foreground",
  error: "ll:bg-destructive/15 ll:text-destructive",
};

/** Shared chip shape; pair with a LOG_STATUS_CHIP_CLASS_NAMES colour. */
export const LOG_STATUS_CHIP_BASE_CLASS_NAME =
  "ll:inline-flex ll:h-4 ll:items-center ll:rounded-sm ll:px-1 ll:text-[11px] ll:font-semibold ll:tabular-nums";

export const LOG_PRE_CLASS_NAME =
  "ll:m-0 ll:max-h-48 ll:overflow-auto ll:rounded-sm ll:bg-black/25 ll:px-2 ll:py-2 ll:text-xs ll:leading-4 ll:text-foreground";
