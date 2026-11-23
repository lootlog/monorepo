import { useEffect, useState } from "react";
import type { Timer } from "@/api/timers.api";
import { playSound } from "@/lib/sound-playback";
import { useTimerSoundSettings } from "@/lib/settings-persistence/use-sound-settings";
import { GLOBAL_TIMER_SETTINGS_KEY } from "@/store/timer-settings-sync";
import { useTimersStore } from "@/store/timers.store";
import {
  collectTimerSoundEvents,
  createTimerSoundScheduler,
  getTimerSoundPreferences,
} from "../timer-sounds";

const NO_HIDDEN_TIMERS: string[] = [];

const playTimerSounds = (npcTypes: ReadonlySet<string>) => {
  for (const npcType of npcTypes) playSound("timers", npcType);
};

export const useTimerSounds = (
  timers: readonly Timer[] | undefined,
  guildId: string | undefined,
) => {
  const settings = useTimerSoundSettings();

  const [scheduler] = useState(() =>
    createTimerSoundScheduler(playTimerSounds),
  );

  const hiddenNpcNames = useTimersStore((state) => {
    const settingsKey = state.generalConfig.timersGrouping
      ? GLOBAL_TIMER_SETTINGS_KEY
      : guildId;

    return settingsKey === undefined
      ? NO_HIDDEN_TIMERS
      : (state.hiddenTimers[settingsKey] ?? NO_HIDDEN_TIMERS);
  });

  useEffect(() => {
    scheduler.update(
      settings && timers
        ? collectTimerSoundEvents(
            timers,
            getTimerSoundPreferences(settings, hiddenNpcNames),
          )
        : [],
    );

    return scheduler.dispose;
  }, [scheduler, settings, timers, hiddenNpcNames]);
};
