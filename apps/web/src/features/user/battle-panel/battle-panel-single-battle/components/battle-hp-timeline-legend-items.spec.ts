import { describe, expect, it } from "vitest";
import { BATTLE_HEX_COLORS } from "@/components/battle/utils/battle-color-palette";
import { buildBattleHpTimelineLegendItems } from "./battle-hp-timeline-legend-items";
import {
  DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
  type BattleHpTimelineLayerConfig,
  type BattleHpTimelineLayerKey,
} from "./battle-hp-timeline-layers";
import type { LegendaryBonusMarkerDefinition } from "./battle-hp-timeline-legendary-markers";

const createLayerConfig = (
  enabledKeys: BattleHpTimelineLayerKey[],
): BattleHpTimelineLayerConfig => {
  const config = {
    ...DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
    legendary: false,
  };

  for (const key of enabledKeys) {
    config[key] = true;
  }

  return config;
};

const legendaryItems: LegendaryBonusMarkerDefinition[] = [
  {
    type: "curse",
    labelKey: "battlePanel.single.chart.legendary.curse",
    color: BATTLE_HEX_COLORS.legendary.curse,
  },
];

describe("battle HP timeline legend items", () => {
  it("includes only enabled event layers", () => {
    const legend = buildBattleHpTimelineLegendItems({
      config: createLayerConfig(["stun", "freeze"]),
      layerCounts: {
        stun: 2,
        freeze: 1,
        counter: 4,
      },
      legendaryItems,
    });

    expect(legend.eventItems.map((item) => item.key)).toEqual([
      "stun",
      "freeze",
    ]);
    expect(legend.eventItems.map((item) => item.count)).toEqual([2, 1]);
  });

  it("keeps enabled event layers with zero count", () => {
    const legend = buildBattleHpTimelineLegendItems({
      config: createLayerConfig(["activeHealing"]),
      layerCounts: {},
      legendaryItems: [],
    });

    expect(legend.eventItems).toHaveLength(1);
    expect(legend.eventItems[0]).toMatchObject({
      key: "activeHealing",
      count: 0,
    });
  });

  it("shows legendary items only when the legendary layer is enabled", () => {
    const hiddenLegend = buildBattleHpTimelineLegendItems({
      config: createLayerConfig(["stun"]),
      layerCounts: {},
      legendaryItems,
    });
    const visibleLegend = buildBattleHpTimelineLegendItems({
      config: createLayerConfig(["legendary"]),
      layerCounts: {},
      legendaryItems,
    });

    expect(hiddenLegend.legendaryItems).toHaveLength(0);
    expect(visibleLegend.legendaryItems).toEqual(legendaryItems);
  });
});
