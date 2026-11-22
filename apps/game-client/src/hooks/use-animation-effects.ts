import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { useSettingsStore } from "@/store/settings.store";

export const useAnimationEffects = () => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  const prefersReducedMotion = usePrefersReducedMotion();

  return animationEffectsEnabled && !prefersReducedMotion;
};
