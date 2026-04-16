import type { LogActionType, LogEntryStatus } from "@/store/logs.store";

export const LOG_STATUS_OPTIONS = [
  { value: "all", label: "Wszystkie statusy" },
  { value: "success", label: "Sukces" },
  { value: "partial", label: "Częściowy sukces" },
  { value: "error", label: "Błąd" },
] as const;

export const ACTION_TYPE_LABELS: Record<LogActionType, string> = {
  create_kill: "Dodanie zabicia",
  create_battle: "Dodanie walki",
  create_loot: "Dodanie łupu",
  update_loot: "Aktualizacja łupu",
  create_timer: "Dodanie timera",
  create_manual_timer: "Ręczne dodanie timera",
  delete_timer: "Usunięcie timera",
  reset_timer: "Reset timera",
  send_chat_message: "Wysłanie wiadomości",
  create_notification: "Utworzenie powiadomienia",
  volunteer: "Zgłoszenie do zbierania",
  create_party_gathering: "Utworzenie zbierania grupy",
  cancel_party_gathering: "Zakończenie zbierania grupy",
  update_timer_settings: "Aktualizacja ustawień timerów",
  update_guild_timer_settings: "Aktualizacja ustawień timerów gildii",
  migrate_timer_settings: "Migracja ustawień timerów",
  update_sound_settings: "Aktualizacja ustawień dźwięków",
  update_user_preferences: "Aktualizacja preferencji użytkownika",
  update_user_game_account_preferences: "Aktualizacja preferencji konta gry",
  update_lootlog_characters_config: "Aktualizacja konfiguracji postaci",
};

export const STATUS_LABELS: Record<LogEntryStatus, string> = {
  success: "Sukces",
  partial: "Częściowy sukces",
  error: "Błąd",
};

export type LogStatusFilter = (typeof LOG_STATUS_OPTIONS)[number]["value"];
