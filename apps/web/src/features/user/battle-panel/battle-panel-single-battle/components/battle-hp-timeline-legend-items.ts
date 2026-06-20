import {
  BATTLE_HP_TIMELINE_EVENT_LAYER_DEFINITIONS,
  type BattleHpTimelineLayerConfig,
  type BattleHpTimelineLayerDefinition,
  type BattleHpTimelineLayerKey,
} from "./battle-hp-timeline-layers";
import type { LegendaryBonusMarkerDefinition } from "./battle-hp-timeline-legendary-markers";

export type BattleHpTimelineEventLegendItem =
  BattleHpTimelineLayerDefinition & {
    count: number;
  };

export type BattleHpTimelineLegendItems = {
  eventItems: BattleHpTimelineEventLegendItem[];
  legendaryItems: LegendaryBonusMarkerDefinition[];
};

export const buildBattleHpTimelineLegendItems = ({
  config,
  layerCounts,
  legendaryItems,
}: {
  config: BattleHpTimelineLayerConfig;
  layerCounts: Partial<Record<BattleHpTimelineLayerKey, number>>;
  legendaryItems: LegendaryBonusMarkerDefinition[];
}): BattleHpTimelineLegendItems => ({
  eventItems: BATTLE_HP_TIMELINE_EVENT_LAYER_DEFINITIONS.filter(
    (definition) => config[definition.key],
  ).map((definition) => ({
    ...definition,
    count: layerCounts[definition.key] ?? 0,
  })),
  legendaryItems: config.legendary ? legendaryItems : [],
});
