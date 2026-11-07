import { expect, it } from "bun:test";
import { getNpcRoutingTier } from "./npc-routing.js";

it("routes a Hero Tracker chat report to the heroes tier, not to every member", () => {
  // The chat NPC of a tracker: Margonem gives its template no weight,
  // profession or type, so only the name tells it apart from a plain NPC.
  expect(
    getNpcRoutingTier({
      name: "Doświadczony Tropiciel Herosów",
      wt: 0,
      type: 0,
      icon: "npc/tropiciel.gif",
    }),
  ).toBe("heroes");
});
