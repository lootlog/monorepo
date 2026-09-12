import { cn } from "cn";
import { Loader2, Pin, RotateCcw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useTimerTileModel } from "@/features/timers/hooks/use-timer-tile-model";
import type { TimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import { resolveTimerRowColors } from "@/features/timers/model/timer-colors";
import { formatLevelTag } from "@/features/timers/model/timer-labels";
import type { TimerWithTimeLeft } from "@/features/timers/model/timer-time";
import { TimerTileInteractions } from "../shared/timer-tile-interactions";
import { ModernTimerTileFace } from "./modern-timer-tile-face";

type ModernTimerTileProps = {
  timer: TimerWithTimeLeft;
  model: TimersWindowModel;
};

/**
 * One timer as a chat-like row: no box, the assigned colour as a background
 * tint, a grey type prefix and level tag, the countdown on the right. Only
 * the face ticks; this component re-renders when the model or timer changes.
 */
export const ModernTimerTile: FC<ModernTimerTileProps> = ({ timer, model }) => {
  const { t } = useTranslation("timers");
  const tile = useTimerTileModel(timer, model);
  const { modern } = model.appearance;
  const badge = modern.showTypeBadge ? tile.display.shortname : "";
  const levelTag = modern.showLevel ? formatLevelTag(timer.npc) : "";
  const rowColors = resolveTimerRowColors(tile.display);

  return (
    <TimerTileInteractions tile={tile} model={model}>
      <div
        role="listitem"
        className={cn(
          "ll-custom-cursor-pointer ll:relative ll:flex ll:min-h-(--ll-timers-row-min-height) ll:min-w-0 ll:items-center ll:gap-(--ll-timers-space-xs) ll:px-(--ll-timers-space-sm) ll:py-(--ll-timers-space-xs) ll:text-foreground ll:transition-colors ll:duration-100 ll:motion-reduce:transition-none",
          rowColors.style?.backgroundColor
            ? "ll:hover:bg-(--ll-tile-bg-hover)"
            : !rowColors.className && "ll:hover:bg-white/5",
          rowColors.className,
          tile.isHidden && "ll:opacity-50",
          tile.isPending && "ll:opacity-60",
        )}
        style={rowColors.style}
      >
        {tile.isPending ? (
          <Loader2
            aria-label={t("contextMenu.creating")}
            className="ll:size-(--ll-timers-badge-font-size) ll:shrink-0 ll:animate-spin ll:text-orange-400 ll:motion-reduce:animate-none"
          />
        ) : timer.wasReset ? (
          <RotateCcw
            aria-label={t("tooltip.reset")}
            className="ll:size-(--ll-timers-badge-font-size) ll:shrink-0 ll:text-sky-300/80"
          />
        ) : null}
        {badge && (
          <span className="ll:shrink-0 ll:text-(--ll-timers-badge-font-size) ll:text-muted-foreground">
            {badge}
          </span>
        )}
        <span className="ll:min-w-0 ll:flex-1 ll:truncate">
          {timer.npc.name}
          {levelTag && (
            <span className="ll:ml-(--ll-timers-space-xs) ll:text-(--ll-timers-badge-font-size) ll:text-muted-foreground">
              {levelTag}
            </span>
          )}
        </span>
        {tile.actions.isPinned && (
          <Pin
            aria-label={t("contextMenu.unpin")}
            className="ll:size-(--ll-timers-badge-font-size) ll:shrink-0 ll:text-amber-200/80"
          />
        )}
        <ModernTimerTileFace
          key={`${timer.updatedAt ?? ""}:${timer.maxSpawnTime}`}
          timer={timer}
          countdownMode={model.appearance.countdownMode}
          showProgress={modern.showProgress}
        />
      </div>
    </TimerTileInteractions>
  );
};
