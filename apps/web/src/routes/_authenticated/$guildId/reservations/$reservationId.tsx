import { createFileRoute } from "@tanstack/react-router";
import { ReservationDetailSkeleton } from "@/features/reservations/reservation-detail-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/reservations/$reservationId",
)({
  pendingComponent: ReservationDetailSkeleton,
});
