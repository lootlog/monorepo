import { createFileRoute } from "@tanstack/react-router";
import { Reservations } from "@/features/reservations/reservations";
import { ReservationsPageSkeleton } from "@/features/reservations/reservations-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/reservations/")({
  component: Reservations,
  pendingComponent: ReservationsPageSkeleton,
});
