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
    color: "#f59e0b",
  },
  {
    key: "stun",
    labelKey: "battlePanel.single.flags.stun",
    color: "#a78bfa",
  },
  {
    key: "freeze",
    labelKey: "battlePanel.single.flags.freeze",
    color: "#38bdf8",
  },
  {
    key: "counter",
    labelKey: "battlePanel.single.flags.counter",
    color: "#60a5fa",
  },
  {
    key: "evade",
    labelKey: "battlePanel.single.flags.evade",
    color: "#cbd5e1",
  },
  {
    key: "parry",
    labelKey: "battlePanel.single.flags.parry",
    color: "#818cf8",
  },
  {
    key: "arrowBlock",
    labelKey: "battlePanel.single.flags.arrowBlock",
    color: "#22c55e",
  },
  {
    key: "pierceBlock",
    labelKey: "battlePanel.single.flags.pierceBlock",
    color: "#fb7185",
  },
  {
    key: "activeHealing",
    labelKey: "battlePanel.single.flags.activeHealing",
    color: "#4ade80",
  },
  {
    key: "combo",
    labelKey: "battlePanel.single.flags.combo",
    color: "#fbbf24",
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
