import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Timer } from "@/hooks/api/use-timers";

const timersKey = (world: string) => ["guild-timers", world] as const;

type TimerIdentity = Pick<Timer, "world" | "npcId" | "guildId">;

export const useTimersCache = () => {
  const queryClient = useQueryClient();

  const upsertTimer = useCallback(
    (timer: Timer) => {
      console.log("[CACHE] timer:upsert", timer);
      if (!timer.world) return;

      queryClient.setQueryData<Timer[]>(timersKey(timer.world), (old = []) => {
        const updated = [...old];

        const index = updated.findIndex(
          (t) =>
            t.npcId === timer.npcId &&
            t.guildId === timer.guildId &&
            t.world === timer.world,
        );

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
      console.log("[CACHE] timer:delete", timer);
      if (!timer.world) return;

      queryClient.setQueryData<Timer[]>(timersKey(timer.world), (old = []) =>
        old.filter(
          (t) =>
            !(
              t.npcId === timer.npcId &&
              t.world === timer.world &&
              t.guildId === timer.guildId
            ),
        ),
      );
    },
    [queryClient],
  );

  return { upsertTimer, removeTimer };
};
