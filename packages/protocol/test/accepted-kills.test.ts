import { expect, test } from "bun:test";
import { Schema } from "effect";
import { GuildKillsAcceptedV1 } from "../src/rabbit/events.js";
import {
  encodeRealtimeFrame,
  decodeRealtimeFrame,
} from "../src/realtime/codec.js";

test("accepted kill invalidation requires the source NPC visibility metadata", () => {
  const decode = Schema.decodeUnknownSync(GuildKillsAcceptedV1);
  const event = {
    version: 1,
    guildId: "guild",
    world: "world",
    npc: { type: "HERO", lvl: 100 },
  };
  expect(decode(event)).toEqual(event);
  expect(() => decode({ ...event, npc: { type: "HERO" } })).toThrow();
  expect(() =>
    decode({ ...event, npc: { type: "unknown", lvl: 100 } }),
  ).toThrow();
  const frame = {
    v: 1,
    type: "kills.changed",
    data: { guildId: "guild" },
  } as const;
  expect(decodeRealtimeFrame(encodeRealtimeFrame(frame))).toEqual(frame);
});
