import type { Timer } from "@/api/timers.api";
import { getTimerColorConfig } from "@/features/timers/model/timer-colors";
import {
  formatLevelSuffix,
  getTimerShortname,
} from "@/features/timers/model/timer-labels";
import { useTimersStore } from "@/store/timers.store";
import { useShallow } from "zustand/react/shallow";

export const useTimerDisplay = (timer: Timer) => {
  const {
    selectedColor,
    customColor,
    overriddenColor,
    displayConfig,
    countdownMode,
  } = useTimersStore(
    useShallow((state) => {
      const colorConfig = getTimerColorConfig(
        timer.npc.name,
        state.timersColors,
        state.customColors,
        state.overriddenDefaultColors,
      );

      return {
        ...colorConfig,
        displayConfig: state.displayConfig,
        countdownMode: state.generalConfig.countdownMode,
      };
    }),
  );

  const isPending = timer.isPending ?? false;
  const resetIndicator = timer.wasReset ? "[R] " : "";

  const shortname = displayConfig.showType ? getTimerShortname(timer) : "";

  const npcDetails = displayConfig.showLevel
    ? formatLevelSuffix(timer.npc)
    : "";

  return {
    isPending,
    selectedColor,
    customColor,
    overriddenColor,
    resetIndicator,
    shortname,
    npcDetails,
    displayConfig,
    countdownMode,
  };
};
