import { describe, expect, it } from "vitest";
import {
  createReadyRoomClientUpdate,
  createReadyRoomProjection,
  getReadyRoomActiveRecipientDiscordIds,
} from "src/messaging/ready-room/ready-room-projection";
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
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 3,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:02:00.000Z",
  expiresAt: "2026-07-13T10:30:00.000Z",
  participants: {
    first: {
      participantId: "first",
      discordId: "shared",
      character: {
        accountId: "account-first",
        characterId: "character-first",
        icon: "first.gif",
        lvl: 180,
        nick: "First",
        prof: "m",
      },
      partyPresence: "OUTSIDE",
      createdAt: "2026-07-13T10:01:00.000Z",
      updatedAt: "2026-07-13T10:01:00.000Z",
    },
    second: {
      participantId: "second",
      discordId: "shared",
      character: {
        accountId: "account-second",
        characterId: "character-second",
        icon: "second.gif",
        lvl: 190,
        nick: "Second",
        prof: "p",
      },
      partyPresence: "IN_PARTY",
      createdAt: "2026-07-13T10:01:00.000Z",
      updatedAt: "2026-07-13T10:02:00.000Z",
    },
  },
};

describe("Ready Room projections", () => {
  it("shows all participants to the organizer and every owned character to a participant", () => {
    expect(createReadyRoomProjection(aggregate, "organizer")).toMatchObject({
      schemaVersion: 3,
      viewer: "ORGANIZER",
      participants: {
        first: { discordId: "shared" },
        second: { discordId: "shared" },
      },
      ownedParticipantIds: [],
    });
    expect(createReadyRoomProjection(aggregate, "shared")).toMatchObject({
      viewer: "PARTICIPANT",
      participants: {
        first: { participantId: "first" },
        second: { participantId: "second" },
      },
    });
    expect(createReadyRoomProjection(aggregate, "unrelated")).toBeNull();
  });

  it("deduplicates organizer and participant recipients", () => {
    expect(getReadyRoomActiveRecipientDiscordIds(aggregate)).toEqual([
      "organizer",
      "shared",
    ]);
  });

  it("turns absent or terminal views into monotonic REMOVE updates", () => {
    expect(createReadyRoomClientUpdate(aggregate, "unrelated")).toEqual({
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: "room-1",
      revision: 3,
    });
    expect(
      createReadyRoomClientUpdate(
        { ...aggregate, status: "CANCELLED", revision: 4 },
        "organizer",
      ),
    ).toEqual({
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: "room-1",
      revision: 4,
    });
  });
});
