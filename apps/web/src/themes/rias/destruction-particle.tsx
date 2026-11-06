/* eslint-disable react-doctor/no-scale-from-zero -- These zero-scale elements are intentional point-origin decorative particles and SVG crystals, never text or controls; the rule explicitly permits point-origin illustration effects. */
import * as m from "framer-motion/m";

// Destruction energy particle
export const DestructionParticle = ({
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
}) => (
  <m.div
    className="absolute pointer-events-none"
    style={{
      left: x,
      top: y,
      transform: "translate(-50%, -50%)",
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: isVisible ? [0, 0.8, 0] : 0,
      scale: isVisible ? [0, 1.2, 0.6] : 0,
    }}
    transition={{
      duration: 1.5,
      delay: isVisible ? delay : 0,
      repeat: isVisible ? Infinity : 0,
      repeatDelay: 1 + delay,
      ease: "easeOut",
    }}
  >
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(200, 30, 60, 0.8) 0%, rgba(90, 20, 60, 0.4) 60%, transparent 100%)",
        boxShadow: "0 0 6px rgba(200, 30, 60, 0.5)",
      }}
    />
  </m.div>
);
