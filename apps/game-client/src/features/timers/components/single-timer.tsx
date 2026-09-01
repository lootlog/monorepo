import type { AccessPolicy } from "@lootlog/access-policy";
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
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { cn } from "@/lib/utils";
import { useTimersStore } from "@/store/timers.store";
import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { useTimerActions } from "../hooks/use-timer-actions";
import { useTimerDisplay } from "../hooks/use-timer-display";
import { TimerContextMenuContent } from "./timer-context-menu-content";
import { TimerTooltip } from "./timer-tooltip";
import { TimerLiveTile } from "./timer-live-tile";
import { REQUIRED_DELETE_PERMISSIONS } from "../constants/required-delete-permissions";
import { useGameStore } from "@/store/game.store";
import { REQUIRED_RESET_PERMISSIONS } from "@/features/timers/constants/required-reset-permissions";
import { useShallow } from "zustand/react/shallow";

type SingleTimerProps = {
  guildIds: string[];
  guildNamesById: Record<string, string>;
  accessPolicy: AccessPolicy | undefined;
  timer: TimerWithTimeLeft;
  settingsKey: string;
  isHidden?: boolean;
};

export const SingleTimer: FC<SingleTimerProps> = ({
  guildIds,
  guildNamesById,
  accessPolicy,
  timer,
  settingsKey,
  isHidden = false,
}) => {
  const world = useGameStore((state) => state.game?.world ?? "unknown");
  const {
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
    hiddenDefaultColors,
    timersGrouping,
  } = useTimersStore(
    useShallow((state) => ({
      customColors: state.customColors,
      defaultColorNames: state.defaultColorNames,
      overriddenDefaultColors: state.overriddenDefaultColors,
      hiddenDefaultColors: state.hiddenDefaultColors,
      timersGrouping: state.generalConfig.timersGrouping,
    })),
  );

  const canDelete =
    accessPolicy?.allowsAny(REQUIRED_DELETE_PERMISSIONS) ?? false;

  const canReset = accessPolicy?.allowsAny(REQUIRED_RESET_PERMISSIONS) ?? false;

  const {
    isPinned,
    handleHideTimer,
    handleHideTimerForAll,
    handleShowTimer,
    handleShowTimerForAll,
    handlePinTimer,
    handlePinTimerForAll,
    handleUnpinTimerForAll,
    handleTimerColorChange,
    isAlwaysVisibleExpiredTimer,
    handleToggleAlwaysVisibleExpiredTimer,
    handleRestartTimer,
    handleDeleteTimer,
  } = useTimerActions(timer, settingsKey, world, guildIds, timersGrouping);

  const {
    isPending,
    selectedColor,
    customColor,
    overriddenColor,
    resetIndicator,
    shortname,
    npcDetails,
    displayConfig,
    countdownMode,
  } = useTimerDisplay(timer);

  return (
    <Tooltip>
      <ContextMenu>
        <TooltipTrigger asChild>
          <ContextMenuTrigger className="ll:h-full ll:pr-px">
            <div
              className={cn("ll:relative ll:h-full", {
                "ll:opacity-50": isHidden,
              })}
            >
              {isPending && (
                <div className="ll:absolute ll:inset-0 ll:flex ll:items-center ll:justify-center ll:z-10 ll:bg-black/20">
                  <Loader2 className="ll:h-3 ll:w-3 ll:animate-spin ll:text-orange-500" />
                </div>
              )}
              <TimerLiveTile
                id={timer.npc.id.toString()}
                color={
                  customColor || overriddenColor ? undefined : selectedColor
                }
                customBorderColor={
                  customColor?.borderColor || overriddenColor?.borderColor
                }
                customBackgroundColor={
                  customColor?.backgroundColor ||
                  overriddenColor?.backgroundColor
                }
                displayMode={displayConfig.singleTimerDisplayMode}
                fontSize={displayConfig.fontSize}
                isPending={isPending}
                label={`${resetIndicator}${shortname} ${timer.npc.name} ${npcDetails}`}
                countdownMode={countdownMode}
                timer={timer}
              />
            </div>
          </ContextMenuTrigger>
        </TooltipTrigger>

        <ContextMenuContent className="ll:w-40 ll:flex ll:flex-col">
          <TimerContextMenuContent
            timer={timer}
            isPending={isPending}
            isPinned={isPinned}
            isHidden={isHidden}
            canDelete={canDelete}
            canReset={canReset}
            timersGrouping={timersGrouping}
            selectedColor={selectedColor}
            customColors={customColors}
            defaultColorNames={defaultColorNames}
            overriddenDefaultColors={overriddenDefaultColors}
            hiddenDefaultColors={hiddenDefaultColors}
            onColorChange={handleTimerColorChange}
            onPin={handlePinTimer}
            onPinAll={handlePinTimerForAll}
            onUnpinAll={handleUnpinTimerForAll}
            onHide={handleHideTimer}
            onHideAll={handleHideTimerForAll}
            onShow={handleShowTimer}
            onShowAll={handleShowTimerForAll}
            isAlwaysVisibleExpiredTimer={isAlwaysVisibleExpiredTimer}
            onToggleAlwaysVisibleExpiredTimer={
              handleToggleAlwaysVisibleExpiredTimer
            }
            onReset={handleRestartTimer}
            onDelete={handleDeleteTimer}
          />
        </ContextMenuContent>
      </ContextMenu>

      <TooltipContent side="right" className="ll:z-500">
        <TimerTooltip timer={timer} guildNamesById={guildNamesById} />
      </TooltipContent>
    </Tooltip>
  );
};
