import { useQueryClient } from "@tanstack/react-query";
import type { Timer } from "@/api/timers.api";
import { queryKeys } from "@/features/public-api/query-keys";
import { invalidateTimerHistory } from "@/features/timers/utils/invalidate-timer-history";
import {
  upsertTimerInCollection,
  removeTimerFromCollection,
  type TimerIdentity,
} from "@lootlog/domain/timers";

export const useTimersCache = () => {
  const queryClient = useQueryClient();

  const updateTimerCache = (
    world: string,
    update: (timers: Timer[] | undefined) => Timer[] | undefined,
  ) => {
    if (!world) return;

    const queryKey = queryKeys.timers(world);
    const state = queryClient.getQueryState(queryKey);
    const wasFetching = state?.fetchStatus === "fetching";

    if (wasFetching) {
      void queryClient.cancelQueries({ queryKey, exact: true });
    }

    queryClient.setQueryData<Timer[]>(queryKey, update);

    if (wasFetching || (state && state.data === undefined)) {
      void queryClient.invalidateQueries({ queryKey, exact: true });
    }
  };

  const upsertTimer = (timer: Timer) => {
    updateTimerCache(timer.world, (old) =>
      upsertTimerInCollection(old, { ...timer, isPending: false }),
    );
    void invalidateTimerHistory(queryClient, timer);
  };

  const removeTimer = (timer: TimerIdentity) => {
    updateTimerCache(timer.world, (old) =>
      removeTimerFromCollection(old, timer),
    );
    void invalidateTimerHistory(queryClient, timer);
  };

  return { upsertTimer, removeTimer };
};
