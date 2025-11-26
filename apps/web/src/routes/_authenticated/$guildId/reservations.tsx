import { createFileRoute } from "@tanstack/react-router";
import { ReservationsLayout } from "@/features/reservations/reservations-layout/reservations-layout";

export const Route = createFileRoute("/_authenticated/$guildId/reservations")({
  component: ReservationsLayout,
});
