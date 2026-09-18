export type TimerIdentity = {
  readonly guildId: string;
  readonly world: string;
  readonly timerKey: string;
};

const isSameTimer = (first: TimerIdentity, second: TimerIdentity): boolean =>
  first.timerKey === second.timerKey &&
  first.guildId === second.guildId &&
  first.world === second.world;

export const upsertTimerInCollection = <Timer extends TimerIdentity>(
  timers: Timer[] | undefined,
  timer: Timer,
): Timer[] | undefined => {
  if (timers === undefined) return undefined;

  const updated = [...timers];
  const index = updated.findIndex((entry) => isSameTimer(entry, timer));

  if (index === -1) {
    updated.push(timer);
  } else {
    updated[index] = timer;
  }

  return updated;
};

export const removeTimerFromCollection = <Timer extends TimerIdentity>(
  timers: Timer[] | undefined,
  timer: TimerIdentity,
): Timer[] | undefined => timers?.filter((entry) => !isSameTimer(entry, timer));
