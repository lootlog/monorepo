import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { MapPlayersSnapshot } from "./map-players-snapshot.js";

const player = {
  accountId: 123,
  characterId: 456,
  name: "Observer",
  prof: null,
  icon: null,
};

describe("map players snapshot contract", () => {
  it("preserves nullable player metadata", () => {
    expect(Schema.decodeUnknownSync(MapPlayersSnapshot)([player])).toEqual([
      player,
    ]);
  });

  it("rejects empty or malformed captures", () => {
    for (const invalid of [
      [],
      [{ ...player, accountId: 0 }],
      [{ ...player, characterId: 1.5 }],
      [{ ...player, name: "" }],
      [{ ...player, prof: "w" }],
      [{ ...player, icon: 123 }],
    ]) {
      expect(() =>
        Schema.decodeUnknownSync(MapPlayersSnapshot)(invalid),
      ).toThrow();
    }
  });
});
