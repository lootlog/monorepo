import { useBattleHpTimelineSettingsStore } from "./battle-hp-timeline-settings.store";

export const useBattleHpTimelineLayers = () => {
  const config = useBattleHpTimelineSettingsStore((state) => state.layers);
  const setLayerVisibility = useBattleHpTimelineSettingsStore(
    (state) => state.setLayerVisibility,
  );
  const resetLayers = useBattleHpTimelineSettingsStore(
    (state) => state.resetLayers,
  );

  return {
    config,
    setLayerVisibility,
    resetLayers,
  };
};
