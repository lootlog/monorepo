import { describe, expect, it } from "bun:test";
import { newManualTimerNpcId } from "./npc-identity.js";

describe("manual timer NPC ids", () => {
  it("allocates manual timer ids outside the Margonem runtime range", () => {
    const id = newManualTimerNpcId();

    expect(id).toBeGreaterThanOrEqual(1_000_000_000);
    expect(id).toBeLessThan(2_147_483_647);
  });
});
