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
  const imageHasDomain = npcIcon?.startsWith("https://"); // @TODO: temporary fix for icons with full URL

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card/40 px-3 py-2.5 hover:bg-card/60 hover:border-primary/50 transition-all cursor-pointer">
      {npcIcon && (
        <div className="size-8 shrink-0 flex items-center justify-center">
          {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
          <img
            className="rounded max-h-8 max-w-8"
            src={`${imageHasDomain ? "" : MARGONEM_CDN_NPCS_URL}${npcIcon}`}
            alt={npcName}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{npcName}</span>
        <span className="text-muted-foreground text-xs truncate block">
          {timer.member?.name ?? ""}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {!isMinSpawnTime && (
          <Tooltip>
            <TooltipTrigger>
              <span className="text-xs flex items-center gap-1 tabular-nums text-muted-foreground">
                <ClockArrowDown size="14px" />
                {parseMsToTime(minTimeLeft)}
              </span>
            </TooltipTrigger>
            <TooltipContent className="flex flex-col">
              <span className="text-sm">
                {t("timers.details.minSpawnTime")}
              </span>
              <span className="text-sm font-semibold">
                {format(new Date(minSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
              </span>
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger>
            <span
              className={cn(
                "text-xs flex items-center gap-1 tabular-nums font-medium",
                {
                  "text-orange-400": isMinSpawnTime,
                  "text-red-500": hasPassedRedThreshold,
                },
              )}
            >
              <ClockArrowUp size="14px" />
              {parseMsToTime(timeLeft)}
            </span>
          </TooltipTrigger>
          <TooltipContent className="flex flex-col">
            <span className="text-sm">{t("timers.details.maxSpawnTime")}</span>
            <span className="text-sm font-semibold">
              {format(new Date(maxSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
