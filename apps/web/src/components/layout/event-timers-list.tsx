import { useState, useEffect, type FC } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useEventHeroTimers } from "@/features/events/hooks/use-event-hero-timers";
import { parseMsToTime } from "@/utils/date/parse-ms-to-time";
import { cn } from "@/utils/cn";
import type { Event } from "@/features/events/hooks/use-events";

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
    npc: { name: string; icon?: string | null };
    heroId?: string;
  };
  guildId: string;
  eventId: string;
  onNavigate?: () => void;
}

const TimerItem: FC<TimerItemProps> = ({
  timer,
  guildId,
  eventId,
  onNavigate,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();
    return Math.max(0, maxSpawnTime - Date.now());
  });

  useEffect(() => {
    const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();

    const interval = setInterval(() => {
      const time = maxSpawnTime - Date.now();
      if (time <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        return;
      }
      setTimeLeft(time);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.maxSpawnTime]);

  if (timeLeft <= 0) return null;

  const isClose = timeLeft < 60000;
  const minTime = format(new Date(timer.minSpawnTime), "HH:mm:ss", { locale: pl });
  const maxTime = format(new Date(timer.maxSpawnTime), "HH:mm:ss", { locale: pl });

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
          className="block"
        >
          <motion.div
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-yellow-500/10 transition-colors"
            whileHover={{ x: 2 }}
          >
            <Clock
              className={cn(
                "h-3 w-3 shrink-0",
                isClose ? "text-orange-400" : "text-green-400",
              )}
            />
            <span className="text-xs truncate flex-1 text-muted-foreground">
              {timer.npc.name}
            </span>
            <span
              className={cn(
                "text-xs font-mono font-medium",
                isClose ? "text-orange-400" : "text-green-400",
              )}
            >
              {parseMsToTime(timeLeft)}
            </span>
          </motion.div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        <p className="font-medium">{timer.npc.name}</p>
        <p className="text-muted-foreground">
          {minTime} - {maxTime}
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
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: timers } = useEventHeroTimers({
    guildId,
    eventId: event.id,
    world: event.world,
  });

  if (!timers || timers.length === 0) return null;

  // Filter out expired timers and sort by closest spawn time
  const now = Date.now();
  const activeTimers = timers
    .filter((t) => new Date(t.maxSpawnTime).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.maxSpawnTime).getTime() - new Date(b.maxSpawnTime).getTime(),
    )
    .map((timer) => {
      // Find hero ID from event.heroNpcs by matching npcId
      const hero = event.heroNpcs?.find((h) => h.npcId === timer.npcId);
      return {
        ...timer,
        heroId: hero?.id,
      };
    });

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
            guildId={guildId}
            eventId={event.id}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {hasMore && (
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full px-2 py-1 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-yellow-500/10 transition-colors"
        >
          <span>{isExpanded ? "Zwiń" : `+${activeTimers.length - 3} więcej`}</span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3 w-3" />
          </motion.div>
        </motion.button>
      )}
    </div>
  );
};
