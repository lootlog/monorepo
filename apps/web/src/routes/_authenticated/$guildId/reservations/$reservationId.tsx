import { ReservationsSchedule } from "@/features/reservations/schedule/reservations-schedule";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/$guildId/reservations/$reservationId",
)({
  component: ReservationsSchedule,
});
