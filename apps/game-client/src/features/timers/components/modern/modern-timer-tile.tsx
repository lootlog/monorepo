import { cn } from "cn";
import { Loader2, Pin, RotateCcw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useTimerTileModel } from "@/features/timers/hooks/use-timer-tile-model";
import type { TimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import { resolveTimerRowColors } from "@/features/timers/model/timer-colors";
import { formatLevelTag } from "@/features/timers/model/timer-labels";
import type { TimerWithTimeLeft } from "@/features/timers/model/timer-time";
import { getSubtleBackgroundColor } from "@/utils/notifications-and-detector/background";
import { TimerTileInteractions } from "../shared/timer-tile-interactions";
import { ModernTimerTileFace } from "./modern-timer-tile-face";

type ModernTimerTileProps = {
  timer: TimerWithTimeLeft;
  model: TimersWindowModel;
};

/**
 * One timer as a chat-style bubble: the row is tinted with the NPC rank
 * colour from the user's palette, or with the colour the player assigned to
 * the timer when there is one; the countdown sits on the right. Only the face ticks; this component re-renders with the model
 * or timer.
 */
export const ModernTimerTile: FC<ModernTimerTileProps> = ({ timer, model }) => {
  const { t } = useTranslation("timers");
  const tile = useTimerTileModel(timer, model);
  const { modern, npcTypeColors } = model.appearance;
  const assigned = resolveTimerRowColors(tile.display);

  const rowStyle = assigned.style ?? {
    backgroundColor: getSubtleBackgroundColor(timer.npc.type, npcTypeColors),
  };

  return (
    <TimerTileInteractions tile={tile} model={model}>
      <div
        role="listitem"
        className={cn(
          "ll-custom-cursor-pointer ll:relative ll:flex ll:min-h-(--ll-timers-row-min-height) ll:min-w-0 ll:items-center ll:gap-(--ll-timers-space-sm) ll:overflow-hidden ll:px-(--ll-timers-row-padding-x) ll:py-(--ll-timers-row-padding-y) ll:transition-[filter] ll:duration-100 ll:hover:brightness-125 ll:motion-reduce:transition-none",
          assigned.className,
          tile.isHidden && "ll:opacity-50",
          tile.isPending && "ll:opacity-60",
        )}
        style={rowStyle}
      >
        {tile.isPending ? (
          <Loader2
            aria-label={t("contextMenu.creating")}
            className="ll:size-(--ll-timers-badge-font-size) ll:shrink-0 ll:animate-spin ll:text-orange-300 ll:motion-reduce:animate-none"
          />
        ) : timer.wasReset ? (
          <RotateCcw
            aria-label={t("tooltip.reset")}
            className="ll:size-(--ll-timers-badge-font-size) ll:shrink-0 ll:text-sky-300"
          />
        ) : null}
        <ModernTimerTileFace
          timer={timer}
          countdownMode={model.appearance.countdownMode}
          badge={modern.showTypeBadge ? tile.display.shortname : ""}
          levelTag={modern.showLevel ? formatLevelTag(timer.npc) : ""}
        />
        {tile.actions.isPinned && (
          <Pin
            aria-label={t("contextMenu.unpin")}
            className="ll:size-(--ll-timers-badge-font-size) ll:shrink-0 ll:text-amber-200"
          />
        )}
      </div>
    </TimerTileInteractions>
  );
};
