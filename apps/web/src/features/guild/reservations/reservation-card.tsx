import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarClock, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReservationSpotsResponseDtoItem } from "@lootlog/client/main";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { cn } from "cn";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { MetaItem } from "@/components/common/meta-item";
import { NpcSearchTile } from "@/components/tiles";
import type { ViewMode } from "@/hooks/use-view-mode";
import {
  getReservationCellClassName,
  RESERVATION_LIST_ROW_CLASS,
} from "./reservation-collection-layout";

type ReservationCardProps = {
  spot: ReservationSpotsResponseDtoItem;
  onOpen: () => void;
  onPinChange: (pinned: boolean) => void;
  pinPending?: boolean;
  pinDisabled?: boolean;
  viewMode?: ViewMode;
};

const formatTime = (timestamp: string) => format(new Date(timestamp), "HH:mm");

/**
 * One spot's tile in the edge-to-edge spot list: its name, monsters, and
 * whether it is free now and who reserved it next. The schedule link covers
 * the whole tile; an occupied spot is tinted.
 */
export function ReservationCard({
  spot,
  onOpen,
  onPinChange,
  pinPending = false,
  pinDisabled = false,
  viewMode = "grid",
}: ReservationCardProps) {
  const { t } = useTranslation();
  const { currentReservation, nextReservation } = spot;
  const isOccupied = currentReservation !== null;

  let statusTitle = t("reservations.card.freeNow");

  if (currentReservation) {
    statusTitle = t("reservations.card.occupiedUntil", {
      time: formatTime(currentReservation.endsAt),
    });
  } else if (spot.availableUntil) {
    statusTitle = t("reservations.card.freeUntil", {
      time: formatTime(spot.availableUntil),
    });
  }

  const imageOccurrences = new Map<string, number>();

  const images = spot.images.slice(0, 4).map((image) => {
    const occurrence = (imageOccurrences.get(image) ?? 0) + 1;
    imageOccurrences.set(image, occurrence);

    return { image, key: `${image}:${occurrence}` };
  });

  const title = (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1">
      <h3 className="min-w-0 truncate text-sm leading-tight font-semibold">
        {spot.name}
      </h3>
      <span className="shrink-0 text-xs text-muted-foreground">
        {t("reservations.card.level", { level: spot.level })}
      </span>
      {spot.hasPartnerReservations && (
        <Badge variant="outline" className="self-center">
          {t("reservations.card.partnerBadge")}
        </Badge>
      )}
    </div>
  );

  const status = (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="flex min-w-0 items-center gap-2 text-sm leading-tight">
        <span
          aria-hidden="true"
          className={cn(
            "size-2 shrink-0 rounded-full",
            isOccupied ? "bg-signal-alert" : "bg-signal-ready",
          )}
        />
        <span className="shrink-0 font-medium">{statusTitle}</span>
        {currentReservation && (
          <span className="min-w-0 truncate text-muted-foreground">
            {currentReservation.author.displayName}
          </span>
        )}
      </p>
      {nextReservation && (
        <MetaItem
          icon={CalendarClock}
          label={t("reservations.card.next")}
          className="min-w-0 pl-0.5"
        >
          <span className="min-w-0 truncate">
            {nextReservation.author.displayName} ·{" "}
            {format(new Date(nextReservation.startsAt), "EEE, d MMM, HH:mm", {
              locale: pl,
            })}
          </span>
        </MetaItem>
      )}
    </div>
  );

  const actions = (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        // Above the schedule link, which covers the whole tile.
        className="relative z-[2]"
        disabled={pinDisabled}
        loading={pinPending}
        aria-label={
          spot.isPinned
            ? t("reservations.card.unpin", { name: spot.name })
            : t("reservations.card.pin", { name: spot.name })
        }
        aria-pressed={spot.isPinned}
        onClick={() => onPinChange(!spot.isPinned)}
      >
        <Star
          className={cn(
            "size-4 text-muted-foreground",
            spot.isPinned && "fill-signal-timer text-signal-timer",
          )}
        />
      </Button>
      <ChevronLink
        render={<button type="button" onClick={onOpen} />}
        aria-label={t("reservations.card.open", { name: spot.name })}
        className="after:absolute after:inset-0 after:z-[1]"
      >
        <span className="max-sm:sr-only">
          {t("reservations.card.schedule")}
        </span>
      </ChevronLink>
    </div>
  );

  return (
    <div data-list-tile className={getReservationCellClassName(viewMode)}>
      <div
        className={cn(
          "relative h-full transition-colors hover:bg-muted/20 motion-reduce:transition-none",
          LIST_TILE_INSET_CLASS,
          viewMode === "grid"
            ? "flex flex-col gap-2 pt-1.5 pb-3"
            : RESERVATION_LIST_ROW_CLASS,
          isOccupied && "bg-destructive/[0.06] hover:bg-destructive/10",
        )}
      >
        {viewMode === "grid" ? (
          <>
            <div className="flex min-h-9 items-center justify-between gap-3">
              {title}
              {actions}
            </div>
            {images.length > 0 && (
              <div className="flex min-h-10 items-center gap-2 overflow-hidden">
                {images.map(({ image, key }) => (
                  <NpcSearchTile key={key} icon={image} />
                ))}
              </div>
            )}
            <div className="mt-auto pt-1">{status}</div>
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-3">
              {images[0] && <NpcSearchTile icon={images[0].image} />}
              {title}
            </div>
            {status}
            {actions}
          </>
        )}
      </div>
    </div>
  );
}
