import { expect, it } from "bun:test";
import { getNpcRoutingTier } from "./npc-routing.js";

it("routes a Hero Tracker chat report to the heroes tier, not to every member", () => {
  expect(
    getNpcRoutingTier({
      name: "Doświadczony Tropiciel Herosów",
      wt: 0,
      type: 0,
      icon: "npc/tropiciel.gif",
    }),
  ).toBe("heroes");
});
