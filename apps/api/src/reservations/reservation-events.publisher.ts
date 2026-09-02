import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";
import { Logger } from "#src/shared/http/http-errors";
import type { ReservationChangedEventV2 } from "@lootlog/schema/reservation-events";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import type { reservationTable } from "#src/database/drizzle/schema";

type Reservation = typeof reservationTable.$inferSelect;

type ReservationEventInput = {
  sourceGuildId: string;
  audienceGuildIds: string[];
  reservation: Reservation;
  actorDiscordId: string;
};

export class ReservationEventsPublisher {
  private readonly logger = new Logger(ReservationEventsPublisher.name);

  constructor(private readonly amqpConnection: AmqpPublisher) {}

  async created(input: ReservationEventInput): Promise<void> {
    await Promise.all([
      this.publishLegacy(RoutingKey.GUILDS_RESERVATIONS_CREATE, input),
      this.publishV2({
        version: 2,
        action: "created",
        sourceGuildId: input.sourceGuildId,
        audienceGuildIds: input.audienceGuildIds,
        reservationId: input.reservation.id,
        spotId: input.reservation.spotId,
      }),
    ]);
  }

  async deleted(input: ReservationEventInput): Promise<void> {
    await Promise.all([
      this.publishLegacy(RoutingKey.GUILDS_RESERVATIONS_DELETE, input),
      this.publishV2({
        version: 2,
        action: "deleted",
        sourceGuildId: input.sourceGuildId,
        audienceGuildIds: input.audienceGuildIds,
        reservationId: input.reservation.id,
        spotId: input.reservation.spotId,
      }),
    ]);
  }

  updated(input: ReservationEventInput): Promise<void> {
    return this.publishV2({
      version: 2,
      action: "updated",
      sourceGuildId: input.sourceGuildId,
      audienceGuildIds: input.audienceGuildIds,
      reservationId: input.reservation.id,
      spotId: input.reservation.spotId,
    });
  }

  sharingChanged(sourceGuildId: string, audienceGuildIds: string[]) {
    return this.publishV2({
      version: 2,
      action: "sharing-changed",
      sourceGuildId,
      audienceGuildIds,
      reservationId: null,
      spotId: null,
    });
  }

  private async publishLegacy(
    routingKey:
      | RoutingKey.GUILDS_RESERVATIONS_CREATE
      | RoutingKey.GUILDS_RESERVATIONS_DELETE,
    input: ReservationEventInput,
  ): Promise<void> {
    await this.publishSafely(routingKey, {
      guildId: input.sourceGuildId,
      reservation: {
        id: input.reservation.id,
        reservationId: input.reservation.spotId,
        createdDate: input.reservation.createdAt.toISOString(),
        fromDate: input.reservation.startsAt.toISOString(),
        toDate: input.reservation.endsAt.toISOString(),
        createdBy: input.actorDiscordId,
      },
    });
  }

  private async publishV2(event: ReservationChangedEventV2): Promise<void> {
    await this.publishSafely(RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2, event);
  }

  private async publishSafely(
    routingKey: RoutingKey,
    payload: unknown,
  ): Promise<void> {
    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        routingKey,
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish reservation event ${routingKey}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
