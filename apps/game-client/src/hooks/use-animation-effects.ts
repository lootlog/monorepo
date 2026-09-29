import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { useSettingsStore } from "@/store/settings.store";

/**
 * Whether Lootlog may animate: its animation setting is on and the operating
 * system does not ask for reduced motion.
 */
export const useAnimationEffects = () => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  const prefersReducedMotion = usePrefersReducedMotion();

  return animationEffectsEnabled && !prefersReducedMotion;
};
