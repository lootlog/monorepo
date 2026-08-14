import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { format } from "date-fns";
import { ClockArrowDown, ClockArrowUp } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";
import { parseMsToTime } from "@/utils/date/parse-ms-to-time";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { TimerResponseDto } from "@lootlog/api-client/models/main/timer-response-dto";
import { invalidateTimersControllerGetTimers } from "@lootlog/api-client/react-query/main/timers";
import { useQueryClient } from "@tanstack/react-query";

type SingleTimerProps = {
  timer: TimerResponseDto;
};

const THRESHOLD = 30000;

export const SingleTimer: FC<SingleTimerProps> = ({ timer }) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { world } = useGuildContext();
  const queryClient = useQueryClient();
  const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();
  const minSpawnTime = new Date(timer.minSpawnTime).getTime();
  const [timeLeft, setTimeLeft] = useState(() => maxSpawnTime - Date.now());
  const [minTimeLeft, setMinTimeLeft] = useState(
    () => minSpawnTime - Date.now(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const time = maxSpawnTime - Date.now();
      const minTime = minSpawnTime - Date.now();

      if (time <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        if (guildId) {
          void invalidateTimersControllerGetTimers(
            queryClient,
            { guildId },
            { world },
          );
        }

        return;
      }

      setTimeLeft(time);
      setMinTimeLeft(minTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [maxSpawnTime, minSpawnTime, queryClient, guildId, world]);

  const isMinSpawnTime = minSpawnTime < maxSpawnTime && minTimeLeft <= 0;
  const hasPassedRedThreshold = timeLeft < THRESHOLD;
  const npcName = timer.npc?.name ?? "";
  const npcIcon = timer.npc?.icon ?? null;
  const npcDetails =
    timer.npc && timer.npc.lvl > 0 && timer.npc.prof
      ? `(${timer.npc.lvl}${timer.npc.prof.charAt(0).toLowerCase()})`
      : null;
  const imageHasDomain = npcIcon?.startsWith("https://"); // @TODO: temporary fix for icons with full URL

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-2.5 transition-all hover:border-primary/50 hover:bg-card">
            {npcIcon && (
              <div className="flex size-8 shrink-0 items-center justify-center">
                {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
                <img
                  className="max-h-8 max-w-8 rounded"
                  src={`${imageHasDomain ? "" : MARGONEM_CDN_NPCS_URL}${npcIcon}`}
                  alt={npcName}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline gap-1">
                <span className="min-w-0 truncate text-sm font-medium">
                  {npcName}
                </span>
                {npcDetails && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {npcDetails}
                  </span>
                )}
              </div>
              <span className="block truncate text-xs text-muted-foreground">
                {timer.member?.name ?? ""}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {!isMinSpawnTime && (
                <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                  <ClockArrowDown size="14px" />
                  {parseMsToTime(minTimeLeft)}
                </span>
              )}
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-medium tabular-nums",
                  {
                    "text-orange-400": isMinSpawnTime,
                    "text-red-500": hasPassedRedThreshold,
                  },
                )}
              >
                <ClockArrowUp size="14px" />
                {parseMsToTime(timeLeft)}
              </span>
            </div>
          </div>
        }
      />
      <TooltipContent className="grid gap-2">
        <div>
          <span className="block text-xs text-muted-foreground">
            {t("timers.details.minSpawnTime")}
          </span>
          <span className="block text-sm font-semibold tabular-nums">
            {format(new Date(minSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">
            {t("timers.details.maxSpawnTime")}
          </span>
          <span className="block text-sm font-semibold tabular-nums">
            {format(new Date(maxSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
