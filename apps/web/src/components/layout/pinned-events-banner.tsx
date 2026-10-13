import { useState, type FC } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Event } from "@/features/guild/events/types/api";
import { cn } from "cn";
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

  if (events.length === 0) return null;

  const featuredEvent = events[0];

  if (!featuredEvent) return null;
  const hasMoreEvents = events.length > 1;
  const otherEvents = events.slice(1);

  return (
    <div className="px-2 mb-3 pb-3 border-b border-border">
      <div className="relative overflow-hidden rounded-lg bg-sidebar-border p-px">
        {/* The rim light orbits the frame like the loading slot's. */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 aspect-square w-[300%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(transparent_0_70%,var(--color-primary)_97%,transparent)] motion-safe:animate-[spin_6s_linear_infinite] motion-reduce:hidden"
        />

        <div className="relative overflow-hidden rounded-[calc(var(--radius-lg)-1px)] bg-sidebar">
          <Link
            to="/$guildId/events/$eventId"
            params={{ guildId, eventId: featuredEvent.id }}
            onClick={onNavigate}
            className="group/event flex items-center gap-2 bg-primary/5 px-3 py-2.5 transition-colors hover:bg-primary/10"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">
                {t("events.sidebarBanner.pinnedEvent")}
              </span>
              <span className="block truncate text-sm font-semibold text-sidebar-foreground">
                {featuredEvent.name}
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground transition-colors group-hover/event:text-primary"
            />
          </Link>

          <EventTimersList
            event={featuredEvent}
            guildId={guildId}
            onNavigate={onNavigate}
          />

          {hasMoreEvents && (
            <button
              type="button"
              onClick={() => setIsExpanded((currentValue) => !currentValue)}
              className="flex w-full items-center justify-center gap-1 border-t border-sidebar-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              aria-expanded={isExpanded}
            >
              <span>
                {t("events.sidebarBanner.showMore", {
                  count: otherEvents.length,
                })}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-3 transition-[rotate] duration-200 ease-emphasized motion-reduce:transition-none",
                  isExpanded && "rotate-180",
                )}
              />
            </button>
          )}

          <CollapsePresence open={hasMoreEvents && isExpanded}>
            <div className="border-t border-sidebar-border">
              {otherEvents.map((event) => (
                <div key={event.id}>
                  <Link
                    to="/$guildId/events/$eventId"
                    params={{ guildId, eventId: event.id }}
                    onClick={onNavigate}
                    className="group/event flex items-center gap-2 px-3 py-2 transition-colors hover:bg-primary/10"
                  >
                    <span className="flex-1 truncate text-sm font-semibold">
                      {event.name}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/event:text-primary"
                    />
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
        </div>
      </div>
    </div>
  );
};
