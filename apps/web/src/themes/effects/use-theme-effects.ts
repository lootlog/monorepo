import { useSyncExternalStore } from "react";
import { themeEffectsStore } from "./theme-effects";

export const useThemeEffects = () => {
  const settings = useSyncExternalStore(
    themeEffectsStore.subscribe,
    themeEffectsStore.getSnapshot,
    themeEffectsStore.getSnapshot,
  );

  return { settings, setThemeEffects: themeEffectsStore.set };
};
