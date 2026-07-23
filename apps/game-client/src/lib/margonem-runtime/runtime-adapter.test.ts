import { describe, expect, it } from "vitest";
import { normalizeNpc } from "./runtime-adapter";

describe("runtime adapter normalization", () => {
  it("creates a frozen Lootlog NPC model without exposing the Margonem object", () => {
    const gameNpc = {
      icon: "npc.gif",
      id: 501,
      tpl: 700,
      x: 12,
      y: 8,
      nick: "Example",
      prof: "w",
      type: 2,
      wt: 85,
      lvl: 300,
      resp_rand: 0.2,
    };

    const npc = normalizeNpc(gameNpc);
    gameNpc.nick = "Changed by Margonem";

    expect(npc).toEqual({
      actions: undefined,
      groupId: undefined,
      icon: "npc.gif",
      id: 501,
      level: 300,
      name: "Example",
      profession: "w",
      respawnRandomness: 0.2,
      templateId: 700,
      type: 2,
      weight: 85,
      x: 12,
      y: 8,
    });
    expect(Object.isFrozen(npc)).toBe(true);
  });
});
