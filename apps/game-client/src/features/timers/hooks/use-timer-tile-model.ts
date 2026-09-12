import type { TimerWithTimeLeft } from "@/features/timers/model/timer-time";
import {
  canDeleteTimer,
  canResetTimer,
} from "@/features/timers/model/timer-permissions";
import { resolveTimerTileColors } from "@/features/timers/model/timer-colors";
import { useTimerActions } from "./use-timer-actions";
import { useTimerDisplay } from "./use-timer-display";
import type { TimersWindowModel } from "./use-timers-window-model";

/** One tile's display values, actions and permissions, derived from the window model. */
export const useTimerTileModel = (
  timer: TimerWithTimeLeft,
  model: TimersWindowModel,
) => {
  const display = useTimerDisplay(timer);

  const actions = useTimerActions(
    timer,
    model.scope.settingsKey,
    model.scope.world,
    model.access.guildIds,
    model.scope.isGrouping,
  );

  const policy = model.access.policiesByGuildId[timer.guildId];

  return {
    timer,
    display,
    actions,
    colors: resolveTimerTileColors(display),
    label: `${display.resetIndicator}${display.shortname} ${timer.npc.name} ${display.npcDetails}`,
    isHidden: model.list.hiddenTimerNames.has(timer.npc.name),
    isPending: display.isPending,
    canDelete: canDeleteTimer(policy),
    canReset: canResetTimer(policy),
  };
};

export type TimerTileModel = ReturnType<typeof useTimerTileModel>;
