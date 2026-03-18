import {
  buildEventHeroKillDedupKey,
  buildEventHeroKillHeroDedupKey,
  buildEventHeroKillJobId,
} from "./event-hero-kill-job";

describe("event-hero-kill-job", () => {
  it("builds a timer update job id with sanitized parts", () => {
    const jobId = buildEventHeroKillJobId({
      guildId: "guild:1",
      world: "tempest",
      npcId: 123,
      windowKey: "1740000000000",
      isManualClose: false,
    });

    expect(jobId).toBe(
      "event-hero-kill-guild_1-tempest-123-1740000000000-timer",
    );
  });

  it("builds a dedup key without hero scope for timer updates", () => {
    const dedupKey = buildEventHeroKillDedupKey({
      guildId: "guild-1",
      world: "tempest",
      npcId: 123,
      windowKey: "1740000000000",
      isManualClose: false,
    });

    expect(dedupKey).toBe(
      "event:hero:kill:dedup:guild-1:tempest:123:1740000000000:timer",
    );
  });

  it("builds a hero-scoped dedup key for manual closes", () => {
    const dedupKey = buildEventHeroKillHeroDedupKey({
      guildId: "guild-1",
      world: "tempest",
      npcId: 123,
      heroId: "hero-7",
      windowKey: "1740000000000",
      isManualClose: true,
    });

    expect(dedupKey).toBe(
      "event:hero:kill:dedup:guild-1:tempest:123:hero-7:1740000000000:manual",
    );
  });
});
