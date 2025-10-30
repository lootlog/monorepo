import axios from "axios";
import { API_URL } from "@/config/api";
import type {
  UpdateTimerSettingsPayload,
  UpdateGuildTimerSettingsPayload,
} from "@lootlog/types";
import { useTimersStore } from "./timers.store";

let syncTimeoutId: NodeJS.Timeout | null = null;
let guildSyncTimeouts: Map<string, NodeJS.Timeout> = new Map();

const SYNC_DEBOUNCE_MS = 500;

export const debouncedSyncGlobalSettings = (
  payload: UpdateTimerSettingsPayload,
) => {
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
  }

  syncTimeoutId = setTimeout(async () => {
    const { syncEnabled } = useTimersStore.getState();
    if (!syncEnabled) {
      console.log("[TimerSync] Sync disabled, skipping global settings sync");
      return;
    }

    try {
      await axios.patch(`${API_URL}/timer-settings`, payload, {
        withCredentials: true,
      });
      console.log("[TimerSync] Global settings synced successfully");
    } catch (error) {
      console.error("[TimerSync] Failed to sync global settings:", error);
    }
  }, SYNC_DEBOUNCE_MS);
};

export const debouncedSyncGuildSettings = (
  guildId: string,
  payload: UpdateGuildTimerSettingsPayload,
) => {
  const existingTimeout = guildSyncTimeouts.get(guildId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const timeoutId = setTimeout(async () => {
    const { syncEnabled } = useTimersStore.getState();
    if (!syncEnabled) {
      console.log("[TimerSync] Sync disabled, skipping guild settings sync");
      guildSyncTimeouts.delete(guildId);
      return;
    }

    try {
      await axios.patch(
        `${API_URL}/timer-settings/guilds/${guildId}`,
        payload,
        {
          withCredentials: true,
        },
      );
      console.log(
        `[TimerSync] Guild settings synced successfully for guild ${guildId}`,
      );
      guildSyncTimeouts.delete(guildId);
    } catch (error) {
      console.error(
        `[TimerSync] Failed to sync guild settings for ${guildId}:`,
        error,
      );
    }
  }, SYNC_DEBOUNCE_MS);

  guildSyncTimeouts.set(guildId, timeoutId);
};

export const clearAllSyncTimeouts = () => {
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
    syncTimeoutId = null;
  }

  for (const timeoutId of guildSyncTimeouts.values()) {
    clearTimeout(timeoutId);
  }
  guildSyncTimeouts.clear();
};
