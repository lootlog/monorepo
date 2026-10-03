import { useState, type FC } from "react";
import { Link } from "@tanstack/react-router";
import { Trophy, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import * as m from "framer-motion/m";
import { useTranslation } from "react-i18next";
import type { Event } from "@/features/guild/events/types/api";
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { CollapsePresence } from "@/components/common/collapse-presence";
import { EventTimersList } from "./event-timers-list";

interface PinnedEventsBannerProps {
  events: Event[];
  guildId: string;
  onNavigate?: () => void;
}

export const PinnedEventsBanner: FC<PinnedEventsBannerProps> = ({
  events,
  guildId,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  // MotionConfig stops the transforms; the endless loops themselves are dropped here.
  const prefersReducedMotion = usePrefersReducedMotion();

  if (events.length === 0) return null;

  const featuredEvent = events[0];

  if (!featuredEvent) return null;
  const hasMoreEvents = events.length > 1;
  const otherEvents = events.slice(1);

  return (
    <div className="px-2 mb-3 pb-3 border-b border-border">
      <div className="rounded-lg overflow-hidden bg-gradient-to-r from-signal-timer/20 via-signal-timer/15 to-signal-timer/10 border border-signal-timer/30 relative">
        {prefersReducedMotion ? null : (
          <m.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-signal-timer/20 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut",
            }}
            style={{ width: "100%" }}
          />
        )}

        <div className="relative">
          <Link
            to="/$guildId/events/$eventId"
            params={{ guildId, eventId: featuredEvent.id }}
            onClick={onNavigate}
            className="block"
          >
            <div className="relative flex items-center gap-3 px-3 py-2.5 transition-[background-color,transform] duration-200 motion-safe:hover:translate-x-0.5 hover:bg-signal-timer/10">
              <div className="relative">
                <Trophy className="size-4 text-signal-timer" />
                <m.div
                  key={String(prefersReducedMotion)}
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : {
                          scale: [1, 1.2, 1],
                          opacity: [0.7, 1, 0.7],
                        }
                  }
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Sparkles className="absolute -top-1 -right-1 size-2.5 text-signal-timer" />
                </m.div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-signal-timer font-medium">
                  {t("events.sidebarBanner.pinnedEvent")}
                </p>
                <p className="text-sm font-semibold truncate">
                  {featuredEvent.name}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </div>
          </Link>

          <EventTimersList
            event={featuredEvent}
            guildId={guildId}
            onNavigate={onNavigate}
          />
        </div>

        <>
          {hasMoreEvents && (
            <m.button
              type="button"
              onClick={() => setIsExpanded((currentValue) => !currentValue)}
              className="w-full px-3 py-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-signal-timer/10 transition-colors border-t border-signal-timer/20"
              aria-expanded={isExpanded}
            >
              <span>
                {t("events.sidebarBanner.showMore", {
                  count: otherEvents.length,
                })}
              </span>
              <m.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="size-3" />
              </m.div>
            </m.button>
          )}

          <CollapsePresence open={hasMoreEvents && isExpanded}>
            <div className="border-t border-signal-timer/20">
              {otherEvents.map((event) => (
                <div key={event.id}>
                  <Link
                    to="/$guildId/events/$eventId"
                    params={{ guildId, eventId: event.id }}
                    onClick={onNavigate}
                    className="block"
                  >
                    <div className="flex items-center gap-2 px-3 py-2 transition-[background-color,transform] duration-200 motion-safe:hover:translate-x-0.5 hover:bg-signal-timer/10">
                      <Trophy className="size-3.5 text-signal-timer/70" />
                      <span className="text-sm truncate flex-1">
                        {event.name}
                      </span>
                      <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                  <EventTimersList
                    event={event}
                    guildId={guildId}
                    onNavigate={onNavigate}
                  />
                </div>
              ))}
            </div>
          </CollapsePresence>
        </>
      </div>
    </div>
  );
};
