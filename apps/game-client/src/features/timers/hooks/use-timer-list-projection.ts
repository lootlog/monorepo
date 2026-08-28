import type { Timer } from "@/api/timers.api";
import {
  getTimerListRemovalTimers,
  projectTimerList,
} from "@/features/timers/timer-list-projection";
import { useTimerRemovalBoundary } from "@/features/timers/hooks/use-timer-removal-boundary";

type UseTimerListProjectionInput = Omit<
  Parameters<typeof projectTimerList>[0],
  "epoch" | "timers"
> & {
  enabled: boolean;
  timers: Timer[];
};

export const useTimerListProjection = ({
  context,
  enabled,
  filters,
  preferences,
  timers,
}: UseTimerListProjectionInput) => {
  const removalTimers = getTimerListRemovalTimers(timers, context.isGrouping);
  const epoch = useTimerRemovalBoundary(
    removalTimers,
    preferences.removeTimerAfterMs,
    enabled,
  );

  return projectTimerList({
    context,
    epoch,
    filters,
    preferences,
    timers,
  });
};
