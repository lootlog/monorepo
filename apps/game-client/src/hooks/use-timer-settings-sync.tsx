import { decodeTimerSettings } from "@/store/timer-settings-codec";
import { useEffect, useRef, useState } from "react";
import { useTimersStore, TIMERS_STORAGE_KEY } from "@/store/timers.store";
import {
  useTimerSettings,
  useMigrateTimerSettings,
} from "./api/use-timer-settings";
import { TimerSettingsConflictDialog } from "@/components/timer-settings-conflict-dialog";

type LocalSettingsSnapshot = {
  generalConfig: ReturnType<typeof useTimersStore.getState>["generalConfig"];
  displayConfig: ReturnType<typeof useTimersStore.getState>["displayConfig"];
  customColors: ReturnType<typeof useTimersStore.getState>["customColors"];
  alwaysVisibleExpiredTimers: ReturnType<
    typeof useTimersStore.getState
  >["alwaysVisibleExpiredTimers"];
  timersColors: ReturnType<typeof useTimersStore.getState>["timersColors"];
  defaultColorNames: ReturnType<
    typeof useTimersStore.getState
  >["defaultColorNames"];
  overriddenDefaultColors: ReturnType<
    typeof useTimersStore.getState
  >["overriddenDefaultColors"];
  hiddenDefaultColors: ReturnType<
    typeof useTimersStore.getState
  >["hiddenDefaultColors"];
  timerFiltersEnabled: ReturnType<
    typeof useTimersStore.getState
  >["timerFiltersEnabled"];
  timersSortOrder: ReturnType<
    typeof useTimersStore.getState
  >["timersSortOrder"];
  syncEnabled: ReturnType<typeof useTimersStore.getState>["syncEnabled"];
  hiddenTimers: ReturnType<typeof useTimersStore.getState>["hiddenTimers"];
  pinnedTimers: ReturnType<typeof useTimersStore.getState>["pinnedTimers"];
};

const applyRemoteTimerSettings = (
  remoteSettings: NonNullable<ReturnType<typeof useTimerSettings>["data"]>,
) => {
  const localStore = useTimersStore.getState();
  const decoded = decodeTimerSettings(remoteSettings);
  useTimersStore.setState({
    updatedAt: remoteSettings.updatedAt
      ? new Date(remoteSettings.updatedAt).getTime()
      : undefined,
    generalConfig: { ...localStore.generalConfig, ...decoded.generalConfig },
    displayConfig: { ...localStore.displayConfig, ...decoded.displayConfig },
    customColors: decoded.customColors ?? localStore.customColors,
    alwaysVisibleExpiredTimers:
      decoded.alwaysVisibleExpiredTimers ??
      localStore.alwaysVisibleExpiredTimers,
    timersColors: decoded.timersColors ?? localStore.timersColors,
    defaultColorNames:
      decoded.defaultColorNames ?? localStore.defaultColorNames,
    overriddenDefaultColors:
      decoded.overriddenDefaultColors ?? localStore.overriddenDefaultColors,
    hiddenDefaultColors: remoteSettings.hiddenDefaultColors,
    timerFiltersEnabled: remoteSettings.timerFiltersEnabled,
    timersSortOrder: remoteSettings.timersSortOrder,
    syncEnabled: remoteSettings.syncEnabled,
  });
};

