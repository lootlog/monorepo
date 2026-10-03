import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { NpcSearchTile } from "@/components/tiles/npc-search-tile";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { TimerResponseDto } from "@lootlog/client/main";
import { formatLevel } from "@lootlog/domain/profession";
import { TimerCountdown } from "./timer-countdown";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";

type SingleTimerProps = {
  timer: TimerResponseDto;
};

export const SingleTimer: FC<SingleTimerProps> = ({ timer }) => {
  const { t } = useTranslation();
  const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();
  const minSpawnTime = new Date(timer.minSpawnTime).getTime();
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
            className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-2.5 text-left transition-colors outline-none hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {npcIcon && <NpcSearchTile icon={npcIcon} />}
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="min-w-0 truncate text-sm font-medium">
                  {npcName}
                </span>
                {npcLevel && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {npcLevel}
                  </span>
                )}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {timer.member?.name ?? ""}
              </span>
            </span>
            <TimerCountdown
              minSpawnTime={minSpawnTime}
              maxSpawnTime={maxSpawnTime}
            />
          </button>
        }
      />
      <TooltipContent className="grid gap-2">
        <div>
          <span className="block text-xs text-muted-foreground">
            {t("timers.details.minSpawnTime")}
          </span>
          <span className="block text-sm font-semibold tabular-nums">
            {timestampToDate(minSpawnTime, DATE_TIME_WITH_SECONDS_FORMAT)}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">
            {t("timers.details.maxSpawnTime")}
          </span>
          <span className="block text-sm font-semibold tabular-nums">
            {timestampToDate(maxSpawnTime, DATE_TIME_WITH_SECONDS_FORMAT)}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
