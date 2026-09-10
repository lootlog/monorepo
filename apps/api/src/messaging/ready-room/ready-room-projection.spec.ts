import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { decodeDomainJson } from "#src/http-api/domain-json.schema";
import {
  PartyReadyRoomResponse,
  PartyReadyRoomsResponse,
  PartyReadyRoomUpdateResponse,
} from "#src/contracts/party-ready-room/schemas";
import {
  createReadyRoomClientUpdate,
  createReadyRoomProjection,
  getReadyRoomActiveRecipientDiscordIds,
} from "#src/messaging/ready-room/ready-room-projection";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";

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
  for (const viewer of ["organizer", "shared"]) {
    for (const optionalFields of [
      {},
      { description: "", minLvl: 1, maxLvl: 500 },
      {
        npc: {
          name: "NPC",
          location: "Map",
          lvl: 100,
          type: "HERO",
          icon: "npc.gif",
          prof: "w",
        },
      },
      { npc: { name: "NPC", location: "Map", lvl: 100, type: "HERO" } },
    ]) {
      it(`serializes HTTP snapshots and updates for ${viewer} with ${JSON.stringify(optionalFields)}`, async () => {
        const current = { ...aggregate, ...optionalFields };
        const projection = createReadyRoomProjection(current, viewer);

        const decoded = await Effect.runPromise(
          decodeDomainJson(PartyReadyRoomResponse, projection),
        );

        expect(decoded).toMatchObject(optionalFields);

        if (!("description" in optionalFields)) {
          expect(decoded).not.toHaveProperty("description");
          expect(decoded).not.toHaveProperty("minLvl");
          expect(decoded).not.toHaveProperty("maxLvl");
        }

        expect(
          await Effect.runPromise(
            decodeDomainJson(PartyReadyRoomsResponse, [projection]),
          ),
        ).toEqual([decoded]);
        expect(
          await Effect.runPromise(
            decodeDomainJson(
              PartyReadyRoomUpdateResponse,
              createReadyRoomClientUpdate(current, viewer),
            ),
          ),
        ).toEqual({ schemaVersion: 3, type: "UPSERT", projection: decoded });
      });
    }
  }

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

it("does not expose hidden target Organization IDs in private projections or updates", () => {
  const room = { ...aggregate, guildIds: ["guild-1", "hidden-guild"] };
  expect(
    createReadyRoomProjection(room, "shared", ["guild-1"])?.guildIds,
  ).toEqual(["guild-1"]);
  const update = createReadyRoomClientUpdate(room, "shared", ["guild-1"]);
  expect(update.type).toBe("UPSERT");

  if (update.type === "UPSERT")
    expect(update.projection.guildIds).toEqual(["guild-1"]);
  expect(createReadyRoomClientUpdate(room, "shared", []).type).toBe("REMOVE");
  expect(room.guildIds).toEqual(["guild-1", "hidden-guild"]);
});
