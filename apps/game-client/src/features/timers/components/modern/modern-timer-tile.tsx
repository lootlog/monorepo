import { cn } from "cn";
import { Loader2, Pin, RotateCcw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useTimerTileModel } from "@/features/timers/hooks/use-timer-tile-model";
import type { TimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import { formatLevelTag } from "@/features/timers/model/timer-labels";
import type { TimerWithTimeLeft } from "@/features/timers/model/timer-time";
import { TimerTileInteractions } from "../shared/timer-tile-interactions";
import { ModernTimerTileFace } from "./modern-timer-tile-face";

type ModernTimerTileProps = {
  timer: TimerWithTimeLeft;
  model: TimersWindowModel;
};

/**
 * One timer in the modern grid: a single row with a colour stripe, type badge,
 * name, level tag and countdown. Everything that ticks lives in the face; this
 * component re-renders only when the model or the timer changes.
 */
export const ModernTimerTile: FC<ModernTimerTileProps> = ({ timer, model }) => {
  const { t } = useTranslation("timers");
  const tile = useTimerTileModel(timer, model);
  const { modern } = model.appearance;
  const badge = modern.showTypeBadge ? tile.display.shortname : "";
  const levelTag = modern.showLevel ? formatLevelTag(timer.npc) : "";

  return (
    <TimerTileInteractions tile={tile} model={model}>
      <div
        role="listitem"
        className={cn(
          "ll-custom-cursor-pointer ll:relative ll:flex ll:min-h-(--ll-timers-row-min-height) ll:min-w-0 ll:items-stretch ll:overflow-hidden ll:rounded-sm ll:border ll:border-solid ll:border-l-2 ll:bg-secondary ll:transition-colors ll:motion-reduce:transition-none",
          tile.colors.style?.backgroundColor
            ? "ll:hover:bg-(--ll-tile-bg-hover)"
            : "ll:hover:bg-accent",
          tile.colors.className,
          tile.isHidden && "ll:opacity-50",
        )}
        style={tile.colors.style}
      >
        {tile.isPending && (
          <div className="ll:absolute ll:inset-0 ll:z-10 ll:flex ll:items-center ll:justify-center ll:bg-black/30">
            <Loader2
              aria-label={t("contextMenu.creating")}
              className="ll:size-3 ll:animate-spin ll:text-orange-400 ll:motion-reduce:animate-none"
            />
          </div>
        )}
        <div
          className={cn(
            "ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:gap-(--ll-timers-space-xs) ll:px-(--ll-timers-space-sm) ll:py-(--ll-timers-space-xs)",
            tile.isPending && "ll:opacity-60",
          )}
        >
          {timer.wasReset && (
            <RotateCcw
              aria-label={t("tooltip.reset")}
              className="ll:size-(--ll-timers-badge-font-size) ll:shrink-0 ll:text-sky-300"
            />
          )}
          {badge && (
            <span className="ll:shrink-0 ll:rounded-[2px] ll:bg-black/40 ll:px-(--ll-timers-space-xs) ll:text-(--ll-timers-badge-font-size) ll:leading-(--ll-timers-line-height) ll:font-semibold ll:tracking-wide ll:text-gray-200">
              {badge}
            </span>
          )}
          <span className="ll:min-w-0 ll:flex-1 ll:truncate ll:text-white">
            {timer.npc.name}
            {levelTag && (
              <span className="ll:ml-(--ll-timers-space-xs) ll:text-gray-400">
                {levelTag}
              </span>
            )}
          </span>
          {tile.actions.isPinned && (
            <Pin
              aria-label={t("contextMenu.unpin")}
              className="ll:size-(--ll-timers-badge-font-size) ll:shrink-0 ll:text-amber-200"
            />
          )}
          <ModernTimerTileFace
            key={`${timer.updatedAt ?? ""}:${timer.maxSpawnTime}`}
            timer={timer}
            countdownMode={model.appearance.countdownMode}
            showProgress={modern.showProgress}
          />
        </div>
      </div>
    </TimerTileInteractions>
  );
};
