import type { Timer } from "@/api/timers.api";
import { getTimerColorConfig } from "@/features/timers/model/timer-colors";
import {
  formatLevelSuffix,
  getTimerShortname,
} from "@/features/timers/model/timer-labels";
import type { TimersWindowModel } from "./use-timers-window-model";

/** Presentation values of one tile derived from the timer and the surface appearance. */
export const useTimerDisplay = (
  timer: Timer,
  appearance: TimersWindowModel["appearance"],
) => {
  const { displayConfig, countdownMode, colors } = appearance;

  const colorConfig = getTimerColorConfig(
    timer.npc.name,
    colors.timersColors,
    colors.customColors,
    colors.overriddenDefaultColors,
  );

  const isPending = timer.isPending ?? false;
  const resetIndicator = timer.wasReset ? "[R] " : "";
  const shortname = displayConfig.showType ? getTimerShortname(timer) : "";

  const npcDetails = displayConfig.showLevel
    ? formatLevelSuffix(timer.npc)
    : "";

  return {
    isPending,
    ...colorConfig,
    resetIndicator,
    shortname,
    npcDetails,
    displayConfig,
    countdownMode,
  };
};
