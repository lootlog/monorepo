import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";

// Ambient magic circle watermark
export const AmbientMagicCircle = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <m.div
      key={String(prefersReducedMotion)}
      className="absolute pointer-events-none"
      style={{
        right: "-5%",
        bottom: "-5%",
        width: 300,
        height: 300,
        opacity: 0.03,
      }}
      animate={{ rotate: 360 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 60, repeat: Infinity, ease: "linear" }
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
          r="75"
          stroke="rgba(200, 30, 60, 1)"
          strokeWidth="0.5"
        />
        <circle
          cx="100"
          cy="100"
          r="60"
          stroke="rgba(200, 30, 60, 0.8)"
          strokeWidth="0.5"
        />
        <polygon
          points="100,15 118,60 170,60 128,90 142,140 100,110 58,140 72,90 30,60 82,60"
          stroke="rgba(200, 30, 60, 0.6)"
          strokeWidth="0.8"
          fill="none"
        />
        {/* Inner hexagon */}
        <polygon
          points="100,45 130,65 130,95 100,115 70,95 70,65"
          stroke="rgba(200, 30, 60, 0.4)"
          strokeWidth="0.5"
          fill="none"
        />
        <circle
          cx="100"
          cy="100"
          r="15"
          stroke="rgba(200, 30, 60, 0.6)"
          strokeWidth="0.5"
          fill="rgba(200, 30, 60, 0.1)"
        />
      </svg>
    </m.div>
  );
};
