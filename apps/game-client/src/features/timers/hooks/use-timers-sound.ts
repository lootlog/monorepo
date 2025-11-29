import { useEffect, useRef } from "react";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

export const useTimersSound = (
  timers: TimerWithTimeLeft[],
  soundEnabledTimers: string[],
) => {
  const { playSound } = useSoundPlayback();
  const playedTimersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const timer of timers) {
      const timerKey = `${timer.npcId}_${timer.minSpawnTime}`;

      if (playedTimersRef.current.has(timerKey)) {
        continue;
      }

      const isSoundEnabled = soundEnabledTimers.includes(timer.npc.name);
      if (!isSoundEnabled) {
        continue;
      }

      if (timer.minTimeLeft <= 0 && timer.maxTimeLeft > 0) {
        playSound("timers", timer.npc.type);
        playedTimersRef.current.add(timerKey);
      }
    }

    const currentTimerKeys = new Set(
      timers.map((t) => `${t.npcId}_${t.minSpawnTime}`),
    );
    for (const key of playedTimersRef.current) {
      if (!currentTimerKeys.has(key)) {
        playedTimersRef.current.delete(key);
      }
    }
  }, [timers, soundEnabledTimers, playSound]);
};
