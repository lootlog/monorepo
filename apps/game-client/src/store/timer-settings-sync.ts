import type {
  UpdateTimerSettingsPayload,
  UpdateGuildTimerSettingsPayload,
} from "@lootlog/types";
import { useTimersStore } from "./timers.store";
import { setMeasuredTimeout } from "@/lib/performance-monitoring/measured-callback";

let syncTimeoutId: number | null = null;
const guildSyncTimeouts: Map<string, number> = new Map();
let pendingGlobalPayload: UpdateTimerSettingsPayload = {};
const pendingGuildPayloads: Map<string, UpdateGuildTimerSettingsPayload> =
  new Map();

const SYNC_DEBOUNCE_MS = 500;

type MutateGlobalFn = (payload: UpdateTimerSettingsPayload) => void;

let globalMutateFn: MutateGlobalFn | null = null;
const globalMutationRegistrations = new Map<symbol, MutateGlobalFn>();

const selectLatestGlobalMutation = (): void => {
  const registeredMutations = [...globalMutationRegistrations.values()];
  globalMutateFn = registeredMutations[registeredMutations.length - 1] ?? null;
};

export const disposeTimerSettingsSync = (): void => {
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
    syncTimeoutId = null;
  }

  guildSyncTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  guildSyncTimeouts.clear();
  pendingGlobalPayload = {};
  pendingGuildPayloads.clear();
  globalMutationRegistrations.clear();
  globalMutateFn = null;
};

export const registerGlobalSettingsMutation = (
  mutateFn: MutateGlobalFn,
): (() => void) => {
  const registrationId = Symbol("timer-settings-global-mutation");
  globalMutationRegistrations.set(registrationId, mutateFn);
  globalMutateFn = mutateFn;

  let registered = true;
  return () => {
    if (!registered) return;

    registered = false;
    globalMutationRegistrations.delete(registrationId);
    selectLatestGlobalMutation();
    if (globalMutationRegistrations.size === 0) {
      disposeTimerSettingsSync();
    }
  };
};

export const debouncedSyncGlobalSettings = (
  payload: UpdateTimerSettingsPayload,
) => {
  pendingGlobalPayload = { ...pendingGlobalPayload, ...payload };

  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
  }

  syncTimeoutId = setMeasuredTimeout(
    "timer-settings.global-sync",
    () => {
      syncTimeoutId = null;
      const payloadToSend = { ...pendingGlobalPayload };
      pendingGlobalPayload = {};

      if (payloadToSend.syncEnabled === undefined) {
        const { syncEnabled } = useTimersStore.getState();
        if (!syncEnabled) {
          return;
        }
      }

      if (!globalMutateFn) {
        console.warn(
          "[TimerSync] Global mutation not registered, skipping sync",
        );
        return;
      }

      globalMutateFn(payloadToSend);
    },
    SYNC_DEBOUNCE_MS,
  );
};

export const debouncedSyncGuildSettings = (
  guildId: string,
  payload: UpdateGuildTimerSettingsPayload,
) => {
  const existingPayload = pendingGuildPayloads.get(guildId) ?? {};
  pendingGuildPayloads.set(guildId, { ...existingPayload, ...payload });

  const existingTimeout = guildSyncTimeouts.get(guildId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const timeoutId = setMeasuredTimeout(
    "timer-settings.guild-sync",
    () => {
      pendingGuildPayloads.delete(guildId);

      const { syncEnabled } = useTimersStore.getState();
      if (!syncEnabled) {
        guildSyncTimeouts.delete(guildId);
        return;
      }

      console.warn(
        `[TimerSync] Guild mutation not registered for ${guildId}, skipping sync`,
      );
      guildSyncTimeouts.delete(guildId);
    },
    SYNC_DEBOUNCE_MS,
  );

  guildSyncTimeouts.set(guildId, timeoutId);
};
