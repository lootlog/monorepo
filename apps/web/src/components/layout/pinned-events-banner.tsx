import { useState, type FC } from "react";
import { Link } from "@tanstack/react-router";
import { Trophy, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Event } from "@/features/guild/events/types/api";
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

  if (events.length === 0) return null;

  const featuredEvent = events[0];
  if (!featuredEvent) return null;
  const hasMoreEvents = events.length > 1;
  const otherEvents = events.slice(1);

  return (
    <div className="px-2 mb-3 pb-3 border-b border-border">
      <div className="rounded-lg overflow-hidden bg-gradient-to-r from-yellow-500/20 via-amber-500/15 to-orange-500/20 border border-yellow-500/30 relative">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent"
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

        <div className="relative">
          <Link
            to="/$guildId/events/$eventId"
            params={{ guildId, eventId: featuredEvent.id }}
            onClick={onNavigate}
            className="block"
          >
            <div className="relative flex items-center gap-3 px-3 py-2.5 transition-[background-color,transform] duration-200 hover:translate-x-0.5 hover:bg-yellow-500/10">
              <div className="relative">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Sparkles className="absolute -top-1 -right-1 h-2.5 w-2.5 text-yellow-400" />
                </motion.div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                  {t("events.sidebarBanner.pinnedEvent")}
                </p>
                <p className="text-sm font-semibold truncate">
                  {featuredEvent.name}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Link>

          <EventTimersList
            event={featuredEvent}
            guildId={guildId}
            onNavigate={onNavigate}
          />
        </div>

        {hasMoreEvents && (
          <>
            <motion.button
              type="button"
              onClick={() => setIsExpanded((currentValue) => !currentValue)}
              className="w-full px-3 py-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-yellow-500/10 transition-colors border-t border-yellow-500/20"
              whileHover={{ backgroundColor: "rgba(234, 179, 8, 0.1)" }}
            >
              <span>
                {t("events.sidebarBanner.showMore", {
                  count: otherEvents.length,
                })}
              </span>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3 w-3" />
              </motion.div>
            </motion.button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-yellow-500/20 overflow-hidden"
                >
                  {otherEvents.map((event) => (
                    <div key={event.id}>
                      <Link
                        to="/$guildId/events/$eventId"
                        params={{ guildId, eventId: event.id }}
                        onClick={onNavigate}
                        className="block"
                      >
                        <div className="flex items-center gap-2 px-3 py-2 transition-[background-color,transform] duration-200 hover:translate-x-0.5 hover:bg-yellow-500/10">
                          <Trophy className="h-3.5 w-3.5 text-yellow-500/70" />
                          <span className="text-sm truncate flex-1">
                            {event.name}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </div>
                      </Link>
                      <EventTimersList
                        event={event}
                        guildId={guildId}
                        onNavigate={onNavigate}
                      />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};
