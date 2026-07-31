import type { FC, KeyboardEvent, ReactNode } from "react";
import { format } from "date-fns";
import { ChevronRight, Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@lootlog/ui/lib/utils";
import { Card } from "@lootlog/ui/components/card";
import { NpcSearchTile } from "@/components/tiles";
import type { MemberReferenceResponseDtoOutput as GuildMember } from "@lootlog/api-client/models/main/member-reference-response-dto-output";
import type { ReservationResponseDto } from "@lootlog/api-client/models/main/reservation-response-dto";

export interface ReservationCardProps {
  name: string;
  title: string;
  images?: string[];
  reservations: ReservationResponseDto[];
  members?: GuildMember[];
  onClick: () => void;
  viewMode?: "list" | "grid";
}

const getCurrentOccupant = (
  reservations: ReservationResponseDto[],
): ReservationResponseDto | null => {
  const now = new Date();
  return (
    reservations.find(
      (r) => new Date(r.fromDate) <= now && new Date(r.toDate) >= now,
    ) ?? null
  );
};

const getNextReservation = (
  reservations: ReservationResponseDto[],
): ReservationResponseDto | null => {
  const now = new Date();
  const futureReservations = reservations
    .filter((r) => new Date(r.fromDate) > now)
    .sort(
      (a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime(),
    );
  return futureReservations[0] ?? null;
};

const getActiveReservationsCount = (
  reservations: ReservationResponseDto[],
): number => {
  const now = new Date();
  return reservations.filter((r) => new Date(r.toDate) >= now).length;
};

const formatReservationTime = (reservation: ReservationResponseDto): string => {
  const from = new Date(reservation.fromDate);
  const to = new Date(reservation.toDate);
  return `${format(from, "dd.MM HH:mm")} - ${format(to, "HH:mm")}`;
};

export const ReservationCard: FC<ReservationCardProps> = ({
  title,
  name,
  images,
  reservations,
  members = [],
  onClick,
  viewMode = "grid",
}) => {
  const { t } = useTranslation();
  const currentOccupant = getCurrentOccupant(reservations);
  const nextReservation = getNextReservation(reservations);
  const isOccupied = currentOccupant !== null;
  const activeReservationsCount = getActiveReservationsCount(reservations);
  const statusReservation = currentOccupant ?? nextReservation;
  const hasImages = Boolean(images?.length);

  const getMemberName = (discordId: string): string => {
    const member = members.find((m) => m.userId === discordId);
    return member?.name ?? discordId;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onClick();
  };

  const imageTiles = hasImages ? (
    <div className="flex min-h-10 items-center gap-2 overflow-hidden [&>*]:shrink-0">
      {images?.slice(0, 4).map((icon, index) => (
        <NpcSearchTile
          key={`${icon}-${index}`}
          icon={icon}
          name={title}
          className="cursor-inherit"
        />
      ))}
    </div>
  ) : null;

  let statusPanelClassName = "border-border/80 bg-muted/30";
  let statusIconClassName = "text-muted-foreground";
  let statusLabelClassName = "text-muted-foreground";
  let statusLabel = t("reservations.card.none");
  let statusDetail: ReactNode = (
    <span className="text-xs text-muted-foreground">
      {t("reservations.card.noneDescription")}
    </span>
  );

  if (statusReservation) {
    statusIconClassName = "text-primary";
    statusLabel = t("reservations.card.next");
    statusDetail = (
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-semibold text-foreground">
          {getMemberName(statusReservation.createdBy)}
        </span>
        <span className="shrink-0 text-muted-foreground">·</span>
        <span className="shrink-0 text-muted-foreground">
          {formatReservationTime(statusReservation)}
        </span>
      </div>
    );

    if (isOccupied) {
      statusPanelClassName = "border-destructive/20 bg-destructive/[0.06]";
      statusIconClassName = "text-destructive";
      statusLabelClassName = "text-destructive";
      statusLabel = t("reservations.card.occupied");
    }
  }

  const reservationStatus = (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-xs",
        statusPanelClassName,
      )}
    >
      <Clock3 className={cn("size-4 shrink-0", statusIconClassName)} />
      <div className="min-w-0">
        <p className={cn("text-[11px] font-medium", statusLabelClassName)}>
          {statusLabel}
        </p>
        {statusDetail}
      </div>
    </div>
  );

  const activeReservationsBadge = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        activeReservationsCount > 0
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground",
      )}
    >
      {t("reservations.card.activeCount", {
        count: activeReservationsCount,
      })}
    </span>
  );

  const cardInteractionClassName =
    "cursor-pointer border-border bg-card text-left outline-none transition-[background-color,border-color] hover:border-primary/40 hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  if (viewMode === "list") {
    return (
      <Card
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={t("reservations.card.open", { name })}
        className={cn(
          "group relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 p-3 sm:grid-cols-[12rem_9.5rem_minmax(0,1fr)_13rem_auto]",
          cardInteractionClassName,
          isOccupied &&
            "border-destructive/30 bg-destructive/[0.035] hover:border-destructive/45 hover:bg-destructive/[0.055]",
        )}
      >
        <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold sm:w-full sm:flex-none">
            {title}
          </h3>
          {activeReservationsBadge}
        </div>

        {imageTiles && (
          <div className="col-span-2 col-start-1 row-start-2 overflow-hidden sm:col-span-1 sm:col-start-2 sm:row-start-1">
            {imageTiles}
          </div>
        )}

        <div className="col-span-2 col-start-1 row-start-3 min-w-0 sm:col-span-1 sm:col-start-4 sm:row-start-1">
          {reservationStatus}
        </div>

        <ChevronRight className="col-start-2 row-start-1 size-4 text-muted-foreground transition-colors group-hover:text-foreground sm:col-start-5" />
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={t("reservations.card.open", { name })}
      className={cn(
        "group relative flex h-full min-h-40 flex-col gap-3 overflow-hidden p-3.5",
        cardInteractionClassName,
        isOccupied &&
          "border-destructive/30 bg-destructive/[0.035] hover:border-destructive/45 hover:bg-destructive/[0.055]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold">{title}</h3>
          {activeReservationsBadge}
        </div>
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>

      {imageTiles}

      <div className="mt-auto">{reservationStatus}</div>
    </Card>
  );
};
