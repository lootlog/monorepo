import type { FC } from "react";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { TIMER_TOOLTIP_EXPAND_DELAY_MS } from "../constants/timer-tooltip";
import { useTimerNpcPresence } from "../hooks/use-timer-npc-presence";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import {
  useTimerHeroSighting,
  useTimerMapPresence,
  useTimerMapThreat,
} from "./timer-map-presence-provider";
import { TimerTooltip } from "./timer-tooltip";

type TimerSharedTooltipProps = {
  guildNamesById: Record<string, string>;
  timer: TimerWithTimeLeft;
};

/**
 * Tooltip body for the tile the grid's shared tooltip is open on. Mount it
 * keyed by the tile, so the expand delay starts over on every tile.
 */
export const TimerSharedTooltip: FC<TimerSharedTooltipProps> = ({
  guildNamesById,
  timer,
}) => {
  const occupancy = useTimerMapPresence(timer);
  const threat = useTimerMapThreat(timer);
  const heroSighting = useTimerHeroSighting(timer);
  const isStanding = useTimerNpcPresence(timer);
  const expanded = useDelayedVisibility(true, TIMER_TOOLTIP_EXPAND_DELAY_MS);

  return (
    <TimerTooltip
      timer={timer}
      guildNamesById={guildNamesById}
      occupancy={occupancy}
      threat={threat}
      heroSighting={heroSighting}
      isStanding={isStanding}
      expanded={expanded}
    />
  );
};
