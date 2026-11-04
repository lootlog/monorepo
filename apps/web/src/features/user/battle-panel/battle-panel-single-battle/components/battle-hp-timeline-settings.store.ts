import { Option, Schema } from "effect";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
  normalizeBattleHpTimelineLayerConfig,
  type BattleHpTimelineLayerConfig,
  type BattleHpTimelineLayerKey,
} from "./battle-hp-timeline-layers";
import {
  optionalOrUndefined,
  requiredWithFallback,
} from "@lootlog/schema/stored-value";

export type BattleHpTimelineHeightMode = "default" | "expanded";

/** Shared by the chart and its skeleton so the loading state has the reader's chosen height. */
export const BATTLE_HP_TIMELINE_PLOT_HEIGHT_CLASS_NAMES: Record<
  BattleHpTimelineHeightMode,
  string
> = {
  default: "h-36",
  expanded: "h-72",
};

type BattleHpTimelineSettingsData = {
  heightMode: BattleHpTimelineHeightMode;
  isChartHidden: boolean;
  layers: BattleHpTimelineLayerConfig;
};

type BattleHpTimelineSettingsState = BattleHpTimelineSettingsData & {
  resetLayers: () => void;
  setChartHidden: (isChartHidden: boolean) => void;
  setHeightMode: (heightMode: BattleHpTimelineHeightMode) => void;
  setLayerVisibility: (key: BattleHpTimelineLayerKey, visible: boolean) => void;
  toggleChartHidden: () => void;
  toggleHeightMode: () => void;
};

type PartialBattleHpTimelineSettingsData = Partial<{
  heightMode: unknown;
  isChartHidden: unknown;
  layers: Partial<Record<string, boolean>>;
}>;

export const BATTLE_HP_TIMELINE_SETTINGS_STORAGE_KEY =
  "lootlog-battle-hp-timeline-settings-v1";

export const LEGACY_BATTLE_HP_TIMELINE_LAYERS_STORAGE_KEY =
  "lootlog-battle-timeline-layers-v2";

const isBattleHpTimelineHeightMode = (
  value: unknown,
): value is BattleHpTimelineHeightMode =>
  value === "default" || value === "expanded";

const StoredLayers = Schema.Record(
  Schema.String,
  requiredWithFallback(Schema.UndefinedOr(Schema.Boolean), undefined),
);

const decodeStoredLayers = Schema.decodeUnknownOption(StoredLayers);

const decodeStoredSettings = Schema.decodeUnknownOption(
  Schema.Struct({
    heightMode: optionalOrUndefined(Schema.Literals(["default", "expanded"])),
    isChartHidden: optionalOrUndefined(Schema.Boolean),
    layers: optionalOrUndefined(StoredLayers),
  }),
);

const readLegacyLayerConfig = () => {
  if (typeof localStorage === "undefined") return;

  const value = localStorage.getItem(
    LEGACY_BATTLE_HP_TIMELINE_LAYERS_STORAGE_KEY,
  );

  if (!value) return;

  try {
    return Option.getOrUndefined(decodeStoredLayers(JSON.parse(value)));
  } catch {
    // Ignore malformed legacy preferences and use the defaults.
  }
};

export const normalizeBattleHpTimelineSettingsState = (
  state: PartialBattleHpTimelineSettingsData | undefined,
  fallback: BattleHpTimelineSettingsData,
): BattleHpTimelineSettingsData => ({
  heightMode: isBattleHpTimelineHeightMode(state?.heightMode)
    ? state.heightMode
    : fallback.heightMode,
  isChartHidden:
    state?.isChartHidden === true || state?.isChartHidden === false
      ? state.isChartHidden
      : fallback.isChartHidden,
  layers: normalizeBattleHpTimelineLayerConfig(
    state?.layers ?? fallback.layers,
  ),
});

const createDefaultBattleHpTimelineSettings =
  (): BattleHpTimelineSettingsData =>
    normalizeBattleHpTimelineSettingsState(
      {
        layers: readLegacyLayerConfig(),
      },
      {
        heightMode: "default",
        isChartHidden: false,
        layers: DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
      },
    );

export const useBattleHpTimelineSettingsStore =
  create<BattleHpTimelineSettingsState>()(
    persist(
      (set) => ({
        ...createDefaultBattleHpTimelineSettings(),

        resetLayers: () =>
          set({ layers: DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG }),
        setChartHidden: (isChartHidden) => set({ isChartHidden }),
        setHeightMode: (heightMode) => set({ heightMode }),
        setLayerVisibility: (key, visible) =>
          set((state) => ({
            layers: {
              ...normalizeBattleHpTimelineLayerConfig(state.layers),
              [key]: visible,
            },
          })),
        toggleChartHidden: () =>
          set((state) => ({ isChartHidden: !state.isChartHidden })),
        toggleHeightMode: () =>
          set((state) => ({
            heightMode:
              state.heightMode === "expanded" ? "default" : "expanded",
          })),
      }),
      {
        name: BATTLE_HP_TIMELINE_SETTINGS_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        version: 1,
        partialize: (state) => ({
          heightMode: state.heightMode,
          isChartHidden: state.isChartHidden,
          layers: state.layers,
        }),
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...normalizeBattleHpTimelineSettingsState(
            Option.getOrUndefined(decodeStoredSettings(persistedState)),
            currentState,
          ),
        }),
      },
    ),
  );
