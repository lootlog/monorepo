import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { openContextMenuOnKeyDown } from "@/components/ui/context-menu";
import { TooltipTrigger } from "@/components/ui/tooltip";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { cn } from "cn";
import { useTimersStore } from "@/store/timers.store";
import { Loader2 } from "lucide-react";
import { useLayoutEffect, type FC } from "react";
import { useTimerActions } from "../hooks/use-timer-actions";
import { useTimerDisplay } from "../hooks/use-timer-display";
import { useTimerNpcPresence } from "../hooks/use-timer-npc-presence";
import type { TimerContextMenuContentProps } from "./timer-context-menu-content";
import { useTimerPopups } from "./timer-popups-context";
import { TimerLiveTile } from "./timer-live-tile";
import { REQUIRED_DELETE_PERMISSIONS } from "../constants/required-delete-permissions";
import { REQUIRED_RESET_PERMISSIONS } from "@/features/timers/constants/required-reset-permissions";
import { useShallow } from "zustand/react/shallow";
import { TimerMapPlayersAdornment } from "./timer-map-players-adornment";
import {
  useTimerMapPresence,
  useTimerMapThreat,
} from "./timer-map-presence-provider";

type SingleTimerProps = {
  /** Identifies the tile to the grid's shared tooltip and context menu. */
  popupKey: string;
  guildIds: string[];
  guildNamesById: Record<string, string>;
  accessPolicy: AccessPolicy | undefined;
  timer: TimerWithTimeLeft;
  settingsKey: string;
  isHidden?: boolean;
  showColorStripe?: boolean;
};

export const SingleTimer: FC<SingleTimerProps> = ({
  popupKey,
  guildIds,
  guildNamesById,
  accessPolicy,
  timer,
  settingsKey,
  isHidden = false,
  showColorStripe = true,
}) => {
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
    isRestartingTimer,
    isDeletingTimer,
    beginRestartAttempt,
  } = useTimerActions(timer, settingsKey, guildIds, timersGrouping);

  const {
    isPending,
    selectedColor,
    paint,
    resetIndicator,
    shortname,
    npcDetails,
    displayConfig,
    countdownMode,
  } = useTimerDisplay(timer);

  const { menuRegistry, tooltipHandle } = useTimerPopups();
  const occupancy = useTimerMapPresence(timer);
  const threat = useTimerMapThreat(timer);
  const isStanding = useTimerNpcPresence(timer);

  const menuProps: TimerContextMenuContentProps = {
    timer,
    isPending,
    isPinned,
    isHidden,
    canDelete,
    canReset,
    actionPending: isRestartingTimer || isDeletingTimer,
    guildNamesById,
    timersGrouping,
    selectedColor,
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
    hiddenDefaultColors,
    onColorChange: handleTimerColorChange,
    onPin: handlePinTimer,
    onPinAll: handlePinTimerForAll,
    onUnpinAll: handleUnpinTimerForAll,
    onHide: handleHideTimer,
    onHideAll: handleHideTimerForAll,
    onShow: handleShowTimer,
    onShowAll: handleShowTimerForAll,
    isAlwaysVisibleExpiredTimer,
    onToggleAlwaysVisibleExpiredTimer: handleToggleAlwaysVisibleExpiredTimer,
    onReset: handleRestartTimer,
    onResetBegin: beginRestartAttempt,
    onDelete: handleDeleteTimer,
  };

  // The tile keeps its actions and their in-flight state; the grid's shared
  // menu shows the latest props of the tile it was opened on.
  useLayoutEffect(() => {
    menuRegistry.set(popupKey, menuProps);
  });

  useLayoutEffect(
    () => () => menuRegistry.delete(popupKey),
    [menuRegistry, popupKey],
  );

  return (
    <TooltipTrigger handle={tooltipHandle} payload={popupKey} asChild>
      <div
        data-timer-popup-key={popupKey}
        tabIndex={0}
        onKeyDown={openContextMenuOnKeyDown}
        className="ll:h-full ll:rounded-[2px] ll:outline-none ll:focus-visible:outline-2 ll:focus-visible:-outline-offset-2 ll:focus-visible:outline-ring"
      >
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
            paint={paint}
            legacyAppearance={displayConfig.legacyAppearance}
            showColorStripe={showColorStripe}
            displayMode={displayConfig.singleTimerDisplayMode}
            fontSize={displayConfig.fontSize}
            isPending={isPending}
            isStanding={isStanding}
            label={`${resetIndicator}${shortname} ${timer.npc.name} ${npcDetails}`}
            countdownMode={countdownMode}
            timer={timer}
            timeAdornment=<TimerMapPlayersAdornment
              occupancy={occupancy}
              threat={threat}
            />
          />
        </div>
      </div>
    </TooltipTrigger>
  );
};
