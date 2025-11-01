import { NPC_NAMES } from "@/constants/margonem";
import type { Timer } from "@/hooks/api/use-timers";
import { useTimersStore } from "@/store/timers.store";
import { calculateTimeLeft, getTimerColorConfig } from "../utils/timer-helpers";

export const useTimerDisplay = (
  timer: Timer,
  minTimeLeft: number,
  maxTimeLeft: number,
) => {
  const {
    timersColors,
    customColors,
    overriddenDefaultColors,
    displayConfig,
    generalConfig,
  } = useTimersStore();

  const isPending = timer.isPending === true;
  const isMinSpawnTime = minTimeLeft < 0;
  const hasPassedRedThreshold = maxTimeLeft < 0;

  const { selectedColor, customColor, overriddenColor } = getTimerColorConfig(
    timer.npc.name,
    timersColors as Record<string, string>,
    customColors,
    overriddenDefaultColors,
  );

  const resetIndicator = timer.wasReset ? "[R] " : "";

  const shortname = displayConfig.showType
    ? `[${NPC_NAMES[timer.npc.type]?.shortname ?? "M"}]`
    : "";

  const npcDetails =
    displayConfig.showLevel && timer.npc.lvl > 0 && timer.npc.prof
      ? ` (${timer.npc.lvl}${timer.npc.prof?.charAt(0).toLowerCase() ?? ""})`
      : "";

  const timeLeft = calculateTimeLeft(
    minTimeLeft,
    maxTimeLeft,
    generalConfig.countdownMode,
    isMinSpawnTime,
  );

  return {
    isPending,
    isMinSpawnTime,
    hasPassedRedThreshold,
    selectedColor,
    customColor,
    overriddenColor,
    resetIndicator,
    shortname,
    npcDetails,
    timeLeft,
    displayConfig,
  };
};
