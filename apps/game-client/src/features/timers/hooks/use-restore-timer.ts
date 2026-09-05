import { normalizeTimerResponse } from "@/api/timers.api";
import { useTimersCache } from "@/hooks/api/use-timers-cache";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import {
  useTimersControllerRestoreTimerFromHistory,
  type TimerHistoryResponseDto,
} from "@lootlog/client/main";
import { useTranslation } from "react-i18next";

export const useRestoreTimer = (onRestored: () => void) => {
  const { t } = useTranslation("timers");
  const { upsertTimer } = useTimersCache();
  const { mutate, isPending } = useTimersControllerRestoreTimerFromHistory();
  const restoreTimer = (entry: TimerHistoryResponseDto) => {
    mutate(
      {
        pathParams: {
          guildId: entry.guildId,
          historyEntryId: entry.id.toString(),
        },
      },
      {
        onSuccess: (timer) => {
          upsertTimer(normalizeTimerResponse(timer));
          showRuntimeMessage(t("history.restoreSuccess"));
          onRestored();
        },
        onError: () => showRuntimeMessage(t("history.restoreFailed")),
      },
    );
  };
  return { restoreTimer, isPending };
};
