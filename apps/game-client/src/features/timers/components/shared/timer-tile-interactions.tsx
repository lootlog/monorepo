import type { FC, ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TimerTileModel } from "@/features/timers/hooks/use-timer-tile-model";
import type { TimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import { TimerContextMenuContent } from "./timer-context-menu-content";
import { TimerTooltip } from "./timer-tooltip";

type TimerTileInteractionsProps = {
  tile: TimerTileModel;
  model: TimersWindowModel;
  /** The layout's visual tile; it must stay outside this wrapper's re-render path. */
  children: ReactNode;
};

/** Tooltip and context menu shared by every layout's tile. */
export const TimerTileInteractions: FC<TimerTileInteractionsProps> = ({
  tile,
  model,
  children,
}) => {
  const { timer, display, actions } = tile;

  return (
    <Tooltip>
      <ContextMenu>
        <TooltipTrigger asChild>
          <ContextMenuTrigger className="ll:h-full ll:pr-px">
            {children}
          </ContextMenuTrigger>
        </TooltipTrigger>
        <ContextMenuContent className="ll:w-40 ll:flex ll:flex-col">
          <TimerContextMenuContent
            timer={timer}
            isPending={tile.isPending}
            isPinned={actions.isPinned}
            isHidden={tile.isHidden}
            canDelete={tile.canDelete}
            canReset={tile.canReset}
            timersGrouping={model.scope.isGrouping}
            selectedColor={display.selectedColor}
            colors={model.appearance.colors}
            access={model.access}
            onColorChange={actions.handleTimerColorChange}
            onPin={actions.handlePinTimer}
            onPinAll={actions.handlePinTimerForAll}
            onUnpinAll={actions.handleUnpinTimerForAll}
            onHide={actions.handleHideTimer}
            onHideAll={actions.handleHideTimerForAll}
            onShow={actions.handleShowTimer}
            onShowAll={actions.handleShowTimerForAll}
            isAlwaysVisibleExpiredTimer={actions.isAlwaysVisibleExpiredTimer}
            onToggleAlwaysVisibleExpiredTimer={
              actions.handleToggleAlwaysVisibleExpiredTimer
            }
            onReset={actions.handleRestartTimer}
            onDelete={actions.handleDeleteTimer}
          />
        </ContextMenuContent>
      </ContextMenu>
      <TooltipContent side="right" className="ll:z-500">
        <TimerTooltip
          timer={timer}
          guildNamesById={model.access.guildNamesById}
        />
      </TooltipContent>
    </Tooltip>
  );
};
