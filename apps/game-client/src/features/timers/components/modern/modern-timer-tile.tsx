import { cn } from "cn";
import { Loader2, Pin, RotateCcw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { NpcTile } from "@/components/npc-tile";
import { useTimerTileModel } from "@/features/timers/hooks/use-timer-tile-model";
import type { TimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import { resolveTimerAccentColor } from "@/features/timers/model/timer-colors";
import { formatLevelTag } from "@/features/timers/model/timer-labels";
import type { TimerWithTimeLeft } from "@/features/timers/model/timer-time";
import {
  getSubtleBackgroundColor,
  getTextColor,
} from "@/utils/notifications-and-detector/background";
import { TimerTileInteractions } from "../shared/timer-tile-interactions";
import { ModernTimerTileFace } from "./modern-timer-tile-face";

type ModernTimerTileProps = {
  timer: TimerWithTimeLeft;
  model: TimersWindowModel;
};

/**
 * One timer as a chat-style bubble: the row is tinted with the NPC rank
 * colour from the user's palette, the name carries the same colour, the
 * sprite sits on the left and the countdown on the right. A colour the
 * player assigned to the timer becomes a narrow accent on the left edge.
 * Only the face ticks; this component re-renders with the model or timer.
 */
export const ModernTimerTile: FC<ModernTimerTileProps> = ({ timer, model }) => {
  const { t } = useTranslation("timers");
  const tile = useTimerTileModel(timer, model);
  const { modern, npcTypeColors } = model.appearance;
  const rankColor = getTextColor(timer.npc.type, true, npcTypeColors);

  const rankBackground = getSubtleBackgroundColor(
    timer.npc.type,
    npcTypeColors,
  );

  const accentColor = resolveTimerAccentColor(tile.display);
  const badge = modern.showTypeBadge ? tile.display.shortname : "";
  const levelTag = modern.showLevel ? formatLevelTag(timer.npc) : "";

  return (
    <TimerTileInteractions tile={tile} model={model}>
      <div
        role="listitem"
        className={cn(
          "ll-custom-cursor-pointer ll:relative ll:isolate ll:flex ll:min-h-(--ll-timers-row-min-height) ll:min-w-0 ll:items-center ll:gap-(--ll-timers-space-sm) ll:overflow-hidden ll:rounded-sm ll:pe-(--ll-timers-space-sm) ll:text-foreground ll:transition-[filter] ll:duration-100 ll:hover:brightness-125 ll:motion-reduce:transition-none",
          accentColor
            ? "ll:ps-(--ll-timers-space-sm)"
            : "ll:ps-(--ll-timers-space-xs)",
          tile.isHidden && "ll:opacity-50",
          tile.isPending && "ll:opacity-60",
        )}
        style={{
          backgroundColor: rankBackground,
          boxShadow: accentColor ? `inset 3px 0 0 ${accentColor}` : undefined,
        }}
      >
        {modern.showAvatar && (
          <NpcTile
            npc={{ icon: timer.npc.icon, nick: timer.npc.name }}
            containerClassName="ll:h-(--ll-timers-avatar-height) ll:w-(--ll-timers-avatar-width) ll:shrink-0 ll:items-center ll:justify-center"
            className="ll:h-auto ll:max-h-(--ll-timers-avatar-height) ll:w-auto ll:max-w-(--ll-timers-avatar-width) ll:rounded-none ll:object-contain"
          />
        )}
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
        <span className="ll:flex ll:min-w-0 ll:flex-1 ll:items-baseline ll:gap-(--ll-timers-space-xs)">
          {badge && (
            <span className="ll:shrink-0 ll:text-(--ll-timers-badge-font-size) ll:text-gray-300">
              {badge}
            </span>
          )}
          <span
            className="ll:min-w-0 ll:truncate ll:font-semibold"
            style={{ color: rankColor }}
          >
            {timer.npc.name}
          </span>
          {levelTag && (
            <span className="ll:shrink-0 ll:text-(--ll-timers-badge-font-size) ll:text-gray-300">
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
          progressColor={rankColor}
        />
      </div>
    </TimerTileInteractions>
  );
};
