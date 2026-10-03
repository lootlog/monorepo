import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { format } from "date-fns";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { TimerResponseDto } from "@lootlog/client/main";
import { formatNpcLevel } from "@lootlog/domain/profession";
import { TimerCountdown } from "./timer-countdown";

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
      ? formatNpcLevel(timer.npc.lvl, timer.npc.prof)
      : null;

  const imageHasDomain = npcIcon?.startsWith("https://"); // @TODO: temporary fix for icons with full URL

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-2.5 text-left transition-colors outline-none hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {npcIcon && (
              <span className="flex size-8 shrink-0 items-center justify-center">
                {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
                <img
                  className="max-h-8 max-w-8 rounded"
                  src={`${imageHasDomain ? "" : MARGONEM_CDN_NPCS_URL}${npcIcon}`}
                  alt=""
                />
              </span>
            )}
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
            {format(new Date(minSpawnTime), "dd.MM.yyyy HH:mm:ss")}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">
            {t("timers.details.maxSpawnTime")}
          </span>
          <span className="block text-sm font-semibold tabular-nums">
            {format(new Date(maxSpawnTime), "dd.MM.yyyy HH:mm:ss")}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
