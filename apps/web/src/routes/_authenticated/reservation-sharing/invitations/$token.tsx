import { createFileRoute } from "@tanstack/react-router";
import { ReservationShareInvitationRoute } from "@/features/guild/reservations/sharing/reservation-share-invitation-route";

export const Route = createFileRoute(
  "/_authenticated/reservation-sharing/invitations/$token",
)({
  staticData: {
    navigation: ({ t }) => ({
      label: t("reservations.sharing.standaloneTitle"),
    }),
  },
  component: ReservationShareInvitationRoute,
});
