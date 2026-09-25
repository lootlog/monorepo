import { toast } from "sonner";
import { normalizeTimerResponse } from "@/api/timers.api";
import { useTimersCache } from "@/hooks/api/use-timers-cache";
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
          toast.success(t("history.restoreSuccess"));
          onRestored();
        },
        onError: () => toast.error(t("history.restoreFailed")),
      },
    );
  };

  return { restoreTimer, isPending };
};
