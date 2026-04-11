import type { FC } from "react";
import { format } from "date-fns";
import { cn } from "@lootlog/ui/lib/utils";
import { Card } from "@lootlog/ui/components/card";
import { NpcSearchTile } from "@/components/tiles";
import type { Reservation } from "@/hooks/api/reservations/use-reservations";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";

export interface ReservationCardProps {
  name: string;
  title: string;
  size: string;
  images?: string[];
  reservations: Reservation[];
  members?: GuildMember[];
  onClick: () => void;
  viewMode?: "list" | "grid";
}

const getCurrentOccupant = (
  reservations: Reservation[],
): Reservation | null => {
  const now = new Date();
  return (
    reservations.find(
      (r) => new Date(r.fromDate) <= now && new Date(r.toDate) >= now,
    ) ?? null
  );
};

const getNextReservation = (
  reservations: Reservation[],
): Reservation | null => {
  const now = new Date();
  const futureReservations = reservations
    .filter((r) => new Date(r.fromDate) > now)
    .sort(
      (a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime(),
    );
  return futureReservations[0] ?? null;
};

const getActiveReservationsCount = (reservations: Reservation[]): number => {
  const now = new Date();
  return reservations.filter((r) => new Date(r.toDate) >= now).length;
};

const formatReservationTime = (reservation: Reservation): string => {
  const from = new Date(reservation.fromDate);
  const to = new Date(reservation.toDate);
  return `${format(from, "dd.MM HH:mm")} - ${format(to, "HH:mm")}`;
};

export const ReservationCard: FC<ReservationCardProps> = ({
  title,
  images,
  reservations,
  members = [],
  onClick,
  viewMode = "grid",
}) => {
  const currentOccupant = getCurrentOccupant(reservations);
  const nextReservation = getNextReservation(reservations);
  const isOccupied = currentOccupant !== null;

  const getMemberName = (discordId: string): string => {
    const member = members.find((m) => m.userId === discordId);
    return member?.name ?? discordId;
  };

  if (viewMode === "list") {
    return (
      <Card
        onClick={onClick}
        className={cn(
          "relative flex flex-row items-center gap-4 p-3 transition-all cursor-pointer w-full",
          "hover:bg-card/80 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01]",
          "bg-card/40 backdrop-blur-sm border-border",
          isOccupied
            ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
            : "border-border",
        )}
      >
        <div className="flex flex-col text-left min-w-0 flex-1">
          <h3 className="font-semibold text-sm truncate">{title}</h3>
          <p className="text-xs text-muted-foreground">
            Zapisów: {getActiveReservationsCount(reservations)}
          </p>
          {isOccupied && currentOccupant && (
            <p className="text-xs text-red-400 mt-1">
              Zajęte:{" "}
              <span className="font-semibold">
                {getMemberName(currentOccupant.createdBy)}
              </span>
              <span className="text-muted-foreground ml-1">
                ({formatReservationTime(currentOccupant)})
              </span>
            </p>
          )}
          {!isOccupied && nextReservation && (
            <p className="text-xs text-muted-foreground mt-1">
              Najbliższa rezerwacja:{" "}
              <span className="font-semibold text-foreground">
                {getMemberName(nextReservation.createdBy)}
              </span>
              <span className="ml-1">
                ({formatReservationTime(nextReservation)})
              </span>
            </p>
          )}
        </div>

        {images && images.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {images.slice(0, 4).map((icon, idx) => (
              <NpcSearchTile
                key={idx}
                icon={icon}
                name={title}
                className="scale-125"
              />
            ))}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative flex flex-col justify-between p-4 transition-all overflow-visible cursor-pointer h-full",
        "hover:bg-card/80 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01]",
        "bg-card/40 backdrop-blur-sm border-border",
        isOccupied
          ? "border-red-500/40 bg-red-500/5 hover:border-red-500/60 hover:bg-red-500/10"
          : "border-border hover:border-primary/50",
      )}
    >
      {images && images.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          {images.slice(0, 4).map((icon, idx) => (
            <NpcSearchTile
              key={idx}
              icon={icon}
              name={title}
              className="scale-125"
            />
          ))}
        </div>
      )}

      <div className="mt-auto text-left space-y-1">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">
            Aktualnie zapisów: {getActiveReservationsCount(reservations)}
          </p>
        </div>

        {isOccupied && currentOccupant && (
          <div className="text-xs text-red-400">
            Zajęte:{" "}
            <span className="font-semibold">
              {getMemberName(currentOccupant.createdBy)}
            </span>
            <span className="text-red-400/70 ml-1">
              ({formatReservationTime(currentOccupant)})
            </span>
          </div>
        )}

        {!isOccupied && nextReservation && (
          <div className="text-xs text-muted-foreground">
            Najbliższa rezerwacja:{" "}
            <span className="font-semibold text-foreground">
              {getMemberName(nextReservation.createdBy)}
            </span>
            <span className="ml-1">
              ({formatReservationTime(nextReservation)})
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
