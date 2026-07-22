import { ContextMenuItem } from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getTimersControllerGetTimerHistoryQueryKey,
  useTimersControllerGetTimerHistory,
  useTimersControllerRestoreTimerFromHistory,
} from "@/lib/api/generated/main/timers/timers";
import type { TimerHistoryResponseDto } from "@/lib/api/generated/main/model";
import type { TimerWithTimeLeft } from "@/features/timers/utils/timers-utils";
import { History } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { normalizeTimerResponse } from "@/api/timers.api";
import { useTimersCache } from "@/hooks/api/use-timers-cache";
import { TimerHistoryList } from "./timer-history-list";

type TimerHistoryPopoverProps = {
  timer: TimerWithTimeLeft;
};

export const TimerHistoryPopover: FC<TimerHistoryPopoverProps> = ({
  timer,
}) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);
  const { upsertTimer } = useTimersCache();
  const { mutate: restoreTimer, isPending: restorePending } =
    useTimersControllerRestoreTimerFromHistory();
  const { data: history = [], isLoading } = useTimersControllerGetTimerHistory(
    {
      guildId: timer.guildId,
      timerIdentifier: timer.timerKey,
    },
    {
      world: timer.world,
      limit: 5,
    },
    {
      query: {
        queryKey: getTimersControllerGetTimerHistoryQueryKey(
          {
            guildId: timer.guildId,
            timerIdentifier: timer.timerKey,
          },
          {
            world: timer.world,
            limit: 5,
          },
        ),
        enabled: open,
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
        onSuccess: (restoredTimer) => {
          upsertTimer(normalizeTimerResponse(restoredTimer));
          window.message?.(t("history.restoreSuccess"));
          setOpen(false);
        },
        onError: () => {
          window.message?.(t("history.restoreFailed"));
        },
      },
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (
          !nextOpen &&
          eventDetails.reason === "outside-press" &&
          eventDetails.event.target instanceof Element &&
          eventDetails.event.target.closest('[role="menu"]')
        ) {
          eventDetails.cancel();
          return;
        }

        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <ContextMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          <History className="ll:h-4 ll:w-4 ll:mr-2" />
          {t("contextMenu.history")}
        </ContextMenuItem>
      </PopoverTrigger>
      <PopoverContent className="ll:w-80 ll:p-1" align="start" side="right">
        <TimerHistoryList
          history={history}
          isLoading={isLoading}
          onRestore={handleRestore}
          restorePending={restorePending}
          title={`${t("history.title")}${timer.npc?.name ? ` - ${timer.npc.name}` : ""}`}
        />
      </PopoverContent>
    </Popover>
  );
};
