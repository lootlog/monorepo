import { expect, test } from "bun:test";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "../src/realtime/codec.ts";
import type { ServerEvent } from "../src/realtime/protocol.ts";

test("preserves private volunteer identity and character metadata", () => {
  const frame = {
    v: 1,
    type: "notification.volunteer",
    data: {
      notificationId: "notification",
      volunteer: {
        discordId: "volunteer",
        world: "tempest",
        nick: "Volunteer",
        lvl: 250,
        characterId: "character",
        accountId: "account",
        prof: "w",
        icon: "icon.gif",
        clan: { id: 1, name: "Clan" },
      },
    },
  } satisfies ServerEvent;
  expect(decodeRealtimeFrame(encodeRealtimeFrame(frame))).toEqual(frame);
});
