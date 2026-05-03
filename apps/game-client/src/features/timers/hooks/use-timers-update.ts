import { useEffect, useState, useRef } from "react";
import {
  calculateTimeLeft,
  filterTimersByExpiredVisibility,
  type TimerWithTimeLeft,
} from "../utils/timers-utils";

const getTimersSignature = (timers: TimerWithTimeLeft[]) =>
  timers
    .map((timer) =>
      [
        timer.guildId,
        timer.world,
        timer.timerKey,
        timer.npcId,
        timer.minSpawnTime,
        timer.maxSpawnTime,
        timer.wasReset,
        timer.updatedAt,
        timer.member?.id,
        timer.actorCharacter?.accountId,
        timer.actorCharacter?.characterId,
        timer.actorCharacter?.name,
        timer.actorCharacter?.lvl,
        timer.actorCharacter?.prof,
      ].join(":"),
    )
    .join("|");

export const useTimersUpdate = (
  activeTimers: TimerWithTimeLeft[],
  removeTimerAfterMs: number,
  alwaysVisibleExpiredTimers: Record<string, string[]> = {},
) => {
  const [calculatedTimers, setCalculatedTimers] =
    useState<TimerWithTimeLeft[]>(activeTimers);
  const activeTimersSignatureRef = useRef(getTimersSignature(activeTimers));

  useEffect(() => {
    const activeTimersSignature = getTimersSignature(activeTimers);

    if (activeTimersSignature === activeTimersSignatureRef.current) {
      return;
    }

    activeTimersSignatureRef.current = activeTimersSignature;
    setCalculatedTimers(activeTimers);
  }, [activeTimers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCalculatedTimers((prev) => {
        const updated = calculateTimeLeft(prev);
        const filtered = filterTimersByExpiredVisibility(
          updated,
          removeTimerAfterMs,
          alwaysVisibleExpiredTimers,
        );
        return filtered;
      });
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [alwaysVisibleExpiredTimers, removeTimerAfterMs]);

  return calculatedTimers;
};
