import { describe, expect, it } from "bun:test";
import {
  decodePartyReadyRoomProjection,
  decodePartyReadyRoomClientUpdate,
  type PartyReadyRoomParticipantProjection,
  type PartyReadyRoomOrganizerProjection,
} from "./party-ready-room.js";

const activeRoom = {
  schemaVersion: 3,
  notificationId: "room-1",
  organizerDiscordId: "organizer-1",
  organizerCharacter: {
    accountId: "account-1",
    characterId: "character-1",
    icon: "hero.gif",
    lvl: 100,
    nick: "Organizer",
    prof: "w",
  },
  guildIds: ["guild-1"],
  world: "world-1",
  status: "ACTIVE",
  revision: 1,
  createdAt: "2026-09-08T00:00:00.000Z",
  updatedAt: "2026-09-08T00:00:00.000Z",
  expiresAt: "2026-09-08T01:00:00.000Z",
  participants: {},
} satisfies Omit<PartyReadyRoomParticipantProjection, "viewer">;

describe("ready room projection decoding", () => {
  it("requires organizer ownership metadata before admitting a room", () => {
    expect(() =>
      decodePartyReadyRoomProjection({ ...activeRoom, viewer: "ORGANIZER" }),
    ).toThrow();

    const room = {
      ...activeRoom,
      viewer: "ORGANIZER",
      ownedParticipantIds: [],
    } satisfies PartyReadyRoomOrganizerProjection;

    expect(decodePartyReadyRoomProjection(room)).toEqual(room);
  });

  it("admits participant projections without organizer ownership metadata", () => {
    const room = {
      ...activeRoom,
      viewer: "PARTICIPANT",
    } satisfies PartyReadyRoomParticipantProjection;

    expect(decodePartyReadyRoomProjection(room)).toEqual(room);
  });

  it("rejects cancelled rooms and unsupported packet versions", () => {
    expect(() =>
      decodePartyReadyRoomProjection({
        ...activeRoom,
        viewer: "PARTICIPANT",
        status: "CANCELLED",
      }),
    ).toThrow();
    expect(() =>
      decodePartyReadyRoomProjection({
        ...activeRoom,
        viewer: "PARTICIPANT",
        schemaVersion: 2,
      }),
    ).toThrow();
  });
});

it("requires the payload corresponding to a ready room update discriminator", () => {
  expect(
    decodePartyReadyRoomClientUpdate({
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: "room-1",
      revision: 2,
    }),
  ).toEqual({
    schemaVersion: 3,
    type: "REMOVE",
    notificationId: "room-1",
    revision: 2,
  });
  expect(() =>
    decodePartyReadyRoomClientUpdate({
      schemaVersion: 3,
      type: "UPSERT",
      notificationId: "room-1",
      revision: 2,
    }),
  ).toThrow();
  expect(
    decodePartyReadyRoomClientUpdate({
      schemaVersion: 3,
      type: "UPSERT",
      projection: { ...activeRoom, viewer: "PARTICIPANT" },
    }).type,
  ).toBe("UPSERT");
});
