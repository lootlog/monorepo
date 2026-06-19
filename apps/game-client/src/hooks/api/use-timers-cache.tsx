import { useQueryClient } from "@tanstack/react-query";
import type { Timer } from "@/api/timers.api";
import { queryKeys } from "@/features/public-api/query-keys";

type TimerIdentity = Pick<Timer, "world" | "timerKey" | "guildId">;

const isSameTimer = (a: TimerIdentity, b: TimerIdentity): boolean =>
  a.timerKey === b.timerKey && a.guildId === b.guildId && a.world === b.world;

export const useTimersCache = () => {
  const queryClient = useQueryClient();

  const upsertTimer = (timer: Timer) => {
    if (!timer.world) return;

    queryClient.setQueryData<Timer[]>(
      queryKeys.timers(timer.world),
      (old = []) => {
        const updated = [...old];

        const index = updated.findIndex((t) => isSameTimer(t, timer));

        const next = { ...timer, isPending: false };

        if (index !== -1) {
          updated[index] = next;
        } else {
          updated.push(next);
        }

        return updated;
      },
    );
  };

  const removeTimer = (timer: TimerIdentity) => {
    if (!timer.world) return;

    queryClient.setQueryData<Timer[]>(
      queryKeys.timers(timer.world),
      (old = []) => old.filter((t) => !isSameTimer(t, timer)),
    );
  };

  return { upsertTimer, removeTimer };
};
