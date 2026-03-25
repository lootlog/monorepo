import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Timer } from "@/hooks/api/use-timers";

const timersKey = (world: string) => ["guild-timers", world] as const;

type TimerIdentity = Pick<Timer, "world" | "npcId" | "guildId">;

const isSameTimer = (a: TimerIdentity, b: TimerIdentity): boolean =>
  a.npcId === b.npcId && a.guildId === b.guildId && a.world === b.world;

export const useTimersCache = () => {
  const queryClient = useQueryClient();

  const upsertTimer = useCallback(
    (timer: Timer) => {
      if (!timer.world) return;

      queryClient.setQueryData<Timer[]>(timersKey(timer.world), (old = []) => {
        const updated = [...old];

        const index = updated.findIndex((t) => isSameTimer(t, timer));

        const next = { ...timer, isPending: false };

        if (index !== -1) {
          updated[index] = next;
        } else {
          updated.push(next);
        }

        return updated;
      });
    },
    [queryClient],
  );

  const removeTimer = useCallback(
    (timer: TimerIdentity) => {
      if (!timer.world) return;

      queryClient.setQueryData<Timer[]>(timersKey(timer.world), (old = []) =>
        old.filter((t) => !isSameTimer(t, timer)),
      );
    },
    [queryClient],
  );

  return { upsertTimer, removeTimer };
};
