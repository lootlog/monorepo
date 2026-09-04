import { expect, test } from "bun:test";
import * as Schema from "effect/Schema";
import {
  UpdateUserGameAccountPreferencesRequest,
  UpdateUserPreferencesRequest,
} from "./schemas.js";

test("updating one notification or detector flag preserves an otherwise empty patch", () => {
  const decode = Schema.decodeUnknownSync(
    UpdateUserGameAccountPreferencesRequest,
  );
  const patch = {
    notifications: { HERO: { sound: false } },
    detector: { TITAN: { detect: false } },
  };
  expect(decode(patch)).toEqual(patch);
  expect(decode({})).toEqual({});
  expect(() =>
    decode({ notifications: { HERO: { autoHideTimeout: -1 } } }),
  ).toThrow();
});

test("NPC mute updates reject empty identifiers, fractional levels and unsafe IDs", () => {
  const decode = Schema.decodeUnknownSync(UpdateUserPreferencesRequest);
  const npc = {
    npcKey: "world:123",
    npcId: 123,
    name: "Hero",
    npcType: "HERO",
    lvl: 100,
    prof: null,
    icon: null,
  } as const;
  expect(decode({ mutes: { npcs: [npc] } })).toEqual({
    mutes: { npcs: [npc] },
  });
  for (const invalid of [
    { npcKey: "" },
    { name: "" },
    { lvl: 1.5 },
    { lvl: 0 },
    { npcId: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    expect(() =>
      decode({ mutes: { npcs: [{ ...npc, ...invalid }] } }),
    ).toThrow();
  }
  expect(decode({ mutes: { npcs: [] } })).toEqual({ mutes: { npcs: [] } });
});
