/* eslint-disable react-doctor/no-scale-from-zero -- These zero-scale elements are intentional point-origin decorative particles and SVG crystals, never text or controls; the rule explicitly permits point-origin illustration effects. */
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";

// Snowflake component
export const Snowflake = ({
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
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
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
              opacity: { duration: 0.3, delay: isVisible ? delay : 0 },
              scale: { duration: 0.3, delay: isVisible ? delay : 0 },
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
            }
      }
    >
      <svg width={size} height={size} viewBox="0 0 24 24">
        <g fill="none" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1">
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
          <line x1="12" y1="2" x2="10" y2="5" />
          <line x1="12" y1="2" x2="14" y2="5" />
          <line x1="12" y1="22" x2="10" y2="19" />
          <line x1="12" y1="22" x2="14" y2="19" />
          <line x1="2" y1="12" x2="5" y2="10" />
          <line x1="2" y1="12" x2="5" y2="14" />
          <line x1="22" y1="12" x2="19" y2="10" />
          <line x1="22" y1="12" x2="19" y2="14" />
        </g>
      </svg>
    </m.div>
  );
};
