import { useRestoreTimer } from "../hooks/use-restore-timer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getTimersControllerGetRecentTimerHistoryQueryKey,
  useTimersControllerGetRecentTimerHistory,
} from "@lootlog/client/main";

import { History } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { TimerHistoryList } from "./timer-history-list";

type GlobalTimerHistoryPopoverProps = {
  guildId: string;
  world: string;
};

const GLOBAL_TIMER_HISTORY_LIMIT = 10;

const ICON_SIZE = 14;

export const GlobalTimerHistoryPopover: FC<GlobalTimerHistoryPopoverProps> = ({
  guildId,
  world,
}) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);

  const { restoreTimer: handleRestore, isPending: restorePending } =
    useRestoreTimer(() => setOpen(false));

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

  const historyLabel = t("toolbar.history");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton label={historyLabel}>
          <History size={ICON_SIZE} aria-hidden="true" />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent className="ll:w-80 ll:p-1" align="start" side="bottom">
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
