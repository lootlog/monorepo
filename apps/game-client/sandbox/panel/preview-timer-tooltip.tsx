import type { ComponentProps } from "react";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { TIMER_TOOLTIP_EXPAND_DELAY_MS } from "@/features/timers/constants/timer-tooltip";
import { TimerTooltip } from "@/features/timers/components/timer-tooltip";

/** A hovered preview tooltip unfolds its lists after the same delay as in game. */
export function PreviewTimerTooltip(
  props: Omit<ComponentProps<typeof TimerTooltip>, "expanded">,
) {
  const expanded = useDelayedVisibility(true, TIMER_TOOLTIP_EXPAND_DELAY_MS);

  return <TimerTooltip {...props} expanded={expanded} />;
}
