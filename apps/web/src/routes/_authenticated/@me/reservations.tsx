import { createFileRoute } from "@tanstack/react-router";
import { MyReservations } from "@/features/user/reservations/my-reservations";
import { parseMyReservationsSearch } from "@/features/user/reservations/my-reservations-search";

export const Route = createFileRoute("/_authenticated/@me/reservations")({
  validateSearch: parseMyReservationsSearch,
  component: MyReservations,
});
