import { vi } from "#test/bun-test";
import { Logger } from "#src/shared/http/http-errors";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { ReservationEventsPublisher } from "./reservation-events.publisher.js";

describe("ReservationEventsPublisher", () => {
  it("publishes a PII-free v2 invalidation alongside the rollout event", async () => {
    const publish =
      vi.fn<
        (
          exchange: string,
          routingKey: string,
          payload: unknown,
        ) => Promise<void>
      >();
    publish.mockResolvedValue(undefined);
    const publisher = new ReservationEventsPublisher({ publish } as never);
    const reservation = {
      id: 42,
      guildId: "guild-source",
      spotId: "potepione-zamczysko",
      startsAt: new Date("2026-08-26T12:00:00.000Z"),
      endsAt: new Date("2026-08-26T13:00:00.000Z"),
      createdAt: new Date("2026-08-26T11:00:00.000Z"),
    };

    await publisher.created({
      sourceGuildId: "guild-source",
      audienceGuildIds: ["guild-source", "guild-partner"],
      reservation: reservation as never,
      actorDiscordId: "legacy-discord-id",
    });

    expect(publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2,
      {
        version: 2,
        action: "created",
        sourceGuildId: "guild-source",
        audienceGuildIds: ["guild-source", "guild-partner"],
        reservationId: 42,
        spotId: "potepione-zamczysko",
      },
    );
    const v2Payload = publish.mock.calls.find(
      ([, routingKey]) =>
        routingKey === RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2,
    )?.[2];
    expect(v2Payload).not.toHaveProperty("author");
    expect(v2Payload).not.toHaveProperty("comment");
    expect(publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_RESERVATIONS_CREATE,
      expect.objectContaining({ guildId: "guild-source" }),
    );
  });

  it("publishes an update only through the PII-free v2 contract", async () => {
    const publish = vi
      .fn<
        (
          exchange: string,
          routingKey: string,
          payload: unknown,
        ) => Promise<void>
      >()
      .mockResolvedValue(undefined);
    const publisher = new ReservationEventsPublisher({ publish } as never);
    const reservation = {
      id: 42,
      spotId: "potepione-zamczysko",
    };

    await publisher.updated({
      sourceGuildId: "guild-source",
      audienceGuildIds: ["guild-source", "guild-partner"],
      reservation: reservation as never,
      actorDiscordId: "legacy-discord-id",
    });

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2,
      {
        version: 2,
        action: "updated",
        sourceGuildId: "guild-source",
        audienceGuildIds: ["guild-source", "guild-partner"],
        reservationId: 42,
        spotId: "potepione-zamczysko",
      },
    );
  });

  it("does not report a durable reservation mutation as failed when publishing fails", async () => {
    const logError = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const publish = vi
      .fn<
        (
          exchange: string,
          routingKey: string,
          payload: unknown,
        ) => Promise<void>
      >()
      .mockRejectedValue(new Error("RabbitMQ unavailable"));
    const publisher = new ReservationEventsPublisher({ publish } as never);

    await expect(
      publisher.created({
        sourceGuildId: "guild-source",
        audienceGuildIds: ["guild-source"],
        reservation: {
          id: 42,
          guildId: "guild-source",
          spotId: "potepione-zamczysko",
          startsAt: new Date("2026-08-26T12:00:00.000Z"),
          endsAt: new Date("2026-08-26T13:00:00.000Z"),
          createdAt: new Date("2026-08-26T11:00:00.000Z"),
        } as never,
        actorDiscordId: "legacy-discord-id",
      }),
    ).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledTimes(2);
  });
});
