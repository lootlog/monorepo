import { createFileRoute } from "@tanstack/react-router";
import { ReservationsSchedule } from "@/features/guild/reservations/schedule/reservations-schedule";
import { ReservationDetailSkeleton } from "@/features/guild/reservations/reservation-detail-skeleton";
import { upperFirst } from "es-toolkit";

export const Route = createFileRoute(
  "/_authenticated/$guildId/reservations/$reservationId",
)({
  staticData: {
    navigation: ({ match, currentEntityLabel }) => ({
      label:
        currentEntityLabel ?? upperFirst(match.params?.reservationId ?? ""),
    }),
  },
  component: ReservationsSchedule,
  pendingComponent: ReservationDetailSkeleton,
});
