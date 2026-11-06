import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";

// Second ambient magic circle - top left, counter-rotating
export const AmbientMagicCircleTopLeft = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <m.div
      key={String(prefersReducedMotion)}
      className="absolute pointer-events-none"
      style={{
        left: "-8%",
        top: "-8%",
        width: 220,
        height: 220,
        opacity: 0.025,
      }}
      animate={{ rotate: -360 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 45, repeat: Infinity, ease: "linear" }
      }
    >
      <svg viewBox="0 0 200 200" fill="none">
        <circle
          cx="100"
          cy="100"
          r="90"
          stroke="rgba(200, 30, 60, 1)"
          strokeWidth="1"
        />
        <circle
          cx="100"
          cy="100"
          r="70"
          stroke="rgba(200, 30, 60, 0.8)"
          strokeWidth="0.5"
          strokeDasharray="8 4"
        />
        <polygon
          points="100,20 115,55 155,55 125,80 135,120 100,95 65,120 75,80 45,55 85,55"
          stroke="rgba(200, 30, 60, 0.5)"
          strokeWidth="0.6"
          fill="none"
        />
        <circle
          cx="100"
          cy="100"
          r="20"
          stroke="rgba(200, 30, 60, 0.5)"
          strokeWidth="0.5"
          fill="rgba(200, 30, 60, 0.05)"
        />
      </svg>
    </m.div>
  );
};
