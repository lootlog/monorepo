import { ContextMenuItem } from "@/components/ui/context-menu";
import {
  Popover,
  preservePopoverOnMenuPress,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTimerHistory } from "@/features/timers/hooks/use-timer-history";
import type { TimerWithTimeLeft } from "@/features/timers/model/timer-time";
import { History } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { TimerHistoryList } from "./timer-history-list";

type TimerHistoryMenuItemProps = {
  timer: TimerWithTimeLeft;
};

/** Context-menu entry that opens one timer's recent history beside the menu. */
export const TimerHistoryMenuItem: FC<TimerHistoryMenuItemProps> = ({
  timer,
}) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);

  const { history, isLoading, restoreTimer, restorePending } = useTimerHistory(
    { kind: "timer", timer },
    open,
    () => setOpen(false),
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
          onRestore={restoreTimer}
          restorePending={restorePending}
          title={`${t("history.title")}${timer.npc?.name ? ` - ${timer.npc.name}` : ""}`}
        />
      </PopoverContent>
    </Popover>
  );
};
