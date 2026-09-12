import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RealtimeConnectionIndicator } from "@/components/realtime-connection-indicator";
import type { TimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import { TimerHistoryButton } from "../shared/timer-history-button";
import { TimersColorStatistics } from "../shared/timers-color-statistics";

type LegacyTimersFooterProps = {
  model: TimersWindowModel;
};

export const LegacyTimersFooter: FC<LegacyTimersFooterProps> = ({ model }) => {
  const { t } = useTranslation("timers");
  const { scope, list, actions } = model;

  return (
    <div className="ll:flex ll:items-center ll:pt-1 ll:pb-0.5 ll:px-1 ll:h-6 ll:w-full ll:relative">
      <TimersColorStatistics
        colorStatistics={list.colorStatistics}
        className="ll:absolute ll:left-1"
      />
      <RealtimeConnectionIndicator className="ll:absolute ll:left-6" />
      {!scope.isGrouping && scope.guildId && (
        <div className="ll:absolute ll:right-5 ll:flex ll:items-center">
          <TimerHistoryButton guildId={scope.guildId} world={scope.world} />
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="xs"
            type="button"
            className="ll:text-[12px] ll:border ll:border-gray-400 ll:px-4 ll-custom-cursor-pointer ll:mx-auto"
            onClick={actions.openAddTimer}
          >
            +
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{t("footer.addTimer")}</TooltipContent>
      </Tooltip>
    </div>
  );
};
