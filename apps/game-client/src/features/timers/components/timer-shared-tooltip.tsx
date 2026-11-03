import type { FC } from "react";
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

/** Tooltip body for the tile the grid's shared tooltip is open on. */
export const TimerSharedTooltip: FC<TimerSharedTooltipProps> = ({
  guildNamesById,
  timer,
}) => {
  const occupancy = useTimerMapPresence(timer);
  const threat = useTimerMapThreat(timer);
  const heroSighting = useTimerHeroSighting(timer);
  const isStanding = useTimerNpcPresence(timer);

  return (
    <TimerTooltip
      timer={timer}
      guildNamesById={guildNamesById}
      occupancy={occupancy}
      threat={threat}
      heroSighting={heroSighting}
      isStanding={isStanding}
    />
  );
};
