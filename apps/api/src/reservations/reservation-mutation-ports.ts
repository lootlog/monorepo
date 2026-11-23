import type { EventPublisher } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { ReservationChangedEventV2 } from "@lootlog/schema/reservation-events";
import { Effect } from "effect";
import type { ReservationCatalogAdapter } from "./reservation-catalog.adapter.js";
import type { Reservation } from "./reservation-ownership-query.js";
import type { ReservationReminderPorts } from "./reservation-reminders.data-layer.js";

export interface ReservationMutationPorts extends ReservationReminderPorts {
  readonly catalog: ReservationCatalogAdapter;
  readonly publish: EventPublisher["publish"];
}

export const publishReservationChange = (
  ports: ReservationMutationPorts,
  action: "created" | "updated" | "deleted",
  input: {
    readonly sourceGuildId: string;
    readonly audienceGuildIds: string[];
    readonly reservation: Reservation;
    readonly actorDiscordId: string;
  },
) => {
  const v2: ReservationChangedEventV2 = {
    version: 2,
    action,
    sourceGuildId: input.sourceGuildId,
    audienceGuildIds: input.audienceGuildIds,
    reservationId: input.reservation.id,
    spotId: input.reservation.spotId,
  };

  const legacy = {
    guildId: input.sourceGuildId,
    reservation: {
      id: input.reservation.id,
      reservationId: input.reservation.spotId,
      createdDate: input.reservation.createdAt.toISOString(),
      fromDate: input.reservation.startsAt.toISOString(),
      toDate: input.reservation.endsAt.toISOString(),
      createdBy: input.actorDiscordId,
    },
  };

  const publications = [
    ports.publish(RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2, v2),
    ...(action === "updated"
      ? []
      : [
          ports.publish(
            action === "created"
              ? RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE
              : RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE,
            legacy,
          ),
        ]),
  ];

  return Effect.all(publications, {
    concurrency: "unbounded",
    discard: true,
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("Reservation publication failed", cause),
    ),
  );
};
