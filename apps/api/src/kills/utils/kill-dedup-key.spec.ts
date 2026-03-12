import {
  buildGuildKillDedupKey,
  buildUserKillDedupKey,
} from "./kill-dedup-key";

describe("kill-dedup-key", () => {
  it("builds a user-scoped dedup key", () => {
    const dedupKey = buildUserKillDedupKey("user-1", {
      world: "pandora",
      npcId: 12345,
    });

    expect(dedupKey).toBe("kill:dedup:user:user-1:pandora:12345");
  });

  it("builds a guild-scoped dedup key", () => {
    const dedupKey = buildGuildKillDedupKey("guild-1", {
      world: "tempest",
      npcId: -987,
    });

    expect(dedupKey).toBe("kill:dedup:guild:guild-1:tempest:-987");
  });
});
