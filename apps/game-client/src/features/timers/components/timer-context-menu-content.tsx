import { ContextMenuItem } from "@/components/ui/context-menu";
import { DeleteTimerPopover } from "@/components/delete-timer-popover";
import type { TimerWithTimeLeft } from "@/features/timers/utils/timers-utils";
import {
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeOff,
} from "lucide-react";
import type { FC } from "react";
import { TimerColorPicker } from "./timer-color-picker";

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
  isSoundEnabled: boolean;
  canDelete: boolean;
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
  onToggleSound: () => void;
  onReset: () => void;
  onDelete: (guildId: string, npcId: number) => void;
};

export const TimerContextMenuContent: FC<TimerContextMenuContentProps> = ({
  timer,
  isPending,
  isPinned,
  isHidden,
  isSoundEnabled,
  canDelete,
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
  onToggleSound,
  onReset,
  onDelete,
}) => {
  if (isPending) {
    return (
      <div className="ll:p-4 ll:text-center ll:text-sm ll:text-gray-400">
        <Loader2 className="ll:h-4 ll:w-4 ll:animate-spin ll:mx-auto ll:mb-2 ll:text-orange-500" />
        <p>Tworzenie timera...</p>
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
      <ContextMenuItem onClick={onPin} className="ll:mt-1">
        {isPinned ? (
          <PinOff className="ll:h-4 ll:w-4 ll:mr-2" />
        ) : (
          <Pin className="ll:h-4 ll:w-4 ll:mr-2" />
        )}
        {isPinned ? "Odepnij" : "Przypnij"}
      </ContextMenuItem>
      <ContextMenuItem onClick={isPinned ? onUnpinAll : onPinAll}>
        <Globe className="ll:h-4 ll:w-4 ll:mr-2" />
        {isPinned ? "Odepnij wszędzie" : "Przypnij wszędzie"}
      </ContextMenuItem>
      <ContextMenuItem onClick={isHidden ? onShow : onHide}>
        {isHidden ? (
          <Eye className="ll:h-4 ll:w-4 ll:mr-2" />
        ) : (
          <EyeOff className="ll:h-4 ll:w-4 ll:mr-2" />
        )}
        {isHidden ? "Pokaż" : "Ukryj"}
      </ContextMenuItem>
      <ContextMenuItem onClick={isHidden ? onShowAll : onHideAll}>
        <Globe className="ll:h-4 ll:w-4 ll:mr-2" />
        {isHidden ? "Pokaż wszędzie" : "Ukryj wszędzie"}
      </ContextMenuItem>
      <ContextMenuItem onClick={onReset}>
        <RotateCcw className="ll:h-4 ll:w-4 ll:mr-2" />
        Odliczaj od początku
      </ContextMenuItem>
      <ContextMenuItem onClick={onToggleSound}>
        {isSoundEnabled ? (
          <VolumeOff className="ll:h-4 ll:w-4 ll:mr-2" />
        ) : (
          <Volume2 className="ll:h-4 ll:w-4 ll:mr-2" />
        )}
        {isSoundEnabled ? "Wyłącz dźwięk" : "Włącz dźwięk"}
      </ContextMenuItem>
      {timersGrouping ? (
        <DeleteTimerPopover timer={timer} onDeleteTimer={onDelete} />
      ) : (
        canDelete && (
          <ContextMenuItem onClick={() => onDelete(timer.guildId, timer.npcId)}>
            <Trash2 className="ll:h-4 ll:w-4 ll:mr-2" />
            Usuń timer
          </ContextMenuItem>
        )
      )}
    </>
  );
};
