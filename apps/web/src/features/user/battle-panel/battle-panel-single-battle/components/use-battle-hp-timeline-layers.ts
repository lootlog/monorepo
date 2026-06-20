import { useLocalStorage } from "usehooks-ts";
import {
  DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG,
  normalizeBattleHpTimelineLayerConfig,
  type BattleHpTimelineLayerKey,
} from "./battle-hp-timeline-layers";

const STORAGE_KEY = "lootlog-battle-timeline-layers-v2";

export const useBattleHpTimelineLayers = () => {
  const [storedConfig, setStoredConfig] = useLocalStorage<
    Partial<Record<string, boolean>>
  >(STORAGE_KEY, DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG);
  const config = normalizeBattleHpTimelineLayerConfig(storedConfig);

  const setLayerVisibility = (
    key: BattleHpTimelineLayerKey,
    visible: boolean,
  ) => {
    setStoredConfig((currentConfig) => ({
      ...normalizeBattleHpTimelineLayerConfig(currentConfig),
      [key]: visible,
    }));
  };

  const resetLayers = () => {
    setStoredConfig(DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG);
  };

  return {
    config,
    setLayerVisibility,
    resetLayers,
  };
};
