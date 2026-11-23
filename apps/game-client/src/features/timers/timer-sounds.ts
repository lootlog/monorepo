import type { Timer } from "@/api/timers.api";
import type { TimerSoundSettings } from "@/lib/settings-persistence/use-sound-settings";
import { getTimerEpoch } from "./utils/timers-utils";

export type TimerSoundPreferences = {
  windowSoon: boolean;
  windowSoonMinutes: number;
  windowOpen: boolean;
  windowEnd: boolean;
  npcTypes: ReadonlySet<string>;
  npcNames: ReadonlySet<string>;
  hiddenNpcNames: ReadonlySet<string>;
};

export type TimerSoundEvent = {
  at: number;
  npcType: string;
};

const MINUTE_MS = 60_000;

const TIMER_SOUND_LATE_TOLERANCE_MS = 90_000;

const MAX_TIMEOUT_MS = 2_147_483_647;

export const getTimerSoundPreferences = (
  settings: TimerSoundSettings,
  hiddenNpcNames: readonly string[],
): TimerSoundPreferences => ({
  windowSoon: settings.timerWindowSoonSound,
  windowSoonMinutes: settings.timerWindowSoonMinutes,
  windowOpen: settings.timerWindowOpenSound,
  windowEnd: settings.timerWindowEndSound,
  npcTypes: new Set(
    Object.entries(settings.timersConfig).flatMap(([npcType, config]) =>
      config.enabled ? [npcType] : [],
    ),
  ),
  npcNames: new Set(settings.timerSoundNpcNames),
  hiddenNpcNames: new Set(hiddenNpcNames),
});

const isTimerSoundSelected = (
  timer: Timer,
  preferences: TimerSoundPreferences,
) =>
  preferences.npcNames.has(timer.npc.name) ||
  (preferences.npcTypes.has(timer.npc.type) &&
    !preferences.hiddenNpcNames.has(timer.npc.name));

export const collectTimerSoundEvents = (
  timers: readonly Timer[],
  preferences: TimerSoundPreferences,
): TimerSoundEvent[] =>
  timers.flatMap((timer) => {
    if (timer.deletedAt || !isTimerSoundSelected(timer, preferences)) {
      return [];
    }

    const windowOpensAt = getTimerEpoch(timer.minSpawnTime);
    const moments: number[] = [];

    if (preferences.windowSoon) {
      moments.push(windowOpensAt - preferences.windowSoonMinutes * MINUTE_MS);
    }

    if (preferences.windowOpen) moments.push(windowOpensAt);

    if (preferences.windowEnd) {
      moments.push(getTimerEpoch(timer.maxSpawnTime));
    }

    return moments.map((at) => ({ at, npcType: timer.npc.type }));
  });

export const createTimerSoundScheduler = (
  play: (npcTypes: ReadonlySet<string>) => void,
) => {
  let events: readonly TimerSoundEvent[] = [];
  let checkedAt = Date.now();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const playCrossedEvents = () => {
    const now = Date.now();
    const npcTypes = new Set<string>();

    for (const event of events) {
      if (
        event.at > checkedAt &&
        event.at <= now &&
        now - event.at <= TIMER_SOUND_LATE_TOLERANCE_MS
      ) {
        npcTypes.add(event.npcType);
      }
    }

    checkedAt = now;

    if (npcTypes.size > 0) play(npcTypes);
  };

  const arm = () => {
    clearTimeout(timeout);
    timeout = undefined;

    const nextAt = events.reduce(
      (earliest, event) =>
        event.at > checkedAt && event.at < earliest ? event.at : earliest,
      Number.POSITIVE_INFINITY,
    );

    if (nextAt === Number.POSITIVE_INFINITY) return;

    timeout = setTimeout(
      () => {
        playCrossedEvents();
        arm();
      },
      Math.min(Math.max(0, nextAt - Date.now()), MAX_TIMEOUT_MS),
    );
  };

  return {
    update: (nextEvents: readonly TimerSoundEvent[]) => {
      playCrossedEvents();
      events = nextEvents;
      arm();
    },
    dispose: () => {
      clearTimeout(timeout);
      timeout = undefined;
    },
  };
};
