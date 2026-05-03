import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { normalizeTimerResponse } from "@/api/timers.api";
import { useTimersCache } from "@/hooks/api/use-timers-cache";
import type { TimerHistoryResponseDto } from "@/lib/api/generated/main/model";
import {
  getTimersControllerGetRecentTimerHistoryQueryKey,
  useTimersControllerGetRecentTimerHistory,
  useTimersControllerRestoreTimerFromHistory,
} from "@/lib/api/generated/main/timers/timers";
import { History } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { TimerHistoryList } from "./timer-history-list";

type GlobalTimerHistoryPopoverProps = {
  guildId: string;
  world: string;
};

const GLOBAL_TIMER_HISTORY_LIMIT = 10;

export const GlobalTimerHistoryPopover: FC<GlobalTimerHistoryPopoverProps> = ({
  guildId,
  world,
}) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);
  const { upsertTimer } = useTimersCache();
  const { mutate: restoreTimer, isPending: restorePending } =
    useTimersControllerRestoreTimerFromHistory();
  const { data: history = [], isLoading } =
    useTimersControllerGetRecentTimerHistory(
      {
        guildId,
        world,
        limit: GLOBAL_TIMER_HISTORY_LIMIT,
      },
      {
        query: {
          queryKey: getTimersControllerGetRecentTimerHistoryQueryKey({
            guildId,
            world,
            limit: GLOBAL_TIMER_HISTORY_LIMIT,
          }),
          enabled: open && !!guildId && !!world,
        },
      },
    );

  const handleRestore = (entry: TimerHistoryResponseDto) => {
    restoreTimer(
      {
        pathParams: {
          guildId: entry.guildId,
          historyEntryId: entry.id.toString(),
        },
      },
      {
        onSuccess: (timer) => {
          upsertTimer(normalizeTimerResponse(timer));
          window.message?.(t("history.restoreSuccess"));
          setOpen(false);
        },
        onError: () => {
          window.message?.(t("history.restoreFailed"));
        },
      },
    );
  };

  const historyLabel = t("toolbar.history");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={historyLabel}
          className="ll-custom-cursor-pointer ll:mt-0.5 ll:border-0 ll:bg-transparent ll:p-0 ll:leading-none ll:text-gray-300 ll:hover:text-gray-100 ll:transition-colors"
          title={historyLabel}
          type="button"
        >
          <History className="ll:h-3.5 ll:w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="ll:w-80 ll:p-1" align="end" side="top">
        <TimerHistoryList
          history={history}
          isLoading={isLoading}
          onRestore={handleRestore}
          restorePending={restorePending}
          rowLayout="npcWithMember"
          title={t("history.globalTitle")}
        />
      </PopoverContent>
    </Popover>
  );
};
