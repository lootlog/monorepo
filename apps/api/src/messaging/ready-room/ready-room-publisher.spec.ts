import { describe, expect, it, vi } from "vitest";
import { ReadyRoomPublisher } from "src/messaging/ready-room/ready-room-publisher";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

const aggregate: ReadyRoomAggregate = {
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  organizerCharacter: {
    accountId: "account-organizer",
    characterId: "character-organizer",
    icon: "organizer.gif",
    lvl: 200,
    nick: "Organizer",
    prof: "w",
  },
  guildIds: ["guild-1", "guild-2"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 3,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:02:00.000Z",
  expiresAt: "2026-07-13T10:30:00.000Z",
  readyCheck: null,
  participants: {
    participant: {
      discordId: "participant",
      character: {
        accountId: "account-participant",
        characterId: "character-participant",
        icon: "participant.gif",
        lvl: 190,
        nick: "Participant",
        prof: "m",
      },
      application: "ACCEPTED",
      readiness: "NOT_REQUESTED",
      invitation: {
        status: "NOT_MARKED",
        source: null,
        commandId: null,
        batchId: null,
        reservationExpiresAt: null,
        updatedAt: "2026-07-13T10:02:00.000Z",
      },
      partyPresence: "OUTSIDE",
      createdAt: "2026-07-13T10:01:00.000Z",
      updatedAt: "2026-07-13T10:02:00.000Z",
    },
  },
};

describe("ReadyRoomPublisher", () => {
  it("publishes a private projection for every named recipient", async () => {
    const amqpConnection = {
      publish: vi
        .fn<
          (
            exchange: string,
            routingKey: string,
            payload: unknown,
          ) => Promise<void>
        >()
        .mockResolvedValue(undefined),
    };
    const logger = { log: vi.fn<(entry: unknown) => void>() };
    const publisher = new ReadyRoomPublisher(
      amqpConnection as never,
      logger as never,
    );

    await publisher.publish(aggregate, ["organizer", "participant"]);

    expect(amqpConnection.publish).toHaveBeenCalledTimes(2);
    expect(amqpConnection.publish).toHaveBeenNthCalledWith(
      1,
      "default",
      "users.party-ready-room.updated",
      expect.objectContaining({
        recipientDiscordId: "organizer",
        eligibleGuildIds: ["guild-1", "guild-2"],
        projection: expect.objectContaining({ viewer: "ORGANIZER" }),
      }),
    );
    expect(amqpConnection.publish).toHaveBeenNthCalledWith(
      2,
      "default",
      "users.party-ready-room.updated",
      expect.objectContaining({
        recipientDiscordId: "participant",
        projection: expect.objectContaining({
          viewer: "PARTICIPANT",
          participant: expect.objectContaining({ discordId: "participant" }),
        }),
      }),
    );
  });

  it("logs delivery failures without rejecting a committed transition", async () => {
    const amqpConnection = {
      publish: vi
        .fn<
          (
            exchange: string,
            routingKey: string,
            payload: unknown,
          ) => Promise<void>
        >()
        .mockRejectedValue(new Error("broker unavailable")),
    };
    const logger = { log: vi.fn<(entry: unknown) => void>() };
    const publisher = new ReadyRoomPublisher(
      amqpConnection as never,
      logger as never,
    );

    await expect(
      publisher.publish(aggregate, ["organizer"]),
    ).resolves.toBeUndefined();
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "error",
        notificationId: "room-1",
        recipientDiscordId: "organizer",
      }),
    );
  });
});
