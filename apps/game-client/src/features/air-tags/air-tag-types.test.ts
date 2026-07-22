import {
  AIR_TAG_CLAN_ENEMY_RELATION,
  AIR_TAG_ENEMY_RELATION,
  getAirTagEffectiveRelation,
  isAirTagScopeSnapshot,
  isAirTagUpdateEvent,
  type AirTagTarget,
} from "@lootlog/types";

const target: AirTagTarget = {
  targetId: "42",
  nickname: "Enemy",
  relation: 1,
  x: 10,
  y: 20,
  observedAt: 1_000,
};

describe("AirTag shared contracts", () => {
  it("keeps fresh threat evidence stronger than a neutral observation", () => {
    expect(
      getAirTagEffectiveRelation(
        { ...target, enemyObservedAt: 4_000 },
        5_000,
        10_000,
      ),
    ).toBe(AIR_TAG_ENEMY_RELATION);
    expect(
      getAirTagEffectiveRelation(
        {
          ...target,
          enemyObservedAt: 4_500,
          clanEnemyObservedAt: 4_000,
        },
        5_000,
        10_000,
      ),
    ).toBe(AIR_TAG_CLAN_ENEMY_RELATION);
  });

  it("falls back to the latest relation after threat evidence expires", () => {
    expect(
      getAirTagEffectiveRelation(
        { ...target, clanEnemyObservedAt: 1_000 },
        11_000,
        10_000,
      ),
    ).toBe(1);
  });

  it("rejects malformed snapshots and updates at the socket boundary", () => {
    expect(
      isAirTagScopeSnapshot({
        guildId: "guild-1",
        world: "fobos",
        mapId: 12,
        epochId: "epoch-1",
        epochStartedAt: 1_000,
        revision: 1,
        targets: [target],
      }),
    ).toBe(true);
    expect(
      isAirTagUpdateEvent({
        guildId: "guild-1",
        world: "fobos",
        mapId: 12,
        epochId: "epoch-1",
        epochStartedAt: 1_000,
        revision: 2,
        target: { ...target, x: Number.NaN },
      }),
    ).toBe(false);
  });
});
