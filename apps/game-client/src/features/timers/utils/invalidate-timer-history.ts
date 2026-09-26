import {
  getTimersControllerGetRecentTimerHistoryQueryKey,
  getTimersControllerGetTimerHistoryQueryKey,
} from "@lootlog/client/main";
import type { TimerIdentity } from "@lootlog/domain/timers";
import type { QueryClient } from "@tanstack/react-query";

export const invalidateTimerHistory = async (
  queryClient: QueryClient,
  { guildId, world, timerKey }: TimerIdentity,
) => {
  const queryKeys = [
    getTimersControllerGetRecentTimerHistoryQueryKey({ guildId, world }),
    getTimersControllerGetTimerHistoryQueryKey(
      { guildId, timerIdentifier: timerKey },
      { world },
    ),
  ];

  // Cancellation reverts synchronously, before an older response can mark the
  // history fresh again. Closed popovers stay invalidated until their next open.
  for (const queryKey of queryKeys)
    void queryClient.cancelQueries({ queryKey });

  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, refetchType: "active" }),
    ),
  );
};
