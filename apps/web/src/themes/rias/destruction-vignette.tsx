import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";

// Pulsating Power of Destruction vignette - breathing crimson edges
export const DestructionVignette = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <m.div
      key={String(prefersReducedMotion)}
      className="absolute inset-0 pointer-events-none"
      animate={{ opacity: [0.3, 0.55, 0.3] }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 6, repeat: Infinity, ease: "easeInOut" }
      }
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 50%, rgba(200, 30, 60, 0.06) 75%, rgba(120, 15, 35, 0.1) 90%, rgba(40, 5, 15, 0.14) 100%)",
      }}
    />
  );
};
