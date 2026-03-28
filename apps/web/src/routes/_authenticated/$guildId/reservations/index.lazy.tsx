import { createLazyFileRoute } from "@tanstack/react-router";
import { Reservations } from "@/features/reservations/reservations";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/reservations/",
)({
  component: Reservations,
});
