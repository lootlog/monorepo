import { createFileRoute } from "@tanstack/react-router";
import { Reservations } from "@/features/reservations/reservations";

export const Route = createFileRoute("/_authenticated/$guildId/reservations/")({
  component: Reservations,
});
