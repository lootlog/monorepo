/* eslint-disable react-doctor/no-scale-from-zero -- These zero-scale elements are intentional point-origin decorative particles and SVG crystals, never text or controls; the rule explicitly permits point-origin illustration effects. */
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";

// Small magic circle SVG element
export const MagicCircle = ({
  x,
  y,
  size,
  isVisible,
  delay,
}: {
  x: string;
  y: string;
  size: number;
  isVisible: boolean;
  delay: number;
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <m.div
      key={String(prefersReducedMotion)}
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ opacity: 0, scale: 0, rotate: 0 }}
      animate={{
        opacity: isVisible ? 0.5 : 0,
        scale: isVisible ? 1 : 0,
        rotate: isVisible ? 360 : 0,
      }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              opacity: { duration: 0.5, delay: isVisible ? delay : 0 },
              scale: { duration: 0.5, delay: isVisible ? delay : 0 },
              rotate: { duration: 12, repeat: Infinity, ease: "linear" },
            }
      }
    >
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="rgba(200, 30, 60, 0.6)"
          strokeWidth="0.8"
        />
        <circle
          cx="12"
          cy="12"
          r="7"
          fill="none"
          stroke="rgba(200, 30, 60, 0.4)"
          strokeWidth="0.5"
        />
        <polygon
          points="12,3 14.5,9 21,9.5 16,14 17.5,21 12,17.5 6.5,21 8,14 3,9.5 9.5,9"
          fill="none"
          stroke="rgba(200, 30, 60, 0.35)"
          strokeWidth="0.5"
        />
        <circle cx="12" cy="12" r="2" fill="rgba(200, 30, 60, 0.3)" />
      </svg>
    </m.div>
  );
};
