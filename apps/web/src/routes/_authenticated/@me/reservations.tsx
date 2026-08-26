import { createFileRoute } from "@tanstack/react-router";
import { MyReservations } from "@/features/user/reservations/my-reservations";

export const Route = createFileRoute("/_authenticated/@me/reservations")({
  component: MyReservations,
});
