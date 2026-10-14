import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { NpcSearchTile } from "@/components/tiles/npc-search-tile";
import { cn } from "cn";
import { upperFirst } from "es-toolkit";
import { Globe, User } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import type { TimerResponseDto } from "@lootlog/client/main";
import { parseMsToTime } from "@lootlog/datetime";
import type { TimerColorPaint } from "@lootlog/domain/timer-colors";
import {
  getTimerCountdownMs,
  getTimerPhase,
  getTimerTimeLeft,
  type TimerCountdownMode,
  type TimerPhase,
} from "@lootlog/domain/timers";
import { formatLevel } from "@lootlog/domain/profession";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";
import { MetaItem } from "@/components/common/meta-item";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";

// The game client's colours: white until the spawn window opens, orange
// inside it, red past the maximum, and a dimmed red for a kept timer.
const PHASE_TEXT_CLASS = {
  waiting: "text-foreground",
  window: "text-orange-300",
  overdue: "text-red-400",
  expired: "text-red-400/70",
} satisfies Record<TimerPhase, string>;

/** An expired timer keeps its colour, darkened, as in the game client. */
const veil = (color: string, isExpired: boolean) =>
  isExpired ? `color-mix(in srgb, ${color}, black 40%)` : color;

type SingleTimerProps = {
  timer: TimerResponseDto;
  paint: TimerColorPaint;
  countdownMode: TimerCountdownMode;
  removeTimerAfterMs: number;
  /** Stays on screen after the removal delay. */
  isPinned: boolean;
  /** Names the timer's world, for lists that span every world. */
  showWorld?: boolean;
};

export const SingleTimer: FC<SingleTimerProps> = ({
  timer,
  paint,
  countdownMode,
  removeTimerAfterMs,
  isPinned,
  showWorld = false,
}) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now);

  useEffect(() => subscribeToSecondClock(() => setNow(Date.now())), []);

  const timeLeft = getTimerTimeLeft(timer, now);
  const phase = getTimerPhase(timeLeft, removeTimerAfterMs);

  // The game client drops a timer once the removal delay passes; the list
  // refetches then and the server keeps only the timers the player pinned.
  if (phase === "expired" && !isPinned) return null;

  const fill = veil(paint.fill, phase === "expired");
  // A softer wash than the game tile keeps long lists of painted rows calm.
  const wash = `color-mix(in srgb, ${fill} 25%, transparent)`;
  const npcName = timer.npc?.name ?? "";
  const npcIcon = timer.npc?.icon ?? null;

  const npcLevel =
    timer.npc && timer.npc.lvl > 0
      ? formatLevel(timer.npc.lvl, timer.npc.prof)
      : null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            // The player's colour tints the row the way it fills the game tile.
            style={{
              backgroundImage: `linear-gradient(${wash}, ${wash})`,
            }}
            className={cn(
              "flex h-full w-full items-center gap-3 py-2.5 text-left outline-none transition-colors hover:bg-muted/30 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none",
              LIST_TILE_INSET_CLASS,
              phase === "expired" && "opacity-75",
            )}
          >
            {npcIcon && <NpcSearchTile icon={npcIcon} />}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="min-w-0 truncate text-sm font-semibold">
                  {npcName}
                </span>
                {npcLevel && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {npcLevel}
                  </span>
                )}
              </span>
              <span className="flex min-w-0 items-center gap-x-3">
                {showWorld && (
                  <MetaItem
                    icon={Globe}
                    label={t("loots.list.worldLabel")}
                    className="shrink-0"
                  >
                    {upperFirst(timer.world)}
                  </MetaItem>
                )}
                {timer.member?.name && (
                  <MetaItem icon={User} className="min-w-0">
                    <span className="min-w-0 truncate">
                      {timer.member.name}
                    </span>
                  </MetaItem>
                )}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 text-[15px] leading-5 font-semibold tabular-nums",
                PHASE_TEXT_CLASS[phase],
              )}
            >
              {parseMsToTime(getTimerCountdownMs(timeLeft, countdownMode))}
            </span>
          </button>
        }
      />
      <TooltipContent className="grid gap-2">
        <div>
          <span className="block text-xs text-muted-foreground">
            {t("timers.details.minSpawnTime")}
          </span>
          <span className="block text-sm font-semibold tabular-nums">
            {timestampToDate(timer.minSpawnTime, DATE_TIME_WITH_SECONDS_FORMAT)}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">
            {t("timers.details.maxSpawnTime")}
          </span>
          <span className="block text-sm font-semibold tabular-nums">
            {timestampToDate(timer.maxSpawnTime, DATE_TIME_WITH_SECONDS_FORMAT)}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
