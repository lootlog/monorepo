import { describe, expect, it } from "bun:test";
import { resolveLootAcceptance } from "./loot-acceptance.js";

const configs = new Map([
  [
    "legendary-only",
    { npcs: [{ npcType: "ELITE2", allowedRarities: ["LEGENDARY"] }] },
  ],
  ["heroic", { npcs: [{ npcType: "ELITE2", allowedRarities: ["HEROIC"] }] }],
  [
    "titans-only",
    { npcs: [{ npcType: "TITAN", allowedRarities: ["HEROIC"] }] },
  ],
  ["accepting", { npcs: [{ npcType: "ELITE2", allowedRarities: ["HEROIC"] }] }],
] as const);

const heroicElite2 = {
  npcType: "ELITE2",
  rarities: [undefined, "HEROIC"],
} as const;

describe("resolveLootAcceptance", () => {
  it("names the first reason each Organization rejects the loot for", () => {
    const acceptance = resolveLootAcceptance({
      organizationIds: [
        "not-catching",
        "missing-config",
        "legendary-only",
        "titans-only",
        "heroic",
        "accepting",
      ],
      catchingGuildIds: [
        "missing-config",
        "legendary-only",
        "titans-only",
        "heroic",
        "accepting",
      ],
      configs,
      members: new Map([["accepting", { id: 7 }]]),
      loot: heroicElite2,
    });

    expect(acceptance).toEqual({
      accepted: [{ organizationId: "accepting", member: { id: 7 } }],
      rejected: [
        {
          organizationId: "not-catching",
          reason: "NOT_ON_CHARACTER_WHITELIST",
        },
        { organizationId: "missing-config", reason: "MISSING_LOOTLOG_CONFIG" },
        {
          organizationId: "legendary-only",
          reason: "LOOT_NOT_ACCEPTED_BY_CONFIG",
        },
        {
          organizationId: "titans-only",
          reason: "LOOT_NOT_ACCEPTED_BY_CONFIG",
        },
        { organizationId: "heroic", reason: "MISSING_MEMBER" },
      ],
    });
  });

  // A game client holds only the character's catching scope; deciding on
  // configuration or membership it has not loaded would drop loot the API
  // accepts.
  it("never rejects on configuration, membership or loot the caller did not pass", () => {
    expect(
      resolveLootAcceptance({ catchingGuildIds: ["legendary-only"] }),
    ).toEqual({
      accepted: [{ organizationId: "legendary-only", member: undefined }],
      rejected: [],
    });
  });

  // The game client reads the catching scope from the character
  // configuration endpoint, which already drops Organizations where the
  // user cannot write loot. Both sides must then agree on whether the
  // whitelist rejects the loot everywhere.
  it.each<{ writable: string[]; stored: string[] }>([
    { writable: ["a", "b"], stored: [] },
    { writable: ["a", "b"], stored: ["gone"] },
    { writable: [], stored: ["a"] },
    { writable: ["a", "b"], stored: ["gone", "b"] },
    { writable: ["a"], stored: ["a"] },
  ])(
    "decides the whitelist like the API for writable $writable and stored $stored",
    ({ writable, stored }) => {
      const api = resolveLootAcceptance({
        organizationIds: writable,
        catchingGuildIds: stored,
      });

      const client = resolveLootAcceptance({
        catchingGuildIds: stored.filter((id) => writable.includes(id)),
      });

      expect(client.accepted.length > 0).toBe(api.accepted.length > 0);
    },
  );
});
