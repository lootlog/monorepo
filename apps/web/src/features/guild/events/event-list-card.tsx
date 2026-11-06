import { TileChevron } from "@/components/common/tile-chevron";
import { upperFirst } from "es-toolkit";
import { MetaItem } from "@/components/common/meta-item";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
  LIST_TILE_HOVER_CLASS,
} from "@/components/common/list-tile";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import {
  CalendarDays,
  Globe,
  Star,
  Swords,
  Trash2,
  Trophy,
} from "lucide-react";
import type { useEventList } from "./use-event-list";
import {
  EVENT_STATUS_PRESENTATION,
  getEventStatusAtTimestamp,
} from "./utils/event-activity";
import { formatDateRange } from "./utils/format-date";

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

  const { labelKey: eventStatusLabelKey, badgeVariant: eventStatusVariant } =
    EVENT_STATUS_PRESENTATION[eventStatus];

  const formattedWorld = upperFirst(event.world);

  let pinActionLabel = t("events.pinEvent");

  if (!event.active) {
    pinActionLabel = t("events.pinUnavailable");
  } else if (isPinned(event.id)) {
    pinActionLabel = t("events.unpinEvent");
  }

  return (
    <div data-list-tile className={LIST_TILE_RULE_CLASS}>
      <div
        className={cn(
          "flex items-center",
          LIST_TILE_HOVER_CLASS,
          isEventActive && "bg-signal-live/[0.04] hover:bg-signal-live/[0.08]",
        )}
      >
        <Link
          to="/$guildId/events/$eventId"
          params={{ guildId: guildId ?? "", eventId: event.id }}
          className={cn(getListTileLinkClassName(true), "group/tile")}
        >
          <div
            className={cn(
              "relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
              isEventActive && "bg-signal-live/10",
            )}
          >
            <Trophy
              className={cn(
                "size-4 text-muted-foreground",
                isEventActive && "text-signal-live",
              )}
            />
            {isEventActive && (
              <span className="absolute -right-0.5 -top-0.5 flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-signal-live opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-signal-live" />
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="min-w-0 break-words text-sm font-semibold">
                {event.name}
              </h3>
              <Badge variant={eventStatusVariant} className="h-5 px-2 text-2xs">
                {t(eventStatusLabelKey)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <MetaItem icon={Globe}>{formattedWorld}</MetaItem>
              <MetaItem icon={Swords}>
                {t("events.heroes.count", {
                  count: event.heroNpcs?.length ?? 0,
                })}
              </MetaItem>
              <MetaItem icon={CalendarDays}>
                {formatDateRange(
                  new Date(event.startsAt ?? event.createdAt),
                  event.endsAt ? new Date(event.endsAt) : null,
                  t("events.ongoing"),
                )}
              </MetaItem>
            </div>
          </div>

          <TileChevron />
        </Link>

        <div className={LIST_TILE_ACTIONS_CLASS}>
          <Button
            variant="ghost"
            size="icon-sm"
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
              size="icon-sm"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("events.deleteNamed", { name: event.name })}
              title={t("events.deleteNamed", { name: event.name })}
              onClick={() => setEventToDelete(event)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
