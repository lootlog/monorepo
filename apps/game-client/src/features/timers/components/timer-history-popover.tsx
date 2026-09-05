import { useRestoreTimer } from "../hooks/use-restore-timer";
import { ContextMenuItem } from "@/components/ui/context-menu";
import {
  Popover,
  preservePopoverOnMenuPress,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getTimersControllerGetTimerHistoryQueryKey,
  useTimersControllerGetTimerHistory,
} from "@lootlog/client/main";

import type { TimerWithTimeLeft } from "@/features/timers/utils/timers-utils";
import { History } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { TimerHistoryList } from "./timer-history-list";

type TimerHistoryPopoverProps = {
  timer: TimerWithTimeLeft;
};

export const TimerHistoryPopover: FC<TimerHistoryPopoverProps> = ({
  timer,
}) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);
  const { restoreTimer: handleRestore, isPending: restorePending } =
    useRestoreTimer(() => setOpen(false));
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

  return (
    <Popover open={open} onOpenChange={preservePopoverOnMenuPress(setOpen)}>
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
