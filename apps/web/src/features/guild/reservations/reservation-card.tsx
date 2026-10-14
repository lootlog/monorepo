import { format } from "date-fns";
import { ChevronRight, Clock3, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReservationSpotsResponseDtoItem } from "@lootlog/client/main";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { NpcSearchTile } from "@/components/tiles";
import type { ViewMode } from "@/hooks/use-view-mode";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
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

/** One spot's tile in the edge-to-edge spot list; an occupied spot is tinted. */
export function ReservationCard({
  spot,
  onOpen,
  onPinChange,
  pinPending = false,
  pinDisabled = false,
  viewMode = "grid",
}: ReservationCardProps) {
  const { t } = useTranslation();
  const isOccupied = spot.currentReservation !== null;

  const statusTitle = isOccupied
    ? t("reservations.card.occupied")
    : t("reservations.card.freeNow");

  let statusDetail = t("reservations.card.noneDescription");

  if (spot.availableUntil) {
    statusDetail = t("reservations.card.freeUntil", {
      time: format(new Date(spot.availableUntil), "HH:mm"),
    });
  }

  if (spot.currentReservation) {
    statusDetail = `${spot.currentReservation.author.displayName} · ${format(new Date(spot.currentReservation.endsAt), "HH:mm")}`;
  }

  const imageOccurrences = new Map<string, number>();

  const images = spot.images.slice(0, 4).map((image) => {
    const occurrence = (imageOccurrences.get(image) ?? 0) + 1;
    imageOccurrences.set(image, occurrence);

    return { image, key: `${image}:${occurrence}` };
  });

  return (
    <div data-list-tile className={getReservationCellClassName(viewMode)}>
      <div
        className={cn(
          "relative flex h-full flex-col gap-3 py-3 transition-colors hover:bg-muted/30 motion-reduce:transition-none",
          LIST_TILE_INSET_CLASS,
          viewMode === "list" && RESERVATION_LIST_ROW_CLASS,
          isOccupied && "bg-destructive/[0.06] hover:bg-destructive/10",
        )}
      >
        <button
          type="button"
          onClick={onOpen}
          aria-label={t("reservations.card.open", { name: spot.name })}
          className="absolute inset-0 z-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />

        <div className="pointer-events-none relative z-10 flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{spot.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("reservations.card.level", { level: spot.level })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {spot.hasPartnerReservations && (
              <Badge variant="outline">
                {t("reservations.card.partnerBadge")}
              </Badge>
            )}
            <Button
              type="button"
              size="icon-sm"
              className="pointer-events-auto"
              variant={spot.isPinned ? "secondary" : "ghost"}
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
                  spot.isPinned && "fill-yellow-500 text-yellow-500",
                )}
              />
            </Button>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </div>

        {spot.images.length > 0 && viewMode === "grid" && (
          <div className="pointer-events-none relative z-10 flex min-h-10 items-center gap-2 overflow-hidden">
            {images.map(({ image, key }) => (
              <NpcSearchTile
                key={key}
                icon={image}
                name={spot.name}
                className="shrink-0 cursor-inherit"
              />
            ))}
          </div>
        )}

        <div className="pointer-events-none relative z-10 mt-auto flex min-w-0 items-center gap-2.5 text-left text-xs">
          <Clock3
            className={cn(
              "size-4 shrink-0",
              isOccupied ? "text-destructive" : "text-primary",
            )}
          />
          <div className="min-h-8 min-w-0 flex-1">
            {isOccupied ? (
              <>
                <p className="flex min-w-0 items-center gap-1 text-destructive">
                  <span className="shrink-0 font-medium">{statusTitle}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate text-foreground">
                    {statusDetail}
                  </span>
                </p>
                {spot.nextReservation && (
                  <p className="truncate text-foreground">
                    <span className="font-medium text-muted-foreground">
                      {t("reservations.card.next")}:
                    </span>{" "}
                    {spot.nextReservation.author.displayName} ·{" "}
                    {timestampToDate(spot.nextReservation.startsAt)}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-medium text-muted-foreground">
                  {statusTitle}
                </p>
                <p className="truncate text-foreground">{statusDetail}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
