import { describe, expect, it, vi } from "vitest";
import { ReadyRoomPublisher } from "src/messaging/ready-room/ready-room-publisher";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

const aggregate: ReadyRoomAggregate = {
  schemaVersion: 3,
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
  participants: {
    participant: {
      participantId: "participant",
      discordId: "participant",
      character: {
        accountId: "account-participant",
        characterId: "character-participant",
        icon: "participant.gif",
        lvl: 190,
        nick: "Participant",
        prof: "m",
      },
      partyPresence: "OUTSIDE",
      createdAt: "2026-07-13T10:01:00.000Z",
      updatedAt: "2026-07-13T10:02:00.000Z",
    },
  },
};

function createPublisher() {
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
  return {
    amqpConnection,
    logger,
    publisher: new ReadyRoomPublisher(amqpConnection as never, logger as never),
  };
}

describe("ReadyRoomPublisher", () => {
  it("publishes private v3 updates for every deduplicated recipient", async () => {
    const { amqpConnection, publisher } = createPublisher();

    await publisher.publish(aggregate, [
      "organizer",
      "participant",
      "participant",
    ]);

    expect(amqpConnection.publish).toHaveBeenCalledTimes(2);
    expect(amqpConnection.publish).toHaveBeenNthCalledWith(
      1,
      "default",
      "users.party-ready-room.updated",
      expect.objectContaining({
        recipientDiscordId: "organizer",
        eligibleGuildIds: ["guild-1", "guild-2"],
        update: expect.objectContaining({
          schemaVersion: 3,
          type: "UPSERT",
          projection: expect.objectContaining({ viewer: "ORGANIZER" }),
        }),
      }),
    );
    expect(amqpConnection.publish).toHaveBeenNthCalledWith(
      2,
      "default",
      "users.party-ready-room.updated",
      expect.objectContaining({
        recipientDiscordId: "participant",
        update: expect.objectContaining({
          type: "UPSERT",
          projection: expect.objectContaining({
            viewer: "PARTICIPANT",
            participants: {
              participant: expect.objectContaining({
                discordId: "participant",
              }),
            },
          }),
        }),
      }),
    );
  });

  it("publishes REMOVE for a terminal tombstone", async () => {
    const { amqpConnection, publisher } = createPublisher();

    await publisher.publish(
      { ...aggregate, status: "CANCELLED", revision: 4 },
      ["organizer"],
    );

    expect(amqpConnection.publish).toHaveBeenCalledWith(
      "default",
      "users.party-ready-room.updated",
      expect.objectContaining({
        update: {
          schemaVersion: 3,
          type: "REMOVE",
          notificationId: "room-1",
          revision: 4,
        },
      }),
    );
  });

  it("logs delivery failures without rejecting a committed transition", async () => {
    const { amqpConnection, logger, publisher } = createPublisher();
    amqpConnection.publish.mockRejectedValue(new Error("broker unavailable"));

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
