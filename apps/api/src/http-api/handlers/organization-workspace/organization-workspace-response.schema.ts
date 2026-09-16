import { Schema } from "effect";
import { JsonValue } from "@lootlog/schema/http-scalars";
import {
  MyReservationsResponse,
  ReservationResponse,
  ReservationSpotsResponse,
  ReservationWindowResponse,
} from "#src/contracts/reservations/schemas";
import {
  AcceptedReservationShareResponse,
  CreatedReservationShareInvitationResponse,
  ReservationShareInvitationPreviewResponse,
  ReservationSharesResponse,
} from "#src/contracts/reservation-sharing/schemas";
import { DomainDateTime } from "#src/shared/schema/response-codecs";
import { DomainJsonValue } from "../../domain-json.schema.js";

// Only contract-declared open fields need recursive domain JSON conversion.
const DomainJson = Schema.flip(DomainJsonValue).pipe(
  Schema.decodeTo(JsonValue),
);

export const ReservationBoundary = Schema.Struct({
  ...ReservationResponse.fields,
  startsAt: DomainDateTime,
  endsAt: DomainDateTime,
  createdAt: DomainDateTime,
  editingConstraints: Schema.flip(DomainJsonValue).pipe(
    Schema.decodeTo(ReservationResponse.fields.editingConstraints),
  ),
});

const OpenReservationBoundary = Schema.StructWithRest(ReservationBoundary, [
  Schema.Record(Schema.String, DomainJson),
]);

export const ReservationSpotsBoundary = Schema.Array(
  Schema.Struct({
    ...ReservationSpotsResponse.value.fields,
    availableUntil: Schema.NullOr(DomainDateTime),
    currentReservation: Schema.NullOr(OpenReservationBoundary),
    nextReservation: Schema.NullOr(OpenReservationBoundary),
  }),
);

export const ReservationWindowBoundary = Schema.Struct({
  ...ReservationWindowResponse.fields,
  items: Schema.Array(ReservationBoundary),
  window: Schema.Struct({
    ...ReservationWindowResponse.fields.window.fields,
    from: DomainDateTime,
    to: DomainDateTime,
  }),
});

export const MyReservationsBoundary = Schema.Struct({
  ...MyReservationsResponse.fields,
  items: Schema.Array(ReservationBoundary),
});

export const ReservationSharesBoundary = Schema.Struct({
  ...ReservationSharesResponse.fields,
  shares: Schema.Array(
    Schema.Struct({
      ...ReservationSharesResponse.fields.shares.value.fields,
      createdAt: DomainDateTime,
    }),
  ),
  pendingInvitations: Schema.Array(
    Schema.Struct({
      ...ReservationSharesResponse.fields.pendingInvitations.value.fields,
      createdAt: DomainDateTime,
      expiresAt: DomainDateTime,
    }),
  ),
});

export const CreatedReservationShareInvitationBoundary = Schema.Struct({
  ...CreatedReservationShareInvitationResponse.fields,
  createdAt: DomainDateTime,
  expiresAt: DomainDateTime,
});

export const ReservationShareInvitationPreviewBoundary = Schema.Struct({
  ...ReservationShareInvitationPreviewResponse.fields,
  expiresAt: DomainDateTime,
});

export const AcceptedReservationShareBoundary = Schema.Struct({
  ...AcceptedReservationShareResponse.fields,
  createdAt: DomainDateTime,
});
