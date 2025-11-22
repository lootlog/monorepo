import { createFileRoute } from "@tanstack/react-router";
import { ReservationsSchedule } from "@/features/reservations/reservations-schedule";

export const Route = createFileRoute(
  "/_authenticated/$guildId/reservations/$reservationId",
)({
  component: ReservationsSchedule,
});
