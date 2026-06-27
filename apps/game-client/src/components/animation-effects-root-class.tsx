import { useSettingsStore } from "@/store/settings.store";
import { useEffect } from "react";

const REDUCED_MOTION_CLASS_NAME = "ll-reduced-motion";

export const AnimationEffectsRootClass = () => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  useEffect(() => {
    const root = document.getElementById("lootlog-root");
    if (!root) return;

    root.classList.toggle(REDUCED_MOTION_CLASS_NAME, !animationEffectsEnabled);

    return () => {
      root.classList.remove(REDUCED_MOTION_CLASS_NAME);
    };
  }, [animationEffectsEnabled]);

  return null;
};
