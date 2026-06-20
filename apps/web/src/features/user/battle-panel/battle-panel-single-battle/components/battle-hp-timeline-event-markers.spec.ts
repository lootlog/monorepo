import { describe, expect, it } from "vitest";
import {
  buildBattleHpTimelineEventMarkerGroups,
  getBattleHpTimelineEventLayerCounts,
  type BattleHpTimelineEventTurn,
  type BattleHpTimelineEventWarrior,
} from "./battle-hp-timeline-event-markers";
import {
  BATTLE_HP_TIMELINE_LAYER_DEFINITIONS,
  DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
  normalizeBattleHpTimelineLayerConfig,
  type BattleHpTimelineLayerConfig,
  type BattleHpTimelineLayerKey,
} from "./battle-hp-timeline-layers";

const warriors: BattleHpTimelineEventWarrior[] = [
  { originalId: "1", team: 1 },
  { originalId: "2", team: 2 },
];

const createTurn = (
  overrides: Partial<BattleHpTimelineEventTurn>,
): BattleHpTimelineEventTurn => ({
  turn: 12,
  attackerId: "1",
  defenderId: "2",
  teamHp: { "1": 80, "2": 42 },
  actions: [],
  flags: [],
  labels: [],
  ...overrides,
});

const createLayerConfig = (
  enabledKeys: BattleHpTimelineLayerKey[],
): BattleHpTimelineLayerConfig => {
  const config = {
    ...DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
  };

  for (const key of enabledKeys) {
    config[key] = true;
  }

  return config;
};

describe("battle HP timeline event markers", () => {
  it("does not expose the removed damage layer", () => {
    expect(
      BATTLE_HP_TIMELINE_LAYER_DEFINITIONS.map((definition) => definition.key),
    ).not.toContain("damage");
  });

  it("drops stale storage keys from normalized layer config", () => {
    const config = normalizeBattleHpTimelineLayerConfig({
      legendary: false,
      damage: true,
    });

    expect(config.legendary).toBe(false);
    expect(Object.keys(config)).not.toContain("damage");
  });

  it("hides additional event layers by default", () => {
    const groups = buildBattleHpTimelineEventMarkerGroups(
      [
        createTurn({
          flags: ["stun"],
          actions: [
            {
              actionType: "+stun",
              category: "control",
              actorId: "1",
              targetId: "2",
              param: "",
            },
          ],
        }),
      ],
      warriors,
      DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
    );

    expect(groups).toHaveLength(0);
  });

  it("shows only enabled flag layers", () => {
    const groups = buildBattleHpTimelineEventMarkerGroups(
      [
        createTurn({
          flags: ["stun", "freeze"],
          actions: [
            {
              actionType: "+stun",
              category: "control",
              actorId: "1",
              targetId: "2",
              param: "",
            },
            {
              actionType: "+freeze",
              category: "control",
              actorId: "1",
              targetId: "2",
              param: "",
            },
          ],
        }),
      ],
      warriors,
      createLayerConfig(["stun"]),
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      turn: 12,
      team: 2,
      y: 42,
    });
    expect(groups[0]?.markers.map((marker) => marker.key)).toEqual(["stun"]);
  });

  it("groups enabled stun and freeze markers on the same turn and team", () => {
    const groups = buildBattleHpTimelineEventMarkerGroups(
      [
        createTurn({
          flags: ["stun", "freeze"],
          actions: [
            {
              actionType: "+stun",
              category: "control",
              actorId: "1",
              targetId: "2",
              param: "",
            },
            {
              actionType: "freeze",
              category: "control",
              actorId: "1",
              targetId: "2",
              param: "",
            },
          ],
        }),
      ],
      warriors,
      createLayerConfig(["stun", "freeze"]),
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.markers.map((marker) => marker.key)).toEqual([
      "stun",
      "freeze",
    ]);
  });

  it("ignores old damage flags and actions after removing the damage layer", () => {
    const groups = buildBattleHpTimelineEventMarkerGroups(
      [
        createTurn({
          flags: ["damage"],
          actions: [
            {
              actionType: "-dmg",
              category: "damage",
              actorId: "1",
              targetId: "2",
              param: "500",
            },
          ],
        }),
      ],
      warriors,
      createLayerConfig(["stun", "freeze", "activeHealing", "combo"]),
    );

    expect(groups).toHaveLength(0);
  });

  it("does not show passive heal ticks as active healing", () => {
    const groups = buildBattleHpTimelineEventMarkerGroups(
      [
        createTurn({
          flags: ["healing"],
          actions: [
            {
              actionType: "heal",
              category: "healing",
              actorId: "1",
              targetId: "1",
              param: "1200",
            },
          ],
        }),
      ],
      warriors,
      createLayerConfig(["activeHealing"]),
    );

    expect(groups).toHaveLength(0);
  });

  it("places bandage active healing on the acting warrior team", () => {
    const groups = buildBattleHpTimelineEventMarkerGroups(
      [
        createTurn({
          flags: ["healing"],
          actions: [
            {
              actionType: "bandage",
              category: "healing",
              actorId: "1",
              targetId: null,
              param: "900",
            },
          ],
        }),
      ],
      warriors,
      createLayerConfig(["activeHealing"]),
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      team: 1,
      y: 80,
    });
    expect(groups[0]?.markers[0]).toMatchObject({
      key: "activeHealing",
      count: 1,
    });
  });

  it("places target active healing on the healed warrior team", () => {
    const groups = buildBattleHpTimelineEventMarkerGroups(
      [
        createTurn({
          flags: ["healing"],
          actions: [
            {
              actionType: "heal_target",
              category: "healing",
              actorId: "1",
              targetId: "2",
              param: "700",
            },
          ],
        }),
      ],
      warriors,
      createLayerConfig(["activeHealing"]),
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      team: 2,
      y: 42,
    });
  });

  it("counts available event layers independently from visibility config", () => {
    const counts = getBattleHpTimelineEventLayerCounts(
      [
        createTurn({
          flags: ["stun", "freeze"],
          actions: [
            {
              actionType: "+stun",
              category: "control",
              actorId: "1",
              targetId: "2",
              param: "",
            },
            {
              actionType: "freeze",
              category: "control",
              actorId: "1",
              targetId: "2",
              param: "",
            },
          ],
        }),
      ],
      warriors,
    );

    expect(counts.stun).toBe(1);
    expect(counts.freeze).toBe(1);
  });

  it("counts active healing independently from timeline flags", () => {
    const counts = getBattleHpTimelineEventLayerCounts(
      [
        createTurn({
          actions: [
            {
              actionType: "bandage",
              category: "healing",
              actorId: "1",
              targetId: null,
              param: "900",
            },
          ],
        }),
      ],
      warriors,
    );

    expect(counts.activeHealing).toBe(1);
  });
});
