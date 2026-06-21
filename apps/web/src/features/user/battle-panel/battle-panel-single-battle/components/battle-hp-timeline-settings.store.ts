import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
  normalizeBattleHpTimelineLayerConfig,
  type BattleHpTimelineLayerConfig,
  type BattleHpTimelineLayerKey,
} from "./battle-hp-timeline-layers";

export type BattleHpTimelineHeightMode = "default" | "expanded";

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

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isBattleHpTimelineHeightMode = (
  value: unknown,
): value is BattleHpTimelineHeightMode =>
  value === "default" || value === "expanded";

const parseStoredJson = (value: string | null) => {
  if (!value) {
    return;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return;
  }
};

const readLegacyLayerConfig = () => {
  if (typeof localStorage === "undefined") {
    return;
  }

  const storedLayers = parseStoredJson(
    localStorage.getItem(LEGACY_BATTLE_HP_TIMELINE_LAYERS_STORAGE_KEY),
  );

  if (!isObjectRecord(storedLayers)) {
    return;
  }

  return storedLayers as Partial<Record<string, boolean>>;
};

export const normalizeBattleHpTimelineSettingsState = (
  state: PartialBattleHpTimelineSettingsData | undefined,
  fallback: BattleHpTimelineSettingsData,
): BattleHpTimelineSettingsData => ({
  heightMode: isBattleHpTimelineHeightMode(state?.heightMode)
    ? state.heightMode
    : fallback.heightMode,
  isChartHidden:
    typeof state?.isChartHidden === "boolean"
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
            isObjectRecord(persistedState)
              ? (persistedState as PartialBattleHpTimelineSettingsData)
              : undefined,
            currentState,
          ),
        }),
      },
    ),
  );
