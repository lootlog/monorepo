import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  ApplyToPartyReadyRoomRequest,
  PartyParticipantActionRequest,
} from "./schemas.js";

describe("party ready room contracts", () => {
  it("validates character identity and strips unknown nested fields when applying", () => {
    const decode = Schema.decodeUnknownSync(ApplyToPartyReadyRoomRequest);
    const character = {
      lvl: 100,
      nick: "Player",
      accountId: "account",
      characterId: "character",
      prof: "w",
      icon: "icon",
      clan: { id: 1, name: "Clan" },
    };
    expect(
      decode({
        world: "world",
        character: {
          ...character,
          unknown: true,
          clan: { ...character.clan, unknown: true },
        },
      }),
    ).toEqual({ world: "world", character });
    expect(() =>
      decode({ world: "world", character: { ...character, characterId: "" } }),
    ).toThrow();
    expect(() =>
      decode({ world: "world", character: { ...character, lvl: Infinity } }),
    ).toThrow();
  });

  it("requires an integer positive expected revision and a nonempty participant identifier", () => {
    const decode = Schema.decodeUnknownSync(PartyParticipantActionRequest);
    expect(
      decode({ expectedRevision: 1, participantId: "participant" }),
    ).toEqual({ expectedRevision: 1, participantId: "participant" });
    expect(() =>
      decode({ expectedRevision: 0, participantId: "participant" }),
    ).toThrow();
    expect(() =>
      decode({ expectedRevision: 1.5, participantId: "participant" }),
    ).toThrow();
    expect(() => decode({ expectedRevision: 1, participantId: "" })).toThrow();
  });
});
