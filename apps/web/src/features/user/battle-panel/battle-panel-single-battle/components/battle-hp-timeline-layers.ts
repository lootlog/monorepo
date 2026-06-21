import { BATTLE_HEX_COLORS } from "@/components/battle/utils/battle-color-palette";

export type BattleHpTimelineLayerKey =
  | "legendary"
  | "stun"
  | "freeze"
  | "counter"
  | "evade"
  | "parry"
  | "arrowBlock"
  | "pierceBlock"
  | "activeHealing"
  | "combo";

export type BattleHpTimelineLayerConfig = Record<
  BattleHpTimelineLayerKey,
  boolean
>;

export type BattleHpTimelineLayerDefinition = {
  key: BattleHpTimelineLayerKey;
  labelKey: string;
  color: string;
};

export const BATTLE_HP_TIMELINE_LAYER_DEFINITIONS = [
  {
    key: "legendary",
    labelKey: "battlePanel.single.chart.legendary.title",
    color: BATTLE_HEX_COLORS.legendary.unknown,
  },
  {
    key: "stun",
    labelKey: "battlePanel.single.flags.stun",
    color: BATTLE_HEX_COLORS.timeline.stun,
  },
  {
    key: "freeze",
    labelKey: "battlePanel.single.flags.freeze",
    color: BATTLE_HEX_COLORS.timeline.freeze,
  },
  {
    key: "counter",
    labelKey: "battlePanel.single.flags.counter",
    color: BATTLE_HEX_COLORS.timeline.counter,
  },
  {
    key: "evade",
    labelKey: "battlePanel.single.flags.evade",
    color: BATTLE_HEX_COLORS.timeline.evade,
  },
  {
    key: "parry",
    labelKey: "battlePanel.single.flags.parry",
    color: BATTLE_HEX_COLORS.timeline.parry,
  },
  {
    key: "arrowBlock",
    labelKey: "battlePanel.single.flags.arrowBlock",
    color: BATTLE_HEX_COLORS.timeline.arrowBlock,
  },
  {
    key: "pierceBlock",
    labelKey: "battlePanel.single.flags.pierceBlock",
    color: BATTLE_HEX_COLORS.timeline.pierceBlock,
  },
  {
    key: "activeHealing",
    labelKey: "battlePanel.single.flags.activeHealing",
    color: BATTLE_HEX_COLORS.timeline.activeHealing,
  },
  {
    key: "combo",
    labelKey: "battlePanel.single.flags.combo",
    color: BATTLE_HEX_COLORS.timeline.combo,
  },
] satisfies BattleHpTimelineLayerDefinition[];

export const BATTLE_HP_TIMELINE_EVENT_LAYER_DEFINITIONS =
  BATTLE_HP_TIMELINE_LAYER_DEFINITIONS.filter(
    (definition) => definition.key !== "legendary",
  );

export const DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG =
  BATTLE_HP_TIMELINE_LAYER_DEFINITIONS.reduce<BattleHpTimelineLayerConfig>(
    (config, definition) => ({
      ...config,
      [definition.key]: definition.key === "legendary",
    }),
    {} as BattleHpTimelineLayerConfig,
  );

export const BATTLE_HP_TIMELINE_LAYER_DEFINITION_BY_KEY =
  BATTLE_HP_TIMELINE_LAYER_DEFINITIONS.reduce<
    Record<BattleHpTimelineLayerKey, BattleHpTimelineLayerDefinition>
  >(
    (definitions, definition) => ({
      ...definitions,
      [definition.key]: definition,
    }),
    {} as Record<BattleHpTimelineLayerKey, BattleHpTimelineLayerDefinition>,
  );

export const normalizeBattleHpTimelineLayerConfig = (
  config: Partial<Record<string, boolean>> | null | undefined,
): BattleHpTimelineLayerConfig => {
  const normalizedConfig = {
    ...DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
  };

  for (const definition of BATTLE_HP_TIMELINE_LAYER_DEFINITIONS) {
    const defaultVisibility =
      DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG[definition.key];

    normalizedConfig[definition.key] =
      config?.[definition.key] ?? defaultVisibility;
  }

  return normalizedConfig;
};
