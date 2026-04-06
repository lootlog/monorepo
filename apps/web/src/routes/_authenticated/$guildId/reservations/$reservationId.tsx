import { createFileRoute } from "@tanstack/react-router";
import { ReservationsSchedule } from "@/features/reservations/schedule/reservations-schedule";

export const Route = createFileRoute(
  "/_authenticated/$guildId/reservations/$reservationId",
)({
  component: ReservationsSchedule,
});
