import type {
  UpdateTimerSettingsPayload,
  UpdateGuildTimerSettingsPayload,
} from "@lootlog/types";
import { useTimersStore } from "./timers.store";

let syncTimeoutId: NodeJS.Timeout | null = null;
let guildSyncTimeouts: Map<string, NodeJS.Timeout> = new Map();

const SYNC_DEBOUNCE_MS = 500;

type MutateGlobalFn = (payload: UpdateTimerSettingsPayload) => void;
type MutateGuildFn = (payload: UpdateGuildTimerSettingsPayload) => void;

let globalMutateFn: MutateGlobalFn | null = null;
let guildMutateFns: Map<string, MutateGuildFn> = new Map();

export const registerGlobalSettingsMutation = (mutateFn: MutateGlobalFn) => {
  globalMutateFn = mutateFn;
};

export const registerGuildSettingsMutation = (
  guildId: string,
  mutateFn: MutateGuildFn,
) => {
  guildMutateFns.set(guildId, mutateFn);
};

export const unregisterGuildSettingsMutation = (guildId: string) => {
  guildMutateFns.delete(guildId);
};

export const debouncedSyncGlobalSettings = (
  payload: UpdateTimerSettingsPayload,
) => {
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
  }

  syncTimeoutId = setTimeout(() => {
    if (payload.syncEnabled === false) {
      console.log("[TimerSync] Sending syncEnabled=false to backend");
    } else if (payload.syncEnabled === undefined) {
      const { syncEnabled } = useTimersStore.getState();
      if (!syncEnabled) {
        console.log("[TimerSync] Sync disabled, skipping global settings sync");
        return;
      }
    }

    if (!globalMutateFn) {
      console.warn("[TimerSync] Global mutation not registered, skipping sync");
      return;
    }

    globalMutateFn(payload);
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

  const timeoutId = setTimeout(() => {
    const { syncEnabled } = useTimersStore.getState();
    if (!syncEnabled) {
      console.log("[TimerSync] Sync disabled, skipping guild settings sync");
      guildSyncTimeouts.delete(guildId);
      return;
    }

    const mutateFn = guildMutateFns.get(guildId);
    if (!mutateFn) {
      console.warn(
        `[TimerSync] Guild mutation not registered for ${guildId}, skipping sync`,
      );
      guildSyncTimeouts.delete(guildId);
      return;
    }

    mutateFn(payload);
    guildSyncTimeouts.delete(guildId);
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
