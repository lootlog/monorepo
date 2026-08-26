import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronRight, Clock3, Pin } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReservationSpotsResponseDtoItem } from "@lootlog/api-client/models/main/reservation-spots-response-dto-item";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { cn } from "@lootlog/ui/lib/utils";
import { NpcSearchTile } from "@/components/tiles";

type ReservationCardProps = {
  spot: ReservationSpotsResponseDtoItem;
  onOpen: () => void;
  onPinChange: (pinned: boolean) => void;
  pinPending?: boolean;
  viewMode?: "list" | "grid";
};

const formatDateTime = (value: string) =>
  format(new Date(value), "d MMM, HH:mm", { locale: pl });

export function ReservationCard({
  spot,
  onOpen,
  onPinChange,
  pinPending = false,
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

  return (
    <Card
      className={cn(
        "group relative gap-3 overflow-hidden border-border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/20",
        viewMode === "list" &&
          "sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(14rem,1fr)] sm:items-center",
        isOccupied && "border-destructive/30 bg-destructive/[0.035]",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("reservations.card.open", { name: spot.name })}
        className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      </div>

      {spot.images.length > 0 && viewMode === "grid" && (
        <div className="pointer-events-none relative z-10 flex min-h-10 items-center gap-2 overflow-hidden">
          {spot.images.slice(0, 4).map((image, index) => (
            <NpcSearchTile
              key={`${image}-${index}`}
              icon={image}
              name={spot.name}
              className="shrink-0 cursor-inherit"
            />
          ))}
        </div>
      )}

      <div
        className={cn(
          "pointer-events-none relative z-10 flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-xs",
          isOccupied
            ? "border-destructive/20 bg-destructive/[0.06]"
            : "border-border/80 bg-muted/30",
        )}
      >
        <Clock3
          className={cn(
            "size-4 shrink-0",
            isOccupied ? "text-destructive" : "text-primary",
          )}
        />
        <div className="min-w-0">
          <p
            className={cn(
              "font-medium",
              isOccupied ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {statusTitle}
          </p>
          <p className="truncate text-foreground">{statusDetail}</p>
          {spot.nextReservation && (
            <p className="mt-1 truncate border-t border-border/70 pt-1 text-foreground">
              <span className="font-medium text-muted-foreground">
                {t("reservations.card.next")}:
              </span>{" "}
              {spot.nextReservation.author.displayName} ·{" "}
              {formatDateTime(spot.nextReservation.startsAt)}
            </p>
          )}
        </div>
      </div>

      <Button
        type="button"
        size="icon"
        className="absolute right-2 top-10 z-20 size-8"
        variant={spot.isPinned ? "secondary" : "ghost"}
        disabled={pinPending}
        aria-label={
          spot.isPinned
            ? t("reservations.card.unpin", { name: spot.name })
            : t("reservations.card.pin", { name: spot.name })
        }
        aria-pressed={spot.isPinned}
        onClick={() => onPinChange(!spot.isPinned)}
      >
        <Pin className={cn(spot.isPinned && "fill-current")} />
      </Button>
    </Card>
  );
}
