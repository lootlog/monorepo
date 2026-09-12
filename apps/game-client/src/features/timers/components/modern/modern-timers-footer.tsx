import { Plus } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { RealtimeConnectionIndicator } from "@/components/realtime-connection-indicator";
import { WindowActionButton } from "@/components/window-action-button";
import type { TimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import { TimerHistoryButton } from "../shared/timer-history-button";
import { TimersColorStatistics } from "../shared/timers-color-statistics";

const ICON_SIZE = 14;

type ModernTimersFooterProps = {
  model: TimersWindowModel;
};

/** Colour totals and connection state on the left, history and add on the right. */
export const ModernTimersFooter: FC<ModernTimersFooterProps> = ({ model }) => {
  const { t } = useTranslation("timers");
  const { scope, list, actions } = model;

  return (
    <div className="ll:flex ll:h-7 ll:shrink-0 ll:items-center ll:gap-1 ll:border-0 ll:border-t ll:border-solid ll:border-gray-400/30 ll:px-1">
      <TimersColorStatistics colorStatistics={list.colorStatistics} />
      <RealtimeConnectionIndicator />
      <span className="ll:flex-1" />
      {!scope.isGrouping && scope.guildId && (
        <TimerHistoryButton guildId={scope.guildId} world={scope.world} />
      )}
      <WindowActionButton
        label={t("footer.addTimer")}
        onClick={actions.openAddTimer}
      >
        <Plus size={ICON_SIZE} aria-hidden="true" />
      </WindowActionButton>
    </div>
  );
};
