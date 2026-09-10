import { SectionCard as Card } from "@/components/common/section-card/section-card";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  CalendarDays,
  ChevronRight,
  Globe,
  Star,
  Swords,
  Trash2,
  Trophy,
} from "lucide-react";
import type { useEventList } from "./use-event-list";
import { getEventStatusAtTimestamp } from "./utils/event-activity";

type Props = Pick<
  ReturnType<typeof useEventList>,
  | "currentTimestamp"
  | "t"
  | "isPinned"
  | "guildId"
  | "isPinPending"
  | "togglePin"
  | "canDeleteEvent"
  | "setEventToDelete"
> & { event: ReturnType<typeof useEventList>["filteredEvents"][number] };

export const EventListCard = ({
  event,
  currentTimestamp,
  t,
  isPinned,
  guildId,
  isPinPending,
  togglePin,
  canDeleteEvent,
  setEventToDelete,
}: Props) => {
  const eventStatus = getEventStatusAtTimestamp(event, currentTimestamp);
  const isEventActive = eventStatus === "active";

  const eventStatusLabel =
    eventStatus === "upcoming"
      ? t("events.upcoming")
      : eventStatus === "ended"
        ? t("events.ended")
        : t("events.active");

  const eventStatusVariant =
    eventStatus === "active"
      ? "default"
      : eventStatus === "upcoming"
        ? "outline"
        : "secondary";

  const formattedWorld =
    event.world.charAt(0).toUpperCase() + event.world.slice(1);

  let pinActionLabel = t("events.pinEvent");

  if (!event.active) {
    pinActionLabel = t("events.pinUnavailable");
  } else if (isPinned(event.id)) {
    pinActionLabel = t("events.unpinEvent");
  }

  return (
    <Card
      className={cn(
        "flex-row items-stretch gap-0 overflow-hidden border-border bg-card p-0 transition-colors",
        isEventActive && "border-yellow-500/40 bg-yellow-500/[0.025]",
      )}
    >
      <Link
        to="/$guildId/events/$eventId"
        params={{ guildId: guildId ?? "", eventId: event.id }}
        className="group/event flex min-w-0 flex-1 items-center gap-3 p-4 outline-none transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <div
          className={cn(
            "relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
            isEventActive && "bg-yellow-500/10",
          )}
        >
          <Trophy
            className={cn(
              "size-4 text-muted-foreground",
              isEventActive && "text-yellow-500",
            )}
          />
          {isEventActive && (
            <span className="absolute -right-0.5 -top-0.5 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-yellow-500" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 break-words text-base font-semibold leading-tight">
              {event.name}
            </h3>
            <Badge
              variant={eventStatusVariant}
              className="h-5 px-2 text-[11px]"
            >
              {eventStatusLabel}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="size-3.5" />
              {formattedWorld}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Swords className="size-3.5" />
              {t("events.heroes.count", {
                count: event.heroNpcs?.length ?? 0,
              })}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" />
              <span>
                {format(
                  new Date(event.startsAt ?? event.createdAt),
                  "d MMM yyyy",
                  {
                    locale: pl,
                  },
                )}
                {" – "}
                {event.endsAt
                  ? format(new Date(event.endsAt), "d MMM yyyy", {
                      locale: pl,
                    })
                  : t("events.ongoing")}
              </span>
            </span>
          </div>
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/event:translate-x-0.5 group-hover/event:text-foreground" />
      </Link>

      <div className="flex shrink-0 items-center gap-1 border-l border-border px-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title={pinActionLabel}
          loading={isPinPending(event.id)}
          aria-label={pinActionLabel}
          disabled={!event.active || isPinPending(event.id)}
          onClick={() => togglePin(event)}
        >
          <Star
            className={cn(
              "size-4 text-muted-foreground",
              isPinned(event.id) && "fill-yellow-500 text-yellow-500",
            )}
          />
        </Button>
        {canDeleteEvent && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={t("events.delete")}
            title={t("events.delete")}
            onClick={() => setEventToDelete(event)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};
