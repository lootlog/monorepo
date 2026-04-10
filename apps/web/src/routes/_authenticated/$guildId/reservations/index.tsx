import { createFileRoute } from "@tanstack/react-router";
import { ReservationsPageSkeleton } from "@/features/reservations/reservations-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/reservations/")({
  pendingComponent: ReservationsPageSkeleton,
});
