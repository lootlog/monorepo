import { startTransition, useEffect, useState, type FC } from "react";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  getListEventHeroTimersQueryKey,
  useListEventHeroTimers,
} from "@lootlog/client/main";
import type { Event } from "@/features/guild/events/types/api";
import { parseMsToTime } from "@lootlog/datetime";
import { cn } from "cn";
import { SpawnWindowRing } from "./spawn-window-ring";

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
    minSpawnTimestamp: number;
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
  const timeLeftMilliseconds = timer.maxSpawnTimestamp - currentTimestamp;

  const isWindowOpen = currentTimestamp >= timer.minSpawnTimestamp;

  const signalClassName = isWindowOpen
    ? "text-signal-ready"
    : "text-signal-timer";

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
      <TooltipTrigger
        render={
          <Link
            to="/$guildId/events/$eventId/heroes/$heroId"
            params={{
              guildId,
              eventId,
              heroId: timer.heroId ?? "",
            }}
            onClick={onNavigate}
            className="group/timer flex items-center gap-2 px-5 py-1.5 outline-none transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <SpawnWindowRing
              minSpawnTimestamp={timer.minSpawnTimestamp}
              maxSpawnTimestamp={timer.maxSpawnTimestamp}
              currentTimestamp={currentTimestamp}
            />
            <span
              className={cn(
                "flex-1 truncate text-xs transition-colors group-hover/timer:text-foreground",
                isWindowOpen
                  ? "text-sidebar-foreground"
                  : "text-muted-foreground",
              )}
            >
              {timer.npc.name}
            </span>
            <span
              className={cn(
                "font-mono text-xs font-medium tabular-nums",
                signalClassName,
              )}
            >
              {parseMsToTime(timeLeftMilliseconds)}
            </span>
          </Link>
        }
      />
      <TooltipContent side="right" className="text-xs">
        <p className="font-medium">{timer.npc.name}</p>
        <p className="text-muted-foreground">
          {minimumSpawnTimeLabel} – {maximumSpawnTimeLabel}
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
    {
      query: {
        enabled: Boolean(guildId && event.id && event.world),
        queryKey: getListEventHeroTimersQueryKey(
          {
            guildId,
            eventId: event.id,
          },
          {
            world: event.world,
          },
        ),
      },
    },
  );

  const hasTimers = Boolean(timers?.length);

  useEffect(() => {
    if (!hasTimers) {
      return undefined;
    }

    return subscribeToSecondClock(() => {
      startTransition(() => {
        setCurrentTimestamp(Date.now());
      });
    });
  }, [hasTimers]);

  if (!timers || !hasTimers) return null;

  const heroIdByNpcId = new Map(
    event.heroNpcs?.map((heroNpc) => [heroNpc.npcId, heroNpc.id]) ?? [],
  );

  const activeTimers: Array<
    (typeof timers)[number] & {
      heroId?: string;
      minSpawnTimestamp: number;
      maxSpawnTimestamp: number;
    }
  > = [];

  for (const timer of timers) {
    const maxSpawnTimestamp = new Date(timer.maxSpawnTime).getTime();

    if (maxSpawnTimestamp <= currentTimestamp) {
      continue;
    }

    activeTimers.push({
      ...timer,
      heroId: heroIdByNpcId.get(timer.npcId),
      minSpawnTimestamp: new Date(timer.minSpawnTime).getTime(),
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
    <div>
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

      {hasMore && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded((currentValue) => !currentValue);
          }}
          className="flex w-full items-center gap-1.5 py-1.5 pr-5 pl-11 text-xs text-muted-foreground outline-none transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-expanded={isExpanded}
        >
          {isExpanded
            ? t("events.sidebarBanner.collapse")
            : t("events.sidebarBanner.showMore", {
                count: activeTimers.length - 3,
              })}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3 transition-[rotate] duration-200 ease-emphasized motion-reduce:transition-none",
              isExpanded && "rotate-180",
            )}
          />
        </button>
      )}
    </div>
  );
};
