import { ContextMenuItem } from "@/components/ui/context-menu";
import { DeleteTimerPopover } from "@/components/delete-timer-popover";
import {
  isManualTimer,
  type TimerWithTimeLeft,
} from "@/features/timers/utils/timers-utils";
import {
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { TimerColorPicker } from "./timer-color-picker";
import { TimerHistoryPopover } from "./timer-history-popover";

type CustomColor = {
  id: string;
  name: string;
  backgroundColor: string;
  borderColor: string;
};

type OverriddenColor = {
  backgroundColor: string;
  borderColor: string;
};

type TimerContextMenuContentProps = {
  timer: TimerWithTimeLeft;
  isPending: boolean;
  isPinned: boolean;
  isHidden: boolean;
  canDelete: boolean;
  canReset: boolean;
  timersGrouping: boolean;
  selectedColor: string;
  customColors: Record<string, CustomColor>;
  defaultColorNames: Record<string, string>;
  overriddenDefaultColors: Record<string, OverriddenColor>;
  hiddenDefaultColors: string[];
  onColorChange: (color: string) => void;
  onPin: () => void;
  onPinAll: () => void;
  onUnpinAll: () => void;
  onHide: () => void;
  onHideAll: () => void;
  onShow: () => void;
  onShowAll: () => void;
  isAlwaysVisibleExpiredTimer: boolean;
  onToggleAlwaysVisibleExpiredTimer: () => void;
  onReset: () => void;
  onDelete: (guildId: string, timerKey: string) => void;
};

export const TimerContextMenuContent: FC<TimerContextMenuContentProps> = ({
  timer,
  isPending,
  isPinned,
  isHidden,
  canDelete,
  canReset,
  timersGrouping,
  selectedColor,
  customColors,
  defaultColorNames,
  overriddenDefaultColors,
  hiddenDefaultColors,
  onColorChange,
  onPin,
  onPinAll,
  onUnpinAll,
  onHide,
  onHideAll,
  onShow,
  onShowAll,
  isAlwaysVisibleExpiredTimer,
  onToggleAlwaysVisibleExpiredTimer,
  onReset,
  onDelete,
}) => {
  const { t } = useTranslation("timers");
  const showAlwaysVisibleOption = !isManualTimer(timer);
  const showHistory = !timersGrouping && !isManualTimer(timer);

  if (isPending) {
    return (
      <div className="ll:p-4 ll:text-center ll:text-sm ll:text-muted-foreground">
        <Loader2 className="ll:h-4 ll:w-4 ll:animate-spin ll:mx-auto ll:mb-2 ll:text-orange-500" />
        <p>{t("contextMenu.creating")}</p>
      </div>
    );
  }

  return (
    <>
      <TimerColorPicker
        selectedColor={selectedColor}
        customColors={customColors}
        defaultColorNames={defaultColorNames}
        overriddenDefaultColors={overriddenDefaultColors}
        hiddenDefaultColors={hiddenDefaultColors}
        onColorChange={onColorChange}
      />
      <ContextMenuItem
        onClick={onPin}
        data-active={isPinned}
        className="ll:text-white ll:data-[active=true]:bg-primary ll:data-[active=true]:text-primary-foreground ll:data-[active=true]:data-[highlighted]:bg-primary/90 ll:data-[active=true]:hover:bg-primary/90 ll:data-[active=true]:focus-visible:bg-primary/90"
      >
        {isPinned ? (
          <PinOff className="ll:h-4 ll:w-4 ll:mr-2" />
        ) : (
          <Pin className="ll:h-4 ll:w-4 ll:mr-2" />
        )}
        {isPinned ? t("contextMenu.unpin") : t("contextMenu.pin")}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={isPinned ? onUnpinAll : onPinAll}
        className="ll:text-white"
      >
        <Globe className="ll:h-4 ll:w-4 ll:mr-2" />
        {isPinned ? t("contextMenu.unpinAll") : t("contextMenu.pinAll")}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={isHidden ? onShow : onHide}
        data-active={isHidden}
        className="ll:text-white ll:data-[active=true]:bg-primary ll:data-[active=true]:text-primary-foreground ll:data-[active=true]:data-[highlighted]:bg-primary/90 ll:data-[active=true]:hover:bg-primary/90 ll:data-[active=true]:focus-visible:bg-primary/90"
      >
        {isHidden ? (
          <Eye className="ll:h-4 ll:w-4 ll:mr-2" />
        ) : (
          <EyeOff className="ll:h-4 ll:w-4 ll:mr-2" />
        )}
        {isHidden ? t("contextMenu.show") : t("contextMenu.hide")}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={isHidden ? onShowAll : onHideAll}
        className="ll:text-white"
      >
        <Globe className="ll:h-4 ll:w-4 ll:mr-2" />
        {isHidden ? t("contextMenu.showAll") : t("contextMenu.hideAll")}
      </ContextMenuItem>
      {showAlwaysVisibleOption && (
        <ContextMenuItem
          onClick={onToggleAlwaysVisibleExpiredTimer}
          data-active={isAlwaysVisibleExpiredTimer}
          className="ll:text-white ll:data-[active=true]:bg-primary ll:data-[active=true]:text-primary-foreground ll:data-[active=true]:data-[highlighted]:bg-primary/90 ll:data-[active=true]:hover:bg-primary/90 ll:data-[active=true]:focus-visible:bg-primary/90"
        >
          {isAlwaysVisibleExpiredTimer ? (
            <EyeOff className="ll:h-4 ll:w-4 ll:mr-2" />
          ) : (
            <Eye className="ll:h-4 ll:w-4 ll:mr-2" />
          )}
          {isAlwaysVisibleExpiredTimer
            ? t("contextMenu.hideAlways")
            : t("contextMenu.showAlways")}
        </ContextMenuItem>
      )}
      {canReset && (
        <ContextMenuItem onClick={onReset} className="ll:text-emerald-300">
          <RotateCcw className="ll:h-4 ll:w-4 ll:mr-2" />
          {t("contextMenu.restart")}
        </ContextMenuItem>
      )}
      {showHistory && <TimerHistoryPopover timer={timer} />}
      {timersGrouping ? (
        <DeleteTimerPopover timer={timer} onDeleteTimer={onDelete} />
      ) : (
        canDelete && (
          <ContextMenuItem
            className="ll:text-red-300 ll:hover:bg-red-500/20 ll:data-[highlighted]:bg-red-500/20 ll:focus-visible:bg-red-500/20"
            onClick={() => onDelete(timer.guildId, timer.timerKey)}
          >
            <Trash2 className="ll:h-4 ll:w-4 ll:mr-2" />
            {t("contextMenu.delete")}
          </ContextMenuItem>
        )
      )}
    </>
  );
};
