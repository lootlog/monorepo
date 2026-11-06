/* eslint-disable react-doctor/no-scale-from-zero -- These zero-scale elements are intentional point-origin decorative particles and SVG crystals, never text or controls; the rule explicitly permits point-origin illustration effects. */
import * as m from "framer-motion/m";

// Scattered ice crystal - can be placed anywhere
export const ScatteredCrystal = ({
  x,
  y,
  size,
  rotation,
  isVisible,
  delay,
}: {
  x: string;
  y: string;
  size: number;
  rotation: number;
  isVisible: boolean;
  delay: number;
}) => (
  <m.div
    className="absolute pointer-events-none"
    style={{
      left: x,
      top: y,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: isVisible ? 0.7 : 0,
      scale: isVisible ? 1 : 0,
    }}
    transition={{
      duration: 0.4,
      delay: isVisible ? delay : 0,
      ease: "easeOut",
    }}
  >
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path
        d="M8 0 L9 6 L15 6 L10 9 L12 16 L8 11 L4 16 L6 9 L1 6 L7 6 Z"
        fill="rgba(220, 240, 255, 0.6)"
        style={{
          filter: "drop-shadow(0 0 2px rgba(180, 220, 255, 0.9))",
        }}
      />
    </svg>
  </m.div>
);
