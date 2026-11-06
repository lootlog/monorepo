import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";

// Ice sparkles that appear and fade randomly
const generateIceSparkles = () =>
  Array.from({ length: 20 }, (_, index) => ({
    id: index,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 10,
  }));

const iceSparkleConfigs = generateIceSparkles();

export const IceSparkles = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      {iceSparkleConfigs.map((sparkle) => (
        <m.div
          key={`${sparkle.id}-${prefersReducedMotion}`}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
            background: "rgba(255, 255, 255, 0.6)",
            boxShadow:
              "0 0 5px rgba(200, 230, 255, 0.6), 0 0 10px rgba(180, 220, 255, 0.3)",
          }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: sparkle.duration,
                  repeat: Infinity,
                  delay: sparkle.delay,
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </>
  );
};
