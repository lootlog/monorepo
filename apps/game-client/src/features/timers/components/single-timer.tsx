import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tile } from "@/components/ui/tile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { cn } from "@/lib/utils";
import { useTimersStore } from "@/store/timers.store";
import { parseMsToTime } from "@/utils/parse-ms-to-time";
import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { useTimerActions } from "../hooks/use-timer-actions";
import { useTimerDisplay } from "../hooks/use-timer-display";
import { TimerContextMenuContent } from "./timer-context-menu-content";
import { TimerTooltip } from "./timer-tooltip";
import { REQUIRED_DELETE_PERMISSIONS } from "../constants/required-delete-permissions";
import { Game } from "@/lib/game";
import { REQUIRED_RESET_PERMISSIONS } from "@/features/timers/constants/required-reset-permissions";
import type { GuildsControllerGetGuildPermissions200Item } from "@/lib/api/generated/main/model";
import { useShallow } from "zustand/react/shallow";

type SingleTimerProps = {
  guildIds: string[];
  guildNamesById: Record<string, string>;
  guildPermissions: GuildsControllerGetGuildPermissions200Item[];
  timer: TimerWithTimeLeft;
  settingsKey: string;
  minTimeLeft?: number;
  maxTimeLeft?: number;
  isHidden?: boolean;
};

export const SingleTimer: FC<SingleTimerProps> = ({
  guildIds,
  guildNamesById,
  guildPermissions,
  timer,
  minTimeLeft = 0,
  maxTimeLeft = 0,
  settingsKey,
  isHidden = false,
}) => {
  const world = Game.getWorldName();
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

  const canDelete = REQUIRED_DELETE_PERMISSIONS.some((perm) =>
    guildPermissions.includes(perm),
  );

  const canReset = REQUIRED_RESET_PERMISSIONS.some((perm) =>
    guildPermissions.includes(perm),
  );

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
    isMinSpawnTime,
    hasPassedRedThreshold,
    selectedColor,
    customColor,
    overriddenColor,
    resetIndicator,
    shortname,
    npcDetails,
    timeLeft,
    displayConfig,
  } = useTimerDisplay(timer, minTimeLeft, maxTimeLeft);

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
              <Tile
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
              >
                <span
                  className={cn(
                    "ll:flex ll:justify-between ll:w-full ll:text-[11px] ll:px-1 ll:box-border ll:h-full ll:min-w-0",
                    {
                      "ll:text-red-500": hasPassedRedThreshold,
                      "ll:text-orange-400":
                        isMinSpawnTime && !hasPassedRedThreshold,
                      "ll:text-white":
                        !hasPassedRedThreshold && !isMinSpawnTime,
                      "ll:py-1": document.body.classList.contains("si"),
                      "ll:flex-col ll:py-0 ll:px-0 ll:leading-[1.05] ll:items-center":
                        displayConfig.singleTimerDisplayMode === "column",
                      "ll:opacity-60 ll:blur-[0.5px]": isPending,
                    },
                  )}
                >
                  <span
                    className={cn(
                      "ll:whitespace-nowrap ll:truncate ll:min-w-0 ll:max-w-full",
                      {
                        "ll:w-full ll:text-center":
                          displayConfig.singleTimerDisplayMode === "column",
                      },
                    )}
                    style={{
                      fontSize: `${displayConfig.fontSize}px`,
                    }}
                  >
                    {resetIndicator}
                    {shortname} {timer.npc.name} {npcDetails}
                  </span>
                  <div
                    style={{
                      fontSize: `${displayConfig.fontSize}px`,
                    }}
                  >
                    {parseMsToTime(timeLeft)}
                  </div>
                </span>
              </Tile>
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
