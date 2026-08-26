import { useParams } from "@tanstack/react-router";
import { ReservationShareInvitation } from "./reservation-share-invitation";

export function ReservationShareInvitationRoute() {
  const { token } = useParams({
    from: "/_authenticated/reservation-sharing/invitations/$token",
  });
  return <ReservationShareInvitation token={token} />;
}