export const useTimerSettingsSync = () => {
  const [showConflict, setShowConflict] = useState(false);
  const [remoteUpdatedAt] = useState<Date>();
  const [localUpdatedAt] = useState<number>();
  const [localSnapshot, setLocalSnapshot] =
    useState<LocalSettingsSnapshot | null>(null);
  const isInitializedRef = useRef(false);
  const syncEnabled = useTimersStore((state) => state.syncEnabled);

  const {
    data: remoteSettings,
    isLoading,
    isFetching,
  } = useTimerSettings(syncEnabled ?? true);
  const { mutateAsync: migrateSettings } = useMigrateTimerSettings();

  useEffect(() => {
    if (syncEnabled === false) {
      isInitializedRef.current = false;
      return;
    }

    if (isLoading || isFetching) return;

    const initializeSettings = async () => {
      const localStore = useTimersStore.getState();

      const localStorageData = localStorage.getItem(TIMERS_STORAGE_KEY);
      let localTimestamp: number | undefined;

      if (localStorageData) {
        try {
          const parsed = JSON.parse(localStorageData);
          localTimestamp = parsed.state?.updatedAt;
        } catch {
          // Ignore parse errors
        }
      }

      if (!remoteSettings && localTimestamp && !isInitializedRef.current) {
        await migrateSettings({
          localData: {
            generalConfig: localStore.generalConfig,
            displayConfig: localStore.displayConfig,
            customColors: localStore.customColors,
            alwaysVisibleExpiredTimers: localStore.alwaysVisibleExpiredTimers,
            timersColors: localStore.timersColors,
            defaultColorNames: localStore.defaultColorNames,
            overriddenDefaultColors: localStore.overriddenDefaultColors,
            hiddenDefaultColors: localStore.hiddenDefaultColors,
            timerFiltersEnabled: localStore.timerFiltersEnabled,
            timersSortOrder: localStore.timersSortOrder,
            syncEnabled: localStore.syncEnabled,
            hiddenTimers: localStore.hiddenTimers,
            pinnedTimers: localStore.pinnedTimers,
          },
          conflictResolution: "local",
        });
        isInitializedRef.current = true;
        return;
      }

      if (remoteSettings) {
        // Temporarily disabled: always use server settings instead of showing conflict dialog
        // if (
        //   !isInitialized &&
        //   hasSignificantDiff &&
        //   localTimestamp &&
        //   remoteTimestamp
        // ) {
        //   setLocalSnapshot({
        //     generalConfig: localStore.generalConfig,
        //     displayConfig: localStore.displayConfig,
        //     customColors: localStore.customColors,
        //     alwaysVisibleExpiredTimers: localStore.alwaysVisibleExpiredTimers,
        //     timersColors: localStore.timersColors,
        //     defaultColorNames: localStore.defaultColorNames,
        //     overriddenDefaultColors: localStore.overriddenDefaultColors,
        //     hiddenDefaultColors: localStore.hiddenDefaultColors,
        //     timerFiltersEnabled: localStore.timerFiltersEnabled,
        //     timersSortOrder: localStore.timersSortOrder,
        //     syncEnabled: localStore.syncEnabled,
        //     hiddenTimers: localStore.hiddenTimers,
        //     pinnedTimers: localStore.pinnedTimers,
        //   });
        //   setRemoteUpdatedAt(remoteSettings.updatedAt);
        //   setLocalUpdatedAt(localTimestamp);
        //   setShowConflict(true);
        //   setIsInitialized(false);
        //   return;
        // }

        // Always apply remote settings (backend is source of truth)
        applyRemoteTimerSettings(remoteSettings);

        if (!isInitializedRef.current) {
          isInitializedRef.current = true;
        }
      }
    };

    initializeSettings();
  }, [
    remoteSettings,
    isLoading,
    isFetching,
    syncEnabled,
    showConflict,
    migrateSettings,
  ]);

  const handleConflictResolve = async (choice: "local" | "remote") => {
    if (choice === "local") {
      if (!localSnapshot) {
        console.warn(
          "[TimerSync] Local snapshot is missing, cannot resolve conflict",
        );
        return;
      }

      await migrateSettings({
        localData: localSnapshot,
        conflictResolution: "local",
      });
    } else if (remoteSettings) {
      applyRemoteTimerSettings(remoteSettings);
    }

    setShowConflict(false);
    isInitializedRef.current = true;
    setLocalSnapshot(null);
  };

  return {
    showConflict,
    ConflictDialog: (
      <TimerSettingsConflictDialog
        isOpen={showConflict}
        onResolve={handleConflictResolve}
        localUpdatedAt={localUpdatedAt}
        remoteUpdatedAt={remoteUpdatedAt}
      />
    ),
  };
};
