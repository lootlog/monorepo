import { createLazyFileRoute } from "@tanstack/react-router";
import { ReservationsLayout } from "@/features/reservations/reservations-layout/reservations-layout";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/reservations",
)({
  component: ReservationsLayout,
});
