import { useEffect, useState } from "react";
import { useTimersStore } from "@/store/timers.store";
import {
  useTimerSettings,
  useMigrateTimerSettings,
} from "./api/use-timer-settings";
import { TimerSettingsConflictDialog } from "@/components/timer-settings-conflict-dialog";

export const useTimerSettingsSync = () => {
  const [showConflict, setShowConflict] = useState(false);
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState<Date>();
  const [localUpdatedAt, setLocalUpdatedAt] = useState<number>();
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: remoteSettings, isLoading, isFetching } = useTimerSettings();
  const { mutateAsync: migrateSettings } = useMigrateTimerSettings();

  useEffect(() => {
    if (isLoading || isFetching || isInitialized) return;

    const initializeSettings = async () => {
      const localStore = useTimersStore.getState();

      const localStorageData = localStorage.getItem("ll-timers-state");
      let localTimestamp: number | undefined;

      if (localStorageData) {
        try {
          const parsed = JSON.parse(localStorageData);
          localTimestamp = parsed.state?.updatedAt;
        } catch {
          // Ignore parse errors
        }
      }

      if (!remoteSettings && localTimestamp) {
        await migrateSettings({
          localData: {
            generalConfig: localStore.generalConfig,
            displayConfig: localStore.displayConfig,
            customColors: localStore.customColors,
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
        setIsInitialized(true);
        return;
      }

      if (remoteSettings) {
        const remoteTimestamp = remoteSettings.updatedAt
          ? new Date(remoteSettings.updatedAt).getTime()
          : 0;
        const localTime = localTimestamp ?? 0;

        const timeDiff = Math.abs(remoteTimestamp - localTime);
        const hasSignificantDiff = timeDiff > 60000;

        if (hasSignificantDiff && localTimestamp) {
          setRemoteUpdatedAt(remoteSettings.updatedAt);
          setLocalUpdatedAt(localTimestamp);
          setShowConflict(true);
          return;
        }

        // Always apply remote settings (backend is source of truth)
        useTimersStore.setState({
          generalConfig:
            remoteSettings.generalConfig as typeof localStore.generalConfig,
          displayConfig:
            remoteSettings.displayConfig as typeof localStore.displayConfig,
          customColors:
            remoteSettings.customColors as typeof localStore.customColors,
          timersColors: remoteSettings.timersColors as Record<
            string,
            string | undefined
          >,
          defaultColorNames: remoteSettings.defaultColorNames as Record<
            string,
            string
          >,
          overriddenDefaultColors:
            remoteSettings.overriddenDefaultColors as typeof localStore.overriddenDefaultColors,
          hiddenDefaultColors: remoteSettings.hiddenDefaultColors as string[],
          timerFiltersEnabled: remoteSettings.timerFiltersEnabled,
          timersSortOrder: remoteSettings.timersSortOrder as "asc" | "desc",
          syncEnabled: remoteSettings.syncEnabled,
        });

        setIsInitialized(true);
      }
    };

    initializeSettings();
  }, [remoteSettings, isLoading, isFetching, isInitialized, migrateSettings]);

  const handleConflictResolve = async (choice: "local" | "remote") => {
    const localStore = useTimersStore.getState();

    if (choice === "local") {
      await migrateSettings({
        localData: {
          generalConfig: localStore.generalConfig,
          displayConfig: localStore.displayConfig,
          customColors: localStore.customColors,
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
    } else if (remoteSettings) {
      useTimersStore.setState({
        generalConfig:
          remoteSettings.generalConfig as typeof localStore.generalConfig,
        displayConfig:
          remoteSettings.displayConfig as typeof localStore.displayConfig,
        customColors:
          remoteSettings.customColors as typeof localStore.customColors,
        timersColors: remoteSettings.timersColors as Record<
          string,
          string | undefined
        >,
        defaultColorNames: remoteSettings.defaultColorNames as Record<
          string,
          string
        >,
        overriddenDefaultColors:
          remoteSettings.overriddenDefaultColors as typeof localStore.overriddenDefaultColors,
        hiddenDefaultColors: remoteSettings.hiddenDefaultColors as string[],
        timerFiltersEnabled: remoteSettings.timerFiltersEnabled,
        timersSortOrder: remoteSettings.timersSortOrder as "asc" | "desc",
        syncEnabled: remoteSettings.syncEnabled,
      });
    }

    setShowConflict(false);
    setIsInitialized(true);
  };

  return {
    showConflict,
    ConflictDialog: showConflict ? (
      <TimerSettingsConflictDialog
        onResolve={handleConflictResolve}
        localUpdatedAt={localUpdatedAt}
        remoteUpdatedAt={remoteUpdatedAt}
      />
    ) : null,
  };
};
