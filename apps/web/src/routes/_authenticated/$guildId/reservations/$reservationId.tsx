import { createFileRoute } from "@tanstack/react-router";
import { ReservationsSchedule } from "@/features/reservations/schedule/reservations-schedule";
import { ReservationDetailSkeleton } from "@/features/reservations/reservation-detail-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/reservations/$reservationId",
)({
  component: ReservationsSchedule,
  pendingComponent: ReservationDetailSkeleton,
});
