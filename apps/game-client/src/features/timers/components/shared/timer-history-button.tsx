import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { WindowActionButton } from "@/components/window-action-button";
import { useTimerHistory } from "@/features/timers/hooks/use-timer-history";
import { History } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { TimerHistoryList } from "./timer-history-list";

const ICON_SIZE = 14;

type TimerHistoryButtonProps = {
  guildId: string;
  world: string;
  className?: string;
};

/** Footer button that opens the organization's recent timer history. */
export const TimerHistoryButton: FC<TimerHistoryButtonProps> = ({
  guildId,
  world,
  className,
}) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);

  const { history, isLoading, restoreTimer, restorePending } = useTimerHistory(
    { kind: "guild", guildId, world },
    open,
    () => setOpen(false),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <WindowActionButton label={t("toolbar.history")} className={className}>
          <History size={ICON_SIZE} aria-hidden="true" />
        </WindowActionButton>
      </PopoverTrigger>
      <PopoverContent className="ll:w-80 ll:p-1" align="end" side="top">
        <TimerHistoryList
          history={history}
          isLoading={isLoading}
          onRestore={restoreTimer}
          restorePending={restorePending}
          rowLayout="npcWithMember"
          title={t("history.globalTitle")}
        />
      </PopoverContent>
    </Popover>
  );
};
