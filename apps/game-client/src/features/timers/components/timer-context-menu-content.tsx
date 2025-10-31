import { ContextMenuItem } from "@/components/ui/context-menu";
import { DeleteTimerPopover } from "@/components/delete-timer-popover";
import type { Timer } from "@/hooks/api/use-timers";
import { Loader2 } from "lucide-react";
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
  timer: Timer;
  isPending: boolean;
  isPinned: boolean;
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
  onReset: () => void;
  onDelete: (guildIdOverride?: string) => void;
};

export const TimerContextMenuContent: FC<TimerContextMenuContentProps> = ({
  timer,
  isPending,
  isPinned,
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
      <ContextMenuItem onClick={onPin}>
        {isPinned ? "Odepnij" : "Przypnij"}
      </ContextMenuItem>
      <ContextMenuItem onClick={isPinned ? onUnpinAll : onPinAll}>
        {isPinned
          ? "Odepnij na wszystkich serwerach"
          : "Przypnij na wszystkich serwerach"}
      </ContextMenuItem>
      <ContextMenuItem onClick={onHide}>Ukryj</ContextMenuItem>
      <ContextMenuItem onClick={onHideAll}>
        Ukryj na wszystkich serwerach
      </ContextMenuItem>
      <ContextMenuItem onClick={onReset}>Odliczaj od początku</ContextMenuItem>
      {timersGrouping ? (
        <DeleteTimerPopover timer={timer} onDeleteTimer={onDelete} />
      ) : (
        canDelete && (
          <ContextMenuItem onClick={() => onDelete()}>
            Usuń timer
          </ContextMenuItem>
        )
      )}
      <ContextMenuItem disabled>Włącz dźwięk</ContextMenuItem>
    </>
  );
};
