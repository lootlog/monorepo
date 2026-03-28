import { createLazyFileRoute } from "@tanstack/react-router";
import { ReservationsSchedule } from "@/features/reservations/schedule/reservations-schedule";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/reservations/$reservationId",
)({
  component: ReservationsSchedule,
});
