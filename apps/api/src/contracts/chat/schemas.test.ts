import { expect, it } from "bun:test";
import { Schema } from "effect";
import { SendChatMessageRequest } from "./schemas.js";
it("preserves source world in new NPC reports while accepting historical reports without it", () => {
  const message = {
    message: "",
    type: "NPC",
    characterData: {
      nick: "Hero",
      id: 1,
      acc: 2,
      lvl: 100,
      prof: "w",
      icon: "hero.gif",
    },
    npc: {
      id: 3,
      name: "NPC",
      location: "Map",
      lvl: 100,
      prof: "w",
      wt: 80,
      icon: "npc.gif",
      type: 2,
    },
  };
  const decode = Schema.decodeUnknownSync(SendChatMessageRequest);
  expect(decode(message).npc?.world).toBeUndefined();
  expect(
    decode({ ...message, npc: { ...message.npc, world: "Tempest" } }).npc
      ?.world,
  ).toBe("Tempest");
});
