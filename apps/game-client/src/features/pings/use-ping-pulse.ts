import { useSettingsStore } from "@/store/settings.store";

/** Whether ping highlights may pulse: Lootlog animations on, OS motion allowed. */
export const usePingPulse = () => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  return (
    animationEffectsEnabled &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
};
