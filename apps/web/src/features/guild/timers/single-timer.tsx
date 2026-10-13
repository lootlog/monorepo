import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { NpcSearchTile } from "@/components/tiles/npc-search-tile";
import { cn } from "cn";
import { upperFirst } from "es-toolkit";
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
            // The player's colour tints the card the way it fills the game tile.
            style={{ backgroundImage: `linear-gradient(${fill}, ${fill})` }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-2.5 text-left transition-colors outline-none hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
              PHASE_TEXT_CLASS[phase],
            )}
          >
            {npcIcon && <NpcSearchTile icon={npcIcon} />}
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="min-w-0 truncate text-sm font-medium">
                  {npcName}
                </span>
                {npcLevel && (
                  <span className="shrink-0 text-xs opacity-70">
                    {npcLevel}
                  </span>
                )}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {showWorld && (
                  <span className="font-medium text-foreground/80">
                    {upperFirst(timer.world)}
                    {timer.member?.name && " · "}
                  </span>
                )}
                {timer.member?.name ?? ""}
              </span>
            </span>
            <span className="shrink-0 text-sm font-medium tabular-nums">
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
