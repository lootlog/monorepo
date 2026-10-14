import { useState, type FC } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Event } from "@/features/guild/events/types/api";
import { cn } from "cn";
import { CollapsePresence } from "@/components/common/collapse-presence";
import { EventTimersList } from "./event-timers-list";
import { PinnedEventHeroes } from "./pinned-event-heroes";

interface PinnedEventsBannerProps {
  events: Event[];
  guildId: string;
  onNavigate?: () => void;
}

const rowClassName =
  "outline-none transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

const chevronClassName =
  "size-3.5 shrink-0 text-muted-foreground opacity-0 transition-[opacity,translate,color] duration-200 ease-emphasized group-hover/event:translate-x-0.5 group-hover/event:text-primary group-hover/event:opacity-100 group-focus-visible/event:opacity-100 motion-reduce:transition-none";

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
      aria-label={t("events.sidebarBanner.activeEvent")}
      className="relative isolate overflow-hidden border-b border-sidebar-border bg-primary/[0.04]"
    >
      {/* The glow behind the heroes breathes, so the block reads as live. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 animate-glow-breathe bg-[radial-gradient(70%_60%_at_100%_0%,color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent)] motion-reduce:animate-none"
      />

      <Link
        to="/$guildId/events/$eventId"
        params={{ guildId, eventId: featuredEvent.id }}
        onClick={onNavigate}
        className={cn(
          "group/event flex items-center gap-3 px-5 pt-3 pb-2",
          rowClassName,
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          {/* Never wraps: the heroes widen on hover and would reflow the block. */}
          <span className="text-[0.6875rem] font-semibold tracking-wider whitespace-nowrap text-primary uppercase">
            {t("events.sidebarBanner.activeEvent")}
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-1">
            <span className="truncate text-base font-semibold text-sidebar-foreground">
              {featuredEvent.name}
            </span>
            <ChevronRight aria-hidden="true" className={chevronClassName} />
          </span>
        </span>
        <PinnedEventHeroes heroNpcs={featuredEvent.heroNpcs} />
      </Link>

      <EventTimersList
        event={featuredEvent}
        guildId={guildId}
        onNavigate={onNavigate}
      />

      <CollapsePresence open={isExpanded}>
        {otherEvents.map((event) => (
          <div
            key={event.id}
            className="mt-1 border-t border-sidebar-border pt-1"
          >
            <Link
              to="/$guildId/events/$eventId"
              params={{ guildId, eventId: event.id }}
              onClick={onNavigate}
              className={cn(
                "group/event flex items-center gap-3 px-5 py-2",
                rowClassName,
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  {event.name}
                </span>
                <ChevronRight aria-hidden="true" className={chevronClassName} />
              </span>
              <PinnedEventHeroes heroNpcs={event.heroNpcs} size="sm" />
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
            "flex w-full items-center gap-1.5 px-5 py-1.5 text-xs text-muted-foreground hover:text-foreground",
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
