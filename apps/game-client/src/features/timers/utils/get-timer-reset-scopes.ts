import type { TimerWithTimeLeft } from "./timers-utils";

export const getTimerResetScopes = (
  timer: TimerWithTimeLeft,
  grouped: boolean,
) =>
  grouped && timer.mergedGuildIds
    ? timer.mergedGuildIds.flatMap(({ guildId, timerKey }) =>
        timerKey ? [{ guildId, timerIdentifier: timerKey }] : [],
      )
    : [{ guildId: timer.guildId, timerIdentifier: timer.timerKey }];
