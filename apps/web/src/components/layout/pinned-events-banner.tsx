import { useState, type FC } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Pin } from "lucide-react";
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

const rowClassName =
  "outline-none transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

export const PinnedEventsBanner: FC<PinnedEventsBannerProps> = ({
  events,
  guildId,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const [featuredEvent, ...otherEvents] = events;

  if (!featuredEvent) return null;

  return (
    <section
      aria-label={t("events.sidebarBanner.pinnedEvent")}
      className="relative isolate overflow-hidden border-b border-sidebar-border bg-primary/[0.03]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_0%_0%,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent)]"
      />
      {/* A light runs along the bottom rule, so the block reads as live. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden motion-reduce:hidden"
      >
        <span className="absolute inset-y-0 left-0 w-1/2 animate-hairline-sweep bg-gradient-to-r from-transparent via-primary to-transparent" />
      </span>

      <Link
        to="/$guildId/events/$eventId"
        params={{ guildId, eventId: featuredEvent.id }}
        onClick={onNavigate}
        className={cn(
          "group/event flex items-center gap-3 px-5 py-3",
          rowClassName,
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Pin aria-hidden="true" className="size-3 rotate-45" />
            {t("events.sidebarBanner.pinnedEvent")}
          </span>
          <span className="mt-0.5 block truncate text-base font-semibold text-sidebar-foreground">
            {featuredEvent.name}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-[color,translate] duration-150 ease-emphasized group-hover/event:translate-x-0.5 group-hover/event:text-primary motion-reduce:transition-none"
        />
      </Link>

      <EventTimersList
        event={featuredEvent}
        guildId={guildId}
        onNavigate={onNavigate}
      />

      <CollapsePresence open={isExpanded}>
        {otherEvents.map((event) => (
          <div key={event.id} className="border-t border-sidebar-border">
            <Link
              to="/$guildId/events/$eventId"
              params={{ guildId, eventId: event.id }}
              onClick={onNavigate}
              className={cn(
                "group/event flex items-center gap-3 px-5 py-2.5",
                rowClassName,
              )}
            >
              <span className="flex-1 truncate text-sm font-semibold text-sidebar-foreground">
                {event.name}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-[color,translate] duration-150 ease-emphasized group-hover/event:translate-x-0.5 group-hover/event:text-primary motion-reduce:transition-none"
              />
            </Link>
            <EventTimersList
              event={event}
              guildId={guildId}
              onNavigate={onNavigate}
            />
          </div>
        ))}
      </CollapsePresence>

      {otherEvents.length > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
          className={cn(
            "flex w-full items-center gap-1.5 px-5 py-2 text-xs text-muted-foreground hover:text-foreground",
            rowClassName,
          )}
          aria-expanded={isExpanded}
        >
          {isExpanded
            ? t("events.sidebarBanner.collapse")
            : t("events.sidebarBanner.moreEvents", {
                count: otherEvents.length,
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
    </section>
  );
};
