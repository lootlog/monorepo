import {
  getTimersControllerGetRecentTimerHistoryQueryKey,
  getTimersControllerGetTimerHistoryQueryKey,
  useTimersControllerGetRecentTimerHistory,
  useTimersControllerGetTimerHistory,
} from "@lootlog/client/main";
import type { Timer } from "@/api/timers.api";
import { useRestoreTimer } from "./use-restore-timer";

const TIMER_HISTORY_LIMIT = 5;

const GUILD_HISTORY_LIMIT = 10;

export type TimerHistorySource =
  | { kind: "timer"; timer: Pick<Timer, "guildId" | "timerKey" | "world"> }
  | { kind: "guild"; guildId: string; world: string };

/**
 * History entries of one timer or of a whole organization, fetched only while
 * the popover is open, plus the restore action that closes it on success.
 */
export const useTimerHistory = (
  source: TimerHistorySource,
  open: boolean,
  onRestored: () => void,
) => {
  const { restoreTimer, isPending: restorePending } =
    useRestoreTimer(onRestored);

  const timerSource = source.kind === "timer" ? source.timer : undefined;

  const timerPath = {
    guildId: timerSource?.guildId ?? "",
    timerIdentifier: timerSource?.timerKey ?? "",
  };

  const timerParams = {
    world: timerSource?.world ?? "",
    limit: TIMER_HISTORY_LIMIT,
  };

  const timerQuery = useTimersControllerGetTimerHistory(
    timerPath,
    timerParams,
    {
      query: {
        queryKey: getTimersControllerGetTimerHistoryQueryKey(
          timerPath,
          timerParams,
        ),
        enabled: open && timerSource !== undefined,
      },
    },
  );

  const guildParams = {
    guildId: source.kind === "guild" ? source.guildId : "",
    world: source.kind === "guild" ? source.world : "",
    limit: GUILD_HISTORY_LIMIT,
  };

  const guildQuery = useTimersControllerGetRecentTimerHistory(guildParams, {
    query: {
      queryKey: getTimersControllerGetRecentTimerHistoryQueryKey(guildParams),
      enabled:
        open &&
        source.kind === "guild" &&
        guildParams.guildId !== "" &&
        guildParams.world !== "",
    },
  });

  const query = source.kind === "timer" ? timerQuery : guildQuery;

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    restoreTimer,
    restorePending,
  };
};
