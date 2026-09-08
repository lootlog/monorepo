import { describe, expect, it } from "bun:test";
import { buildGroupFightKey } from "./group-fight-key.js";
const fight = {
  world: "classic",
  map: { id: 12 },
  endedAt: "2026-09-06T10:05:00.123Z",
  participants: [
    { characterId: "1" },
    { characterId: "2" },
    { characterId: "3" },
    { characterId: "4" },
  ],
};
describe("group fight identity", () => {
  it("deduplicates independent observers of the same server ending", () => {
    expect(buildGroupFightKey(fight)).toBe(
      buildGroupFightKey({
        ...fight,
        participants: [...fight.participants].reverse(),
      }),
    );
  });
  it("does not merge a rematch with the same roster or another map or world", () => {
    for (const changed of [
      { ...fight, endedAt: "2026-09-06T10:05:00.124Z" },
      { ...fight, map: { id: 13 } },
      { ...fight, world: "tempest" },
    ])
      expect(buildGroupFightKey(fight)).not.toBe(buildGroupFightKey(changed));
  });
});
