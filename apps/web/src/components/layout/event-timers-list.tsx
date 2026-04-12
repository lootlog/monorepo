import { startTransition, useEffect, useState, type FC } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useListEventHeroTimers } from "@/lib/api/generated/main/events/events";
import type { Event } from "@/features/guild/events/types/api";
import { parseMsToTime } from "@/utils/date/parse-ms-to-time";
import { cn } from "@/utils/cn";

interface EventTimersListProps {
  event: Event;
  guildId: string;
  onNavigate?: () => void;
}

interface TimerItemProps {
  timer: {
    npcId: number;
    minSpawnTime: string;
    maxSpawnTime: string;
    maxSpawnTimestamp: number;
    npc: { name: string; icon?: string | null };
    heroId?: string;
  };
  currentTimestamp: number;
  guildId: string;
  eventId: string;
  onNavigate?: () => void;
}

const TimerItem: FC<TimerItemProps> = ({
  timer,
  currentTimestamp,
  guildId,
  eventId,
  onNavigate,
}) => {
  const timeLeftMilliseconds = Math.max(
    0,
    timer.maxSpawnTimestamp - currentTimestamp,
  );

  if (timeLeftMilliseconds <= 0) return null;

  const isCloseToRespawn = timeLeftMilliseconds < 60000;
  const minimumSpawnTimeLabel = format(
    new Date(timer.minSpawnTime),
    "HH:mm:ss",
    {
      locale: pl,
    },
  );
  const maximumSpawnTimeLabel = format(
    new Date(timer.maxSpawnTime),
    "HH:mm:ss",
    {
      locale: pl,
    },
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/$guildId/events/$eventId/heroes/$heroId"
          params={{
            guildId,
            eventId,
            heroId: timer.heroId ?? "",
          }}
          onClick={onNavigate}
          className="group block"
        >
          <div className="flex items-center gap-2 px-2 py-1 rounded transition-[background-color,transform] duration-200 hover:translate-x-0.5 hover:bg-yellow-500/10">
            <Clock
              className={cn(
                "h-3 w-3 shrink-0",
                isCloseToRespawn ? "text-orange-400" : "text-green-400",
              )}
            />
            <span className="text-xs truncate flex-1 text-muted-foreground">
              {timer.npc.name}
            </span>
            <span
              className={cn(
                "text-xs font-mono font-medium",
                isCloseToRespawn ? "text-orange-400" : "text-green-400",
              )}
            >
              {parseMsToTime(timeLeftMilliseconds)}
            </span>
          </div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        <p className="font-medium">{timer.npc.name}</p>
        <p className="text-muted-foreground">
          {minimumSpawnTimeLabel} - {maximumSpawnTimeLabel}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

export const EventTimersList: FC<EventTimersListProps> = ({
  event,
  guildId,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  const { data: timers } = useListEventHeroTimers(
    {
      guildId,
      eventId: event.id,
    },
    {
      world: event.world,
    },
  );

  useEffect(() => {
    if (!timers || timers.length === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      startTransition(() => {
        setCurrentTimestamp(Date.now());
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timers]);

  if (!timers || timers.length === 0) return null;

  const heroIdByNpcId = new Map(
    event.heroNpcs?.map((heroNpc) => [heroNpc.npcId, heroNpc.id]) ?? [],
  );
  const activeTimers: Array<
    (typeof timers)[number] & { heroId?: string; maxSpawnTimestamp: number }
  > = [];

  for (const timer of timers) {
    const maxSpawnTimestamp = new Date(timer.maxSpawnTime).getTime();

    if (maxSpawnTimestamp <= currentTimestamp) {
      continue;
    }

    activeTimers.push({
      ...timer,
      heroId: heroIdByNpcId.get(timer.npcId),
      maxSpawnTimestamp,
    });
  }

  activeTimers.sort(
    (firstTimer, secondTimer) =>
      firstTimer.maxSpawnTimestamp - secondTimer.maxSpawnTimestamp,
  );

  if (activeTimers.length === 0) return null;

  const visibleTimers = isExpanded ? activeTimers : activeTimers.slice(0, 3);
  const hasMore = activeTimers.length > 3;

  return (
    <div className="border-t border-yellow-500/20">
      <div className="py-1">
        {visibleTimers.map((timer) => (
          <TimerItem
            key={timer.npcId}
            timer={timer}
            currentTimestamp={currentTimestamp}
            guildId={guildId}
            eventId={event.id}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded((currentValue) => !currentValue);
          }}
          className="w-full px-2 py-1 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-yellow-500/10 transition-colors"
        >
          <span>
            {isExpanded
              ? t("events.sidebarBanner.collapse")
              : t("events.sidebarBanner.showMore", {
                  count: activeTimers.length - 3,
                })}
          </span>
          <div
            className={`flex items-center transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <ChevronDown className="h-3 w-3" />
          </div>
        </button>
      )}
    </div>
  );
};
