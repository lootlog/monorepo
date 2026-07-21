import { NPC_NAMES } from "@/constants/margonem";
import type { Timer } from "@/api/timers.api";
import { useTimersStore } from "@/store/timers.store";
import { calculateTimeLeft, getTimerColorConfig } from "../utils/timer-helpers";
import { useShallow } from "zustand/react/shallow";

const MANUAL_TIMER_MARGONEM_TYPE = 999;

const getTimerShortname = (timer: Timer, showType: boolean) => {
  if (!showType) {
    return "";
  }

  const typeShortname = NPC_NAMES[timer.npc.type]?.shortname;
  const manualTimer =
    Number(timer.npc.margonemType) === MANUAL_TIMER_MARGONEM_TYPE;

  if (manualTimer && typeShortname) {
    return `[M][${typeShortname}]`;
  }

  if (manualTimer) {
    return "[M]";
  }

  return `[${typeShortname ?? "M"}]`;
};

export const useTimerDisplay = (
  timer: Timer,
  minTimeLeft: number,
  maxTimeLeft: number,
) => {
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
        state.timersColors as Record<string, string>,
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
  const isMinSpawnTime = minTimeLeft < 0;
  const hasPassedRedThreshold = maxTimeLeft < 0;

  const resetIndicator = timer.wasReset ? "[R] " : "";

  const shortname = getTimerShortname(timer, displayConfig.showType);

  const npcDetails =
    displayConfig.showLevel && timer.npc.lvl > 0 && timer.npc.prof
      ? ` (${timer.npc.lvl}${timer.npc.prof.charAt(0).toLowerCase()})`
      : "";

  const timeLeft = calculateTimeLeft(
    minTimeLeft,
    maxTimeLeft,
    countdownMode,
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
